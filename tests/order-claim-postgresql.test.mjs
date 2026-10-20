import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import net from 'node:net';
import { createRequire, registerHooks } from 'node:module';
import { register } from 'tsx/cjs/api';

// ---------------------------------------------------------------------------
// STEP 1: Activate the fail-closed test guard BEFORE importing any app module.
// This redirects process.env.DATABASE_URL to the isolated test database.
// ---------------------------------------------------------------------------
import {
  activateTestGuard,
  createTestPrismaClient,
  deactivateTestGuard,
  assertTestDatabaseTarget,
} from './postgresql-guard.mjs';

activateTestGuard();

// ---------------------------------------------------------------------------
// STEP 2: Only this Node test process maps Next's server-only marker to its
// empty server implementation. The application modules and their business
// logic remain real. Register the TypeScript loader after the guard, then use
// runtime imports: static ESM imports run before activateTestGuard().
// ---------------------------------------------------------------------------
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') {
      return { url: new URL('../node_modules/next/dist/compiled/server-only/empty.js', import.meta.url).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
register();
const require = createRequire(import.meta.url);
const { requestOrderClaim, confirmOrderClaim } = require('../src/lib/order-claim.ts');
const { consumeRateLimit } = require('../src/lib/rate-limit.ts');

let prisma;
let smtp;
const smtpNames = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'];
const originalSmtp = Object.fromEntries(smtpNames.map((name) => [name, process.env[name]]));

async function startTestSmtp() {
  smtp = net.createServer((socket) => {
    socket.setEncoding('utf8');
    socket.write('220 localhost ESMTP\r\n');
    let buffer = '', inData = false;
    socket.on('data', (chunk) => {
      buffer += chunk;
      let end;
      while ((end = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (inData) {
          if (line === '.') { inData = false; socket.write('250 accepted\r\n'); }
        } else if (/^(EHLO|HELO)/i.test(line)) socket.write('250 localhost\r\n');
        else if (/^DATA/i.test(line)) { inData = true; socket.write('354 continue\r\n'); }
        else if (/^QUIT/i.test(line)) socket.end('221 bye\r\n');
        else socket.write('250 OK\r\n');
      }
    });
  });
  await new Promise((resolve, reject) => { smtp.once('error', reject); smtp.listen(0, '127.0.0.1', resolve); });
  process.env.SMTP_HOST = '127.0.0.1';
  process.env.SMTP_PORT = String(smtp.address().port);
  process.env.SMTP_FROM = 'test@example.test';
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASSWORD;
}

/**
 * Create synthetic test user + unowned order (guest checkout pattern).
 * Returns { user, order, userId, orderNumber }.
 */
async function createFixture() {
  const suffix = crypto.randomUUID().slice(0, 8);
  const userId = `test-user-${suffix}`;
  const orderNumber = `ORD-TEST-${suffix.toUpperCase()}`;
  const email = `buyer-${suffix}@example.test`;

  const user = await prisma.user.create({
    data: {
      id: userId,
      email,
      name: 'Test Buyer',
      passwordHash: '$2b$12$test.hash.for.testing.only',
      role: 'CUSTOMER',
      isActive: true,
    },
  });

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: null,
      email,
      customerName: 'Test Customer',
      phone: '0000000000',
      shippingAddress: 'Test Address',
      shippingMethod: 'standard',
      shippingAmount: 0,
      discountAmount: 0,
      totalAmount: 100,
      currency: 'ILS',
      status: 'PENDING',
      paymentMethod: 'CASH_ON_DELIVERY',
      paymentAccessToken: `pay-token-${suffix}`,
      inventoryReserved: false,
      reservationExpiresAt: null,
    },
  });

  return { user, order, userId, orderNumber, email };
}

/**
 * Create an active claim token directly in the database (bypasses email).
 * Returns { rawToken, tokenId }.
 */
async function createActiveToken(orderId, userId, email, expiresInMs = 30 * 60 * 1000) {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const now = new Date();

  const token = await prisma.orderClaimToken.create({
    data: {
      tokenHash,
      orderId,
      userId,
      email: email.trim().toLowerCase(),
      purpose: 'ORDER_CLAIM',
      expiresAt: new Date(now.getTime() + expiresInMs),
      usedAt: null,
      revokedAt: null,
    },
  });

  return { rawToken, tokenId: token.id };
}

/**
 * Count active (non-consumed, non-revoked, non-expired) tokens for an order/user.
 */
async function countActiveTokens(orderId, userId) {
  const now = new Date();
  return prisma.orderClaimToken.count({
    where: {
      orderId,
      userId,
      usedAt: null,
      revokedAt: null,
      expiresAt: { gt: now },
    },
  });
}

/**
 * Clean up a fixture using actual Order.id relationships.
 * Respects foreign-key dependencies: tokens first, then orders, then users.
 * Only affects synthetic test fixtures created by createFixture().
 */
async function cleanupFixture(userId, orderId, orderNumber) {
  // Delete claim tokens first (FK dependency on Order)
  if (orderId) {
    await prisma.orderClaimToken.deleteMany({ where: { orderId } });
  }
  // Delete orders by exact orderNumber to avoid matching unrelated records
  if (orderNumber) {
    await prisma.order.deleteMany({ where: { orderNumber } });
  }
  // Delete user last (no other fixture depends on this user)
  if (userId) {
    await prisma.user.deleteMany({ where: { id: userId } });
  }
}

describe('Order Claim — PostgreSQL Integration Tests', () => {
  test('connects to isolated test database and verifies target', async (t) => {
    assertTestDatabaseTarget();
    prisma = await createTestPrismaClient();

    const result = await prisma.$queryRawUnsafe(
      'SELECT current_database() AS db_name, current_user AS db_user'
    );
    const dbName = result[0].db_name;
    assert.ok(dbName.startsWith('evergreen_test'), `Expected test database, got: ${dbName}`);
    assert.ok(prisma !== null);
    await startTestSmtp();
  });

  describe('Concurrent token issuance', () => {
    test('exactly one active token remains after 10 concurrent issuance requests', async (t) => {
      const { user, order, userId, orderNumber } = await createFixture();
      try {
        // Fire 10 concurrent issuance requests for the same order/user
        await Promise.all(
          Array.from({ length: 10 }, () => requestOrderClaim(orderNumber, userId))
        );

        // CRITICAL: Exactly one active token must remain in the database
        const activeCount = await countActiveTokens(order.id, userId);
        assert.equal(
          activeCount,
          1,
          `Expected exactly 1 active token, found ${activeCount}`
        );

        // All other tokens for this order/user must be revoked
        const revokedCount = await prisma.orderClaimToken.count({
          where: { orderId: order.id, userId, revokedAt: { not: null } },
        });
        assert.equal(revokedCount, 9, 'The nine previous tokens must be revoked');
      } finally {
        await cleanupFixture(userId, order.id, orderNumber);
      }
    });

    test('concurrent issuance for different orders creates independent tokens', async (t) => {
      const { user: user1, order: order1, userId: userId1, orderNumber: orderNumber1 } = await createFixture();
      const { user: user2, order: order2, userId: userId2, orderNumber: orderNumber2 } = await createFixture();
      try {
        await Promise.all([
          requestOrderClaim(orderNumber1, userId1),
          requestOrderClaim(orderNumber2, userId2),
        ]);

        const active1 = await countActiveTokens(order1.id, userId1);
        const active2 = await countActiveTokens(order2.id, userId2);
        assert.equal(active1, 1);
        assert.equal(active2, 1);
      } finally {
        await cleanupFixture(userId1, order1.id, orderNumber1);
        await cleanupFixture(userId2, order2.id, orderNumber2);
      }
    });
  });

  describe('Concurrent confirmation', () => {
    test('same token: exactly one confirmation succeeds, token consumed once', async (t) => {
      const { user, order, userId, orderNumber, email } = await createFixture();
      const { rawToken } = await createActiveToken(order.id, userId, email);
      try {
        const results = await Promise.all([
          confirmOrderClaim(orderNumber, userId, rawToken),
          confirmOrderClaim(orderNumber, userId, rawToken),
        ]);

        const succeeded = results.filter((r) => r === true);
        const failed = results.filter((r) => r === false);
        assert.equal(succeeded.length, 1, 'Exactly one confirmation should succeed');
        assert.equal(failed.length, 1, 'Exactly one confirmation should fail (replay)');

        // Token must be marked as used exactly once
        const token = await prisma.orderClaimToken.findUnique({
          where: { tokenHash: crypto.createHash('sha256').update(rawToken).digest('hex') },
        });
        assert.ok(token.usedAt !== null, 'Token should be consumed');
        const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
        assert.equal(updatedOrder.userId, userId);
      } finally {
        await cleanupFixture(userId, order.id, orderNumber);
      }
    });

    test('competing tokens: only one order ownership transfer succeeds', async (t) => {
      const { user: userA, order: orderA, userId: userIdA, orderNumber: orderNumberA, email: emailA } = await createFixture();
      const { user: userB, order: orderB, userId: userIdB, orderNumber: orderNumberB, email: emailB } = await createFixture();

      // Create two active tokens for DIFFERENT users but we'll try to claim the SAME order
      // To make them compete, both tokens must reference the same orderId
      const tokenA = await createActiveToken(orderA.id, userIdA, emailA);
      const tokenB = await createActiveToken(orderA.id, userIdB, emailB); // Same order, different user

      try {
        const results = await Promise.all([
          confirmOrderClaim(orderNumberA, userIdA, tokenA.rawToken),
          confirmOrderClaim(orderNumberA, userIdB, tokenB.rawToken),
        ]);

        const succeeded = results.filter((r) => r === true);
        assert.equal(
          succeeded.length,
          1,
          'Exactly one competing confirmation should succeed'
        );

        // The order should be owned by exactly one user
        const updatedOrder = await prisma.order.findUnique({ where: { id: orderA.id } });
        assert.ok(updatedOrder.userId === userIdA || updatedOrder.userId === userIdB);

        // The losing token should be revoked
        const tokens = await prisma.orderClaimToken.findMany({
          where: { orderId: orderA.id },
        });
        const revokedTokens = tokens.filter((t) => t.revokedAt !== null);
        assert.ok(revokedTokens.length >= 1, 'At least one competing token should be revoked');
      } finally {
        await cleanupFixture(userIdA, orderA.id, orderNumberA);
        await cleanupFixture(userIdB, orderB.id, orderNumberB);
      }
    });
  });

  describe('Transaction rollback', () => {
    test('an already owned order rejects the claim without consuming the token', async (t) => {
      const { user, order, userId, orderNumber, email } = await createFixture();
      const { rawToken } = await createActiveToken(order.id, userId, email);
      const other = await prisma.user.create({ data: { name: 'Other test buyer', email: `other-${crypto.randomUUID()}@example.test`, passwordHash: 'test-only', role: 'CUSTOMER' } });

      // Pre-claim the order with a different user (simulating ownership during confirmation)
      await prisma.order.update({
        where: { id: order.id },
        data: { userId: other.id },
      });

      try {
        const result = await confirmOrderClaim(orderNumber, userId, rawToken);
        assert.equal(result, false, 'Confirmation should fail when order is already owned');

        // Token must NOT be consumed
        const token = await prisma.orderClaimToken.findUnique({
          where: { tokenHash: crypto.createHash('sha256').update(rawToken).digest('hex') },
        });
        assert.equal(token.usedAt, null, 'Token should not be consumed on failed claim');
      } finally {
        // Restore order ownership for cleanup
        await prisma.order.update({ where: { id: order.id }, data: { userId: null } });
        await cleanupFixture(userId, order.id, orderNumber);
        await prisma.user.delete({ where: { id: other.id } });
      }
    });
  });

  describe('Token expiration and revocation', () => {
    test('expired token is rejected', async (t) => {
      const { user, order, userId, orderNumber, email } = await createFixture();
      const { rawToken } = await createActiveToken(order.id, userId, email, -1000); // Already expired
      try {
        const result = await confirmOrderClaim(orderNumber, userId, rawToken);
        assert.equal(result, false, 'Expired token should be rejected');
      } finally {
        await cleanupFixture(userId, order.id, orderNumber);
      }
    });

    test('used token is rejected', async (t) => {
      const { user, order, userId, orderNumber, email } = await createFixture();
      const { rawToken } = await createActiveToken(order.id, userId, email);

      // Consume the token first
      await confirmOrderClaim(orderNumber, userId, rawToken);

      // Try again — should fail
      const result = await confirmOrderClaim(orderNumber, userId, rawToken);
      assert.equal(result, false, 'Used token should be rejected');

      await cleanupFixture(userId, order.id, orderNumber);
    });

    test('revoked token is rejected', async (t) => {
      const { user, order, userId, orderNumber, email } = await createFixture();
      const { rawToken } = await createActiveToken(order.id, userId, email);

      // Revoke the token
      await prisma.orderClaimToken.updateMany({
        where: { orderId: order.id, userId },
        data: { revokedAt: new Date() },
      });

      const result = await confirmOrderClaim(orderNumber, userId, rawToken);
      assert.equal(result, false, 'Revoked token should be rejected');

      await cleanupFixture(userId, order.id, orderNumber);
    });

    test('wrong email binding is rejected', async (t) => {
      const { user, order, userId, orderNumber } = await createFixture();
      const { rawToken } = await createActiveToken(order.id, userId, 'wrong-email@example.test');
      try {
        const result = await confirmOrderClaim(orderNumber, userId, rawToken);
        assert.equal(result, false, 'Token with wrong email should be rejected');
      } finally {
        await cleanupFixture(userId, order.id, orderNumber);
      }
    });

    test('wrong user is rejected', async (t) => {
      const { user, order, userId, orderNumber, email } = await createFixture();
      const { rawToken } = await createActiveToken(order.id, userId, email);
      try {
        const result = await confirmOrderClaim(orderNumber, 'other-user-id', rawToken);
        assert.equal(result, false, 'Token for wrong user should be rejected');
      } finally {
        await cleanupFixture(userId, order.id, orderNumber);
      }
    });

    test('wrong order number is rejected', async (t) => {
      const { user, order, userId, email } = await createFixture();
      const { rawToken } = await createActiveToken(order.id, userId, email);
      try {
        const result = await confirmOrderClaim('ORD-NONEXISTENT', userId, rawToken);
        assert.equal(result, false, 'Token for wrong order should be rejected');
      } finally {
        await cleanupFixture(userId, order.id, order.orderNumber);
      }
    });

    test('SMTP delivery failure revokes issued token', async (t) => {
      const { user, order, userId, orderNumber, email } = await createFixture();
      const originalSmtpHost = process.env.SMTP_HOST;
      const originalSmtpPort = process.env.SMTP_PORT;
      try {
        // Point SMTP to a dead port to force delivery failure
        process.env.SMTP_HOST = '127.0.0.1';
        process.env.SMTP_PORT = '9';

        // requestOrderClaim will fail to deliver email and revoke the token
        await requestOrderClaim(orderNumber, userId);

        // No active token should remain because delivery failed
        const activeCount = await countActiveTokens(order.id, userId);
        assert.equal(activeCount, 0, 'Failed SMTP delivery should revoke the issued token');
      } finally {
        process.env.SMTP_HOST = originalSmtpHost;
        process.env.SMTP_PORT = originalSmtpPort;
        await cleanupFixture(userId, order.id, orderNumber);
      }
    });
  });

  describe('Advisory lock behavior', () => {
    test('concurrent confirmations serialize without deadlock', async (t) => {
      const { user, order, userId, orderNumber, email } = await createFixture();
      const { rawToken } = await createActiveToken(order.id, userId, email);
      try {
        // Fire 5 concurrent confirmations with the same token
        const results = await Promise.all(
          Array.from({ length: 5 }, () => confirmOrderClaim(orderNumber, userId, rawToken))
        );

        const succeeded = results.filter((r) => r === true);
        const failed = results.filter((r) => r === false);
        assert.equal(
          succeeded.length,
          1,
          'Exactly one confirmation should succeed under advisory lock serialization'
        );
        assert.equal(
          failed.length,
          4,
          'Remaining confirmations should fail due to token consumption'
        );

        // No deadlock should have occurred (all promises resolved)
        assert.equal(succeeded.length + failed.length, 5);
      } finally {
        await cleanupFixture(userId, order.id, orderNumber);
      }
    });
  });

  describe('Transaction timeout and failure handling', () => {
    test('invalid token format is rejected without database error', async (t) => {
      const { user, order, userId, orderNumber } = await createFixture();
      try {
        const result = await confirmOrderClaim(orderNumber, userId, 'invalid-token-format!!!');
        assert.equal(result, false, 'Invalid token should be rejected gracefully');
      } finally {
        await cleanupFixture(userId, order.id, orderNumber);
      }
    });

    test('nonexistent order returns false without error', async (t) => {
      const { user, userId, order } = await createFixture();
      try {
        const result = await confirmOrderClaim('ORD-NONEXISTENT-999', userId, crypto.randomBytes(32).toString('base64url'));
        assert.equal(result, false, 'Nonexistent order should return false');
      } finally {
        await cleanupFixture(userId, order.id, order.orderNumber);
      }
    });
  });

  describe('Database-backed rate limiting', () => {
    test('consumeRateLimit enforces limits via RateLimitBucket table', async (t) => {
      const key = `rate-limit-test:${crypto.randomUUID().slice(0, 8)}`;
      const maximum = 3;
      const windowMs = 60000;

      // First 3 requests should be allowed
      for (let i = 0; i < maximum; i++) {
        const result = await consumeRateLimit(key, maximum, windowMs);
        assert.equal(result.allowed, true, `Request ${i + 1} should be allowed`);
      }

      // 4th request should be rejected
      const result = await consumeRateLimit(key, maximum, windowMs);
      assert.equal(result.allowed, false, 'Request beyond limit should be rejected');
      assert.ok(result.retryAfter > 0, 'Retry-After should be positive');

      // Clean up the rate limit bucket
      await prisma.rateLimitBucket.deleteMany({ where: { key: { startsWith: 'rate-limit-test:' } } });
    });

    test('concurrent rate limit requests do not corrupt counter', async (t) => {
      const key = `rate-limit-concurrent:${crypto.randomUUID().slice(0, 8)}`;
      const maximum = 10;
      const windowMs = 60000;

      // Fire 20 concurrent requests
      const results = await Promise.all(
        Array.from({ length: 20 }, () => consumeRateLimit(key, maximum, windowMs))
      );

      const allowed = results.filter((r) => r.allowed).length;
      const rejected = results.filter((r) => !r.allowed).length;
      assert.equal(allowed, maximum, `Exactly ${maximum} requests should be allowed`);
      assert.equal(rejected, 20 - maximum, `Remaining ${20 - maximum} should be rejected`);

      // Clean up
      await prisma.rateLimitBucket.deleteMany({ where: { key: { startsWith: 'rate-limit-concurrent:' } } });
    });
  });

  describe('Order field preservation', () => {
    test('payment and inventory fields remain unchanged after successful claim', async (t) => {
      const { user, order, userId, orderNumber, email } = await createFixture();
      const { rawToken } = await createActiveToken(order.id, userId, email);
      try {
        const before = await prisma.order.findUnique({ where: { id: order.id } });

        const result = await confirmOrderClaim(orderNumber, userId, rawToken);
        assert.equal(result, true);

        const after = await prisma.order.findUnique({ where: { id: order.id } });

        // These fields must be preserved
        assert.equal(after.paymentMethod, before.paymentMethod);
        assert.equal(after.paymentAccessToken, before.paymentAccessToken);
        assert.equal(after.inventoryReserved, before.inventoryReserved);
        assert.deepEqual(after.reservationExpiresAt, before.reservationExpiresAt);

        // userId should have changed from null to the claiming user
        assert.equal(after.userId, userId);
        assert.equal(before.userId, null);
      } finally {
        await cleanupFixture(userId, order.id, orderNumber);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// TEARDOWN: Disconnect Prisma and deactivate guard after all tests
// ---------------------------------------------------------------------------
describe('Teardown', () => {
  test('disconnect test database and deactivate guard', async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (smtp) await new Promise((resolve) => smtp.close(resolve));
    for (const name of smtpNames) {
      if (originalSmtp[name] === undefined) delete process.env[name];
      else process.env[name] = originalSmtp[name];
    }
    await deactivateTestGuard();
  });
});
