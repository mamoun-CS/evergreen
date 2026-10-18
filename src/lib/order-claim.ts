import 'server-only';
import crypto from 'node:crypto';
import { prisma } from './prisma';
import { sendOrderClaimEmail } from './email-service';

const PURPOSE = 'ORDER_CLAIM';
const normalize = (email: string) => email.trim().toLowerCase();
export const claimTokenHash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
export const validClaimToken = (token: unknown): token is string => typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);
export const validClaimOrderNumber = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);

// All issuance/consumption paths take the same durable, transaction-scoped lock.
// Conditional writes also protect ownership against writers outside this helper.
export async function requestOrderClaim(orderNumber: string, userId: string) {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const issued = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`order-claim:${orderNumber}`}))`;
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true, isActive: true } });
    const order = await tx.order.findUnique({ where: { orderNumber }, select: { id: true, userId: true, email: true } });
    if (!user?.isActive || user.role !== 'CUSTOMER' || !order || order.userId || normalize(user.email) !== normalize(order.email)) return null;
    const now = new Date();
    await tx.orderClaimToken.updateMany({ where: { orderId: order.id, userId, usedAt: null, revokedAt: null }, data: { revokedAt: now } });
    const token = await tx.orderClaimToken.create({ data: {
      tokenHash: claimTokenHash(rawToken), orderId: order.id, userId, email: normalize(order.email), purpose: PURPOSE,
      expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
    }, select: { id: true } });
    return { tokenId: token.id, email: order.email };
  });
  if (!issued) return;
  let delivered = false;
  try { delivered = await sendOrderClaimEmail(issued.email, orderNumber, rawToken); }
  catch { /* Do not log SMTP errors: they may contain the verification URL. */ }
  if (!delivered) await prisma.orderClaimToken.updateMany({ where: { id: issued.tokenId, usedAt: null }, data: { revokedAt: new Date() } });
}

class InvalidClaim extends Error {}

export async function confirmOrderClaim(orderNumber: string, userId: string, rawToken: string): Promise<boolean> {
  if (!validClaimToken(rawToken)) return false;
  try {
    return await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`order-claim:${orderNumber}`}))`;
      const user = await tx.user.findUnique({ where: { id: userId }, select: { email: true, role: true, isActive: true } });
      const order = await tx.order.findUnique({ where: { orderNumber }, select: { id: true, userId: true, email: true } });
      if (!user?.isActive || user.role !== 'CUSTOMER' || !order || order.userId || normalize(user.email) !== normalize(order.email)) throw new InvalidClaim();
      const now = new Date();
      const consumed = await tx.orderClaimToken.updateMany({ where: {
        tokenHash: claimTokenHash(rawToken), orderId: order.id, userId, email: normalize(order.email), purpose: PURPOSE,
        usedAt: null, revokedAt: null, expiresAt: { gt: now },
      }, data: { usedAt: now } });
      if (consumed.count !== 1) throw new InvalidClaim();
      const linked = await tx.order.updateMany({ where: { id: order.id, userId: null, email: order.email }, data: { userId } });
      if (linked.count !== 1) throw new InvalidClaim();
      await tx.orderClaimToken.updateMany({ where: { orderId: order.id, usedAt: null, revokedAt: null }, data: { revokedAt: now } });
      await tx.adminAuditLog.create({ data: { userId, action: 'ORDER_CLAIMED', resourceType: 'order', resourceId: order.id,
        oldData: { userId: null }, newData: { userId }, ipAddress: 'unknown' } });
      return true;
    });
  } catch (error) {
    if (error instanceof InvalidClaim) return false;
    throw error;
  }
}
