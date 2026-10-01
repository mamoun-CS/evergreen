export function loginLimit(failures: {createdAt: Date}[], now = Date.now()) {
 const history=failures.filter(f=>now-f.createdAt.getTime()<7200000).map(f=>f.createdAt.getTime()).sort((a,b)=>a-b);
 if (!history.length) return 0;
 let blockedUntil=0;
 for(let i=0;i<history.length;i++) {
  const count=history.slice(0,i+1).filter(t=>history[i]-t<3600000).length;
  if(count>=10) blockedUntil=Math.max(blockedUntil,history[i]+3600000);
 }
 const hour=history.filter(t=>now-t<3600000),recent=hour.filter(t=>now-t<900000);
 const latest=hour[hour.length-1];
 const backoff=hour.length>=5?600000:hour.length>=3?300000:60000;
 const until=Math.max(blockedUntil,latest?latest+backoff:0,recent.length>=5?recent[recent.length-5]+900000:0);
 return Math.max(0,Math.ceil((until-now)/1000));
}

import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export type RateLimitResult = { allowed: boolean; retryAfter: number };
const MAX_TRANSACTION_RETRIES = 3;
const RETRY_AFTER_SECONDS = 1;

function positiveInteger(value: string | undefined, fallback: number) {
 const parsed = Number.parseInt(value || '', 10);
 return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Environment-configurable defaults. Values are deliberately conservative per scope. */
export const rateLimitConfig = {
 auth: { maximum: positiveInteger(process.env.RATE_LIMIT_AUTH_MAX, 20), windowMs: positiveInteger(process.env.RATE_LIMIT_AUTH_WINDOW_SECONDS, 900) * 1000 },
 registration: { maximum: positiveInteger(process.env.RATE_LIMIT_REGISTRATION_MAX, 5), windowMs: positiveInteger(process.env.RATE_LIMIT_REGISTRATION_WINDOW_SECONDS, 3600) * 1000 },
 passwordReset: { maximum: positiveInteger(process.env.RATE_LIMIT_PASSWORD_RESET_MAX, 5), windowMs: positiveInteger(process.env.RATE_LIMIT_PASSWORD_RESET_WINDOW_SECONDS, 3600) * 1000 },
 payment: { maximum: positiveInteger(process.env.RATE_LIMIT_PAYMENT_MAX, 8), windowMs: positiveInteger(process.env.RATE_LIMIT_PAYMENT_WINDOW_SECONDS, 900) * 1000 },
 write: { maximum: positiveInteger(process.env.RATE_LIMIT_WRITE_MAX, 30), windowMs: positiveInteger(process.env.RATE_LIMIT_WRITE_WINDOW_SECONDS, 3600) * 1000 },
 browse: { maximum: positiveInteger(process.env.RATE_LIMIT_BROWSE_MAX, 180), windowMs: positiveInteger(process.env.RATE_LIMIT_BROWSE_WINDOW_SECONDS, 60) * 1000 },
};

/**
 * One atomic INSERT … ON CONFLICT statement. PostgreSQL applies the row lock
 * for that primary key, so concurrent requests cannot deadlock the way an
 * interactive transaction plus advisory lock did (Prisma P2034). The counter
 * is shared by every app instance and survives restarts. Over-limit calls do
 * not increment the counter.
 */
function isTransactionConflict(error: unknown) {
 return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2034' || error.code === 'P2036');
}

function delay(milliseconds: number) {
 return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function consumeRateLimitOnce(key: string, maximum: number, windowMs: number, now: Date): Promise<RateLimitResult> {
 const windowStart = new Date(now.getTime() - windowMs);
 // WHERE skips the write once the window is full, so RETURNING is empty exactly
 // when the request is over the limit. A follow-up read is only for Retry-After.
 const rows = await prisma.$queryRaw<Array<{ count: number; windowStartedAt: Date }>>`
  INSERT INTO "RateLimitBucket" ("key", "count", "windowStartedAt", "updatedAt")
  VALUES (${key}, 1, ${now}, ${now})
  ON CONFLICT ("key") DO UPDATE SET
   "count" = CASE
    WHEN "RateLimitBucket"."windowStartedAt" <= ${windowStart} THEN 1
    ELSE "RateLimitBucket"."count" + 1
   END,
   "windowStartedAt" = CASE
    WHEN "RateLimitBucket"."windowStartedAt" <= ${windowStart} THEN ${now}
    ELSE "RateLimitBucket"."windowStartedAt"
   END,
   "updatedAt" = ${now}
  WHERE "RateLimitBucket"."windowStartedAt" <= ${windowStart}
     OR "RateLimitBucket"."count" < ${maximum}
  RETURNING "count", "windowStartedAt"
 `;
 if (rows[0]) return { allowed: true, retryAfter: 0 };
 const existing = await prisma.rateLimitBucket.findUnique({ where: { key }, select: { windowStartedAt: true } });
 const elapsed = existing ? now.getTime() - existing.windowStartedAt.getTime() : 0;
 const retryAfter = Math.max(1, Math.ceil((windowMs - elapsed) / 1000));
 return { allowed: false, retryAfter };
}

export async function consumeRateLimit(key: string, maximum: number, windowMs: number, now = new Date()): Promise<RateLimitResult> {
 if (!key || key.length > 255) throw new Error('Invalid rate limit key');
 for (let attempt = 0; attempt < MAX_TRANSACTION_RETRIES; attempt += 1) {
  try {
   return await consumeRateLimitOnce(key, maximum, windowMs, now);
  } catch (error) {
   if (!isTransactionConflict(error)) throw error;
   if (attempt === MAX_TRANSACTION_RETRIES - 1) break;
   await delay(10 * (attempt + 1) + Math.floor(Math.random() * 10));
  }
 }
 return { allowed: false, retryAfter: RETRY_AFTER_SECONDS };
}

export function rateLimitResponseHeaders(result: RateLimitResult) {
 return { 'Retry-After': String(result.retryAfter), 'Cache-Control': 'no-store' };
}

export function canReviewProduct(userId: string, productId: string, orders: Array<{userId: string | null; id: string; status: string; productIds: string[]; paid: boolean}>) {
 return orders.find(order => order.userId===userId && order.productIds.includes(productId) && (order.paid || order.status==='COMPLETED')) || null;
}
