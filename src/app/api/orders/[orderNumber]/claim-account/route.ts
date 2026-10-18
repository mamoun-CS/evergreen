import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getClientIp } from '@/lib/auth-middleware';
import { consumeRateLimit, rateLimitConfig, rateLimitResponseHeaders } from '@/lib/rate-limit';
import { claimTokenHash, confirmOrderClaim, requestOrderClaim, validClaimOrderNumber, validClaimToken } from '@/lib/order-claim';

export const dynamic = 'force-dynamic';
const generic = 'إذا كان الطلب مؤهلًا للربط، ستصلك رسالة تحقق. / If eligible, a verification email will be sent.';
function reply(body: object, status: number, extra: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', ...extra } });
}

async function readBody(req: NextRequest) {
  const reader = req.body?.getReader();
  if (!reader) return {};
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) { await reader.cancel(); throw new Error('Invalid body'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return size ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

export async function POST(req: NextRequest, { params }: { params: { orderNumber: string } }) {
  if (req.headers.get('origin') !== req.nextUrl.origin || req.headers.get('sec-fetch-site') === 'cross-site') return reply({ error: 'Forbidden' }, 403);
  if (req.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return reply({ error: 'Invalid request' }, 400);
  try {
    const user = await getCurrentUser();
    if (!user) return reply({ error: 'Sign in to continue. / سجل الدخول للمتابعة.' }, 401);
    if (user.role !== 'CUSTOMER') return reply({ error: 'Forbidden' }, 403);
    if (!validClaimOrderNumber(params.orderNumber)) return reply({ error: 'Invalid request' }, 400);
    let body;
    try { body = await readBody(req); } catch { return reply({ error: 'Invalid request' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({ error: 'Invalid request' }, 400);
    const action = body.action ?? 'request';
    if (!['request', 'confirm'].includes(action) || Object.keys(body).some(key => !['action', 'token'].includes(key)) || (action === 'request' && body.token !== undefined)) return reply({ error: 'Invalid request' }, 400);
    const config = action === 'request' ? rateLimitConfig.orderClaim : rateLimitConfig.orderClaimConfirm;
    const scope = `order-claim:${action}`;
    const keys = [`${scope}:account:${user.id}`, `${scope}:ip:${claimTokenHash(getClientIp(req.headers))}`, `${scope}:order:${claimTokenHash(params.orderNumber)}`];
    if (action === 'confirm') keys.push(`${scope}:token:${claimTokenHash(typeof body.token === 'string' ? body.token : 'invalid')}`);
    for (const key of keys) {
      const limit = await consumeRateLimit(key, config.maximum, config.windowMs);
      if (!limit.allowed) return reply({ error: 'Too many attempts. / محاولات كثيرة، حاول لاحقًا.' }, 429, rateLimitResponseHeaders(limit));
    }
    if (action === 'request') {
      await requestOrderClaim(params.orderNumber, user.id);
      return reply({ success: true, verificationRequired: true, message: generic }, 202);
    }
    if (!validClaimToken(body.token) || !await confirmOrderClaim(params.orderNumber, user.id, body.token)) return reply({ error: 'الرابط غير صالح أو غير متاح لهذا الحساب. اطلب رابطًا جديدًا. / Invalid or unavailable link. Request a new link.' }, 400);
    return reply({ success: true, redirectUrl: '/account/orders' }, 200);
  } catch {
    // Never serialize Prisma/SMTP errors, request bodies or verification URLs.
    return reply({ error: 'تعذرت معالجة الطلب حاليًا. حاول لاحقًا. / Unable to process the request. Try later.' }, 503);
  }
}
