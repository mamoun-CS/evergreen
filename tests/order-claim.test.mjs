import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

// Unit tests only. All database, SMTP, auth and rate-limit I/O is replaced
// before evaluation. This serialized transaction double is NOT PostgreSQL.
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const routePath = 'src/app/api/orders/[orderNumber]/claim-account/route.ts';
function harness() {
  let state = {
    users: [{ id: 'u1', email: 'buyer@example.test', role: 'CUSTOMER', isActive: true }, { id: 'u2', email: 'buyer@example.test', role: 'CUSTOMER', isActive: true }],
    orders: [{ id: 'o1', orderNumber: 'OLD-ORDER-1', email: 'Buyer@example.test', userId: null, paymentMethod: 'CASH_ON_DELIVERY', totalAmount: 20, inventoryReserved: false, paymentAccessToken: 'unchanged' }],
    tokens: [], audits: [], emailLogs: [],
  };
  let currentId = 'u1', sent = [], logs = [], delivery = true, blocked = '', rateKeys = [], forceLinkFailure = false, mutations = 0;
  const browserRequests = [];
  const browser = { location: { hash: '', assign() {} }, history: { replaceState() { browser.location.hash = ''; } } };
  let queue = Promise.resolve();
  function matches(row, where) {
    return Object.entries(where).every(([key, value]) => value && typeof value === 'object' && 'gt' in value ? row[key] > value.gt : row[key] === value);
  }
  const db = {
    user: { findUnique: async ({ where }) => state.users.find(u => u.id === where.id) ?? null },
    order: {
      findUnique: async ({ where }) => state.orders.find(o => o.orderNumber === where.orderNumber) ?? null,
      findMany: async ({ where }) => state.orders.filter(o => matches(o, where)),
      updateMany: async ({ where, data }) => {
        mutations++;
        if (forceLinkFailure) return { count: 0 };
        const rows = state.orders.filter(o => matches(o, where)); rows.forEach(o => Object.assign(o, data)); return { count: rows.length };
      },
    },
    orderClaimToken: {
      create: async ({ data }) => { const token = { id: `t${state.tokens.length}`, usedAt: null, revokedAt: null, ...data }; state.tokens.push(token); return token; },
      updateMany: async ({ where, data }) => { const rows = state.tokens.filter(t => matches(t, where)); rows.forEach(t => Object.assign(t, data)); return { count: rows.length }; },
    },
    adminAuditLog: { create: async ({ data }) => { state.audits.push(data); return data; } },
    emailLog: { create: async ({ data }) => { state.emailLogs.push(data); return data; } },
    $executeRaw: async () => 1,
    $transaction: callback => {
      const operation = queue.then(async () => {
        const before = structuredClone(state);
        try { return await callback(db); } catch (error) { state = before; throw error; }
      });
      queue = operation.catch(() => {}); return operation;
    },
  };
  const cache = new Map();
  function load(relative) {
    if (cache.has(relative)) return cache.get(relative).exports;
    const allowed = ['src/lib/order-claim.ts', routePath, 'src/app/account/orders/page.tsx', 'src/app/claim-order/page.tsx', 'src/components/account/ClaimOrderConfirmation.tsx', 'src/lib/email-service.ts'];
    if (!allowed.includes(relative) && !relative.startsWith('src/lib/email-templates/')) throw new Error(`Unisolated module: ${relative}`);
    const module = { exports: {} }; cache.set(relative, module);
    const source = ts.transpileModule(readFileSync(path.join(root, relative), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const isolatedRequire = name => {
      if (name === 'server-only') return {};
      if (name === 'node:crypto') return crypto;
      if (name === 'react/jsx-runtime') return require(name);
      if (name === 'react') return { useRef: value => ({ current: value }), useState: value => [value, () => {}], useEffect: effect => effect() };
      if (name === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === 'next/navigation') return { redirect: url => { throw new Error(`REDIRECT:${url}`); } };
      if (name === 'next/link') return { __esModule: true, default: 'a' };
      if (name === 'lucide-react') return { Package: 'span', ExternalLink: 'span' };
      if (name === '@/components/account/OrderClaimForm' || name === '@/components/account/ClaimOrderConfirmation') return { __esModule: true, default: 'form' };
      if (name === './prisma' || name === '@/lib/prisma') return { prisma: db };
      if (name === '@/lib/auth') return { getCurrentUser: async () => state.users.find(u => u.id === currentId && u.isActive) ?? null };
      if (name === '@/lib/auth-middleware') return { getClientIp: () => 'unit-ip' };
      if (name === '@/lib/rate-limit') return { rateLimitConfig: { orderClaim: { maximum: 5, windowMs: 3600000 }, orderClaimConfirm: { maximum: 20, windowMs: 900000 } },
        consumeRateLimit: async key => { rateKeys.push(key); return { allowed: !key.includes(blocked || 'NO-BLOCK'), retryAfter: 60 }; }, rateLimitResponseHeaders: () => ({ 'Retry-After': '60' }) };
      if (name === './email-service') return { sendOrderClaimEmail: async (...args) => { sent.push(args); return delivery; } };
      if (name === 'nodemailer') return { createTransport: () => ({ sendMail: async mail => { if (!delivery) throw new Error(`SMTP secret ${mail.html}`); sent.push(mail); } }) };
      let dependency = name.startsWith('@/') ? `src/${name.slice(2)}` : path.posix.join(path.posix.dirname(relative), name);
      if (!path.posix.extname(dependency)) dependency += dependency.endsWith('order-confirmation') || dependency.endsWith('admin-notification') ? '.tsx' : '.ts';
      return load(dependency);
    };
    vm.runInNewContext(source, { module, exports: module.exports, require: isolatedRequire, Buffer, URL, URLSearchParams, console: { error: (...args) => logs.push(args) },
      process: { env: { SMTP_HOST: 'mock', SMTP_FROM: 'mock@example.test', NEXT_PUBLIC_APP_URL: 'https://store.example.test', NODE_ENV: 'production' } }, setTimeout: callback => callback(),
      window: browser, fetch: async (...args) => { browserRequests.push(args); return Response.json({ error: 'Sign in' }, { status: 401 }); } }, { filename: relative });
    return module.exports;
  }
  const service = load('src/lib/order-claim.ts');
  async function issue() { await service.requestOrderClaim('OLD-ORDER-1', 'u1'); return sent.at(-1)?.[2]; }
  async function post(body = {}, headers = {}, orderNumber = 'OLD-ORDER-1') {
    const request = new Request('https://store.example.test/api/orders/OLD-ORDER-1/claim-account', { method: 'POST', headers: { origin: 'https://store.example.test', 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
    request.nextUrl = new URL(request.url);
    return load(routePath).POST(request, { params: { orderNumber } });
  }
  return { service, issue, post, load, state: () => state, sent: () => sent, logs: () => logs, rateKeys: () => rateKeys, mutations: () => mutations, browser, browserRequests,
    setUser: id => { currentId = id; }, failEmail: () => { delivery = false; }, block: key => { blocked = key; }, failLink: () => { forceLinkFailure = true; } };
}

test('request sends only to stored order email, hashes 32-byte token, binds purpose and 30-minute expiry without claiming', async () => {
  const h = harness(), token = await h.issue(), saved = h.state().tokens[0];
  assert.equal(Buffer.from(token, 'base64url').length, 32);
  assert.equal(saved.tokenHash, crypto.createHash('sha256').update(token).digest('hex'));
  assert.equal(saved.email, 'buyer@example.test'); assert.equal(saved.userId, 'u1'); assert.equal(saved.orderId, 'o1'); assert.equal(saved.purpose, 'ORDER_CLAIM');
  assert.ok(Math.abs(saved.expiresAt.getTime() - Date.now() - 1800000) < 2000);
  assert.equal(h.sent()[0][0], 'Buyer@example.test'); assert.equal(h.state().orders[0].userId, null);
  assert.ok(!JSON.stringify(h.state()).includes(token));
});

for (const method of ['CASH_ON_DELIVERY', 'LAHZA']) test(`${method}: historical valid claim changes ownership only; replay fails`, async () => {
  const h = harness(); h.state().orders[0].paymentMethod = method;
  const before = { ...h.state().orders[0] }, token = await h.issue();
  assert.equal(await h.service.confirmOrderClaim('OLD-ORDER-1', 'u1', token), true);
  assert.deepEqual(h.state().orders[0], { ...before, userId: 'u1' });
  assert.ok(h.state().tokens[0].usedAt); assert.equal(h.state().audits.length, 1);
  assert.equal(await h.service.confirmOrderClaim('OLD-ORDER-1', 'u1', token), false);
});

for (const scenario of ['wrong user', 'wrong order', 'wrong email', 'invalid token', 'expired', 'used', 'revoked', 'wrong purpose', 'inactive', 'staff', 'already owned']) test(`confirmation rejects ${scenario}`, async () => {
  const h = harness(); let token = await h.issue(), user = 'u1', order = 'OLD-ORDER-1';
  if (scenario === 'wrong user') user = 'u2';
  if (scenario === 'wrong order') order = 'OTHER';
  if (scenario === 'wrong email') h.state().users[0].email = 'other@example.test';
  if (scenario === 'invalid token') token = 'x'.repeat(43);
  if (scenario === 'expired') h.state().tokens[0].expiresAt = new Date(0);
  if (scenario === 'used') h.state().tokens[0].usedAt = new Date();
  if (scenario === 'revoked') h.state().tokens[0].revokedAt = new Date();
  if (scenario === 'wrong purpose') h.state().tokens[0].purpose = 'PASSWORD_RESET';
  if (scenario === 'inactive') h.state().users[0].isActive = false;
  if (scenario === 'staff') h.state().users[0].role = 'ADMIN';
  if (scenario === 'already owned') h.state().orders[0].userId = 'u2';
  assert.equal(await h.service.confirmOrderClaim(order, user, token), false); assert.equal(h.state().audits.length, 0);
});

test('simulated serialized concurrent claims succeed once (not a PostgreSQL isolation test)', async () => {
  const h = harness(), token = await h.issue();
  assert.deepEqual(await Promise.all([h.service.confirmOrderClaim('OLD-ORDER-1', 'u1', token), h.service.confirmOrderClaim('OLD-ORDER-1', 'u1', token)]), [true, false]);
});
test('failed conditional ownership write rolls token consumption back in transaction double', async () => {
  const h = harness(), token = await h.issue(); h.failLink();
  assert.equal(await h.service.confirmOrderClaim('OLD-ORDER-1', 'u1', token), false);
  assert.equal(h.state().tokens[0].usedAt, null);
});
test('successful claim revokes competing tokens', async () => {
  const h = harness(), token = await h.issue();
  h.state().tokens.push({ ...h.state().tokens[0], id: 'competitor', tokenHash: 'other', userId: 'u2' });
  await h.service.confirmOrderClaim('OLD-ORDER-1', 'u1', token);
  assert.ok(h.state().tokens[1].revokedAt);
});
test('token cannot claim a different existing order with the same email', async () => {
  const h = harness(), token = await h.issue();
  h.state().orders.push({ ...h.state().orders[0], id: 'o2', orderNumber: 'OLD-ORDER-2' });
  assert.equal(await h.service.confirmOrderClaim('OLD-ORDER-2', 'u1', token), false);
  assert.equal(h.state().orders[1].userId, null);
  assert.equal(h.state().tokens[0].usedAt, null);
});
test('resend revokes earlier token and email failure revokes its own token only', async () => {
  const h = harness(), first = await h.issue(), second = await h.issue();
  assert.notEqual(first, second); assert.ok(h.state().tokens[0].revokedAt);
  h.failEmail(); await h.issue(); assert.ok(h.state().tokens[2].revokedAt);
});
test('API keeps ineligible and email-failure request responses generic', async () => {
  const h = harness(), expected = await (await h.post()).json();
  const missing = await h.post({}, {}, 'MISSING'); assert.equal(missing.status, 202); assert.deepEqual(await missing.json(), expected);
  h.failEmail(); const failed = await h.post(); assert.equal(failed.status, 202); assert.deepEqual(await failed.json(), expected);
  h.state().users[0].email = 'wrong@example.test'; assert.deepEqual(await (await h.post()).json(), expected);
});
test('API confirms only with explicit token and sets safe headers', async () => {
  const h = harness(); const response = await h.post(); assert.equal(response.status, 202); assert.equal(h.state().orders[0].userId, null);
  assert.equal(response.headers.get('cache-control'), 'no-store'); assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  const confirmed = await h.post({ action: 'confirm', token: h.sent()[0][2] }); assert.equal(confirmed.status, 200);
});
for (const header of [{ origin: 'https://evil.test' }, { origin: '' }, { 'sec-fetch-site': 'cross-site' }, { 'content-type': 'text/plain' }]) test(`API rejects CSRF/content boundary ${JSON.stringify(header)}`, async () => {
  const h = harness(); assert.ok([400, 403].includes((await h.post({}, header)).status)); assert.equal(h.state().tokens.length, 0);
});
for (const role of [null, 'ADMIN', 'MANAGER', 'SUPER_ADMIN']) test(`API denies ${role ?? 'unauthenticated'}`, async () => {
  const h = harness(); if (role) h.state().users[0].role = role; else h.setUser('missing');
  assert.ok([401, 403].includes((await h.post()).status)); assert.equal(h.state().tokens.length, 0);
});
for (const scope of [':account:', ':ip:', ':order:', ':token:']) test(`API applies shared ${scope} limit`, async () => {
  const h = harness(); h.block(scope);
  assert.equal((await h.post({ action: 'confirm', token: 'x'.repeat(43) })).status, 429);
  assert.equal(h.state().tokens.length, 0); assert.ok(h.rateKeys().every(key => key.length <= 255));
});
for (const body of [{ recipient: 'evil@example.test' }, { action: 'delete' }, { action: 'confirm', token: 'bad' }, [], null, '{', 'x'.repeat(2049)]) test('API rejects malformed or extra input', async () => {
  const h = harness(); assert.equal((await h.post(body)).status, 400); assert.equal(h.state().orders[0].userId, null);
});
test('account order rendering performs no mutations and returns only owned orders', async () => {
  const h = harness(); await h.load('src/app/account/orders/page.tsx').default();
  assert.equal(h.state().orders[0].userId, null); assert.equal(h.state().tokens.length, 0);
  assert.equal(h.mutations(), 0);
});
test('confirmation component strips fragment, does not POST on mount, and submits only on explicit click', async () => {
  const h = harness(), token = 'x'.repeat(43);
  h.browser.location.hash = `#order=OLD-ORDER-1&token=${token}`;
  const tree = h.load('src/components/account/ClaimOrderConfirmation.tsx').default();
  assert.equal(h.browser.location.hash, ''); assert.equal(h.browserRequests.length, 0);
  const button = tree.props.children.find(child => child?.type === 'button');
  await button.props.onClick();
  assert.equal(h.browserRequests.length, 1);
  assert.equal(h.browserRequests[0][1].method, 'POST');
  assert.deepEqual(JSON.parse(h.browserRequests[0][1].body), { action: 'confirm', token });
});
test('API rejects malformed identifiers and confirmation without a token', async () => {
  const h = harness();
  assert.equal((await h.post({}, {}, '../other')).status, 400);
  assert.equal((await h.post({ action: 'confirm' })).status, 400);
  assert.equal(h.state().orders[0].userId, null);
});
test('claim GET page has no mutation and API exports no GET handler', () => {
  const h = harness(), page = h.load('src/app/claim-order/page.tsx'); page.default();
  assert.equal(page.metadata.referrer, 'no-referrer'); assert.equal(page.metadata.robots.index, false);
  assert.equal(h.load(routePath).GET, undefined); assert.equal(h.state().tokens.length, 0);
});
test('email template uses fragment and escaped safe URL; SMTP error logs contain no verification link', async () => {
  const h = harness(); const html = h.load('src/lib/email-templates/order-claim.ts').orderClaimEmail('OLD-ORDER-1', 'x'.repeat(43));
  assert.match(html, /claim-order#order=OLD-ORDER-1&amp;token=/); assert.ok(!html.includes('?token='));
  h.failEmail(); await h.load('src/lib/email-service.ts').sendOrderClaimEmail('buyer@example.test', 'OLD-ORDER-1', 'x'.repeat(43));
  assert.ok(!JSON.stringify(h.logs()).includes('claim-order')); assert.ok(!JSON.stringify(h.state().emailLogs).includes('claim-order'));
});
