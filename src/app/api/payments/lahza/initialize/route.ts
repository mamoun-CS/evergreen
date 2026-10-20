import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createReservedOrder, parseCheckout, validCheckoutKey } from '@/lib/checkout-orders';
import { getLahzaConfig, initializeLahzaTransaction } from '@/lib/lahza';
import { toMinorUnits } from '@/lib/money';
import { releaseExpiredReservations } from '@/lib/payment-lifecycle';
import { getCurrentUser } from '@/lib/auth';
import { getClientIp } from '@/lib/auth-middleware';
import { consumeRateLimit, rateLimitConfig, rateLimitResponseHeaders } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function callbackUrl(request: NextRequest, token: string) {
  const url = new URL(getLahzaConfig().callbackUrl || request.url);
  url.searchParams.set('token', token);
  return url.toString();
}

export async function POST(req: NextRequest) {
  try {
    const key = req.headers.get('idempotency-key');
    if (!validCheckoutKey(key)) return NextResponse.json({ code: 'INVALID_IDEMPOTENCY_KEY', error: 'A valid checkout key is required.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    getLahzaConfig();
    // Opportunistic cleanup complements the protected scheduler endpoint.
    await releaseExpiredReservations();
    const details = parseCheckout(await req.json());
    if (!details) return NextResponse.json({ error: 'Missing or invalid checkout fields.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    const limit = await consumeRateLimit(`payment:${getClientIp(req.headers)}:${details.email}`, rateLimitConfig.payment.maximum, rateLimitConfig.payment.windowMs);
    if (!limit.allowed) return NextResponse.json({ error: 'Too many payment attempts. Please try again later.' }, { status: 429, headers: { ...rateLimitResponseHeaders(limit), 'Cache-Control': 'no-store' } });
    const user = await getCurrentUser();
    const guestSecret = req.headers.get('checkout-guest-secret');
    if (!user && !validCheckoutKey(guestSecret)) return NextResponse.json({ code: 'INVALID_CHECKOUT_OWNER', error: 'A valid guest checkout secret is required.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    const order = await createReservedOrder(details, 'LAHZA', user?.id, { key, guestSecret: guestSecret || undefined });
    if (order.replayed) {
      if (order.authorizationUrl) return NextResponse.json({ authorizationUrl: order.authorizationUrl, orderNumber: order.orderNumber }, { headers: { 'Cache-Control': 'no-store' } });
      return NextResponse.json({ code: 'PAYMENT_RECONCILIATION_PENDING', error: 'Payment initialization is pending reconciliation. Do not submit a new payment.' }, { status: 202, headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' } });
    }
    if (!order.paymentAccessToken) throw new Error('Payment access token was not created.');
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
    try {
      const initialized = await initializeLahzaTransaction({
        email: details.email, mobile: details.phone, amount: toMinorUnits(payment.amount), currency: payment.currency,
        reference: payment.reference, callbackUrl: callbackUrl(req, order.paymentAccessToken), metadata: { order_id: order.id, payment_id: payment.id },
      });
      if (initialized.reference !== payment.reference || !initialized.authorization_url) throw new Error('Invalid Lahza initialization response.');
      await prisma.checkoutAttempt.update({ where: { keyHash: order.keyHash! }, data: { paymentInitState: 'READY', authorizationUrl: initialized.authorization_url } });
      console.info('Lahza payment initialized', { reference: payment.reference, orderNumber: order.orderNumber });
      return NextResponse.json({ authorizationUrl: initialized.authorization_url }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      await prisma.checkoutAttempt.update({ where: { keyHash: order.keyHash! }, data: { paymentInitState: 'UNKNOWN' } });
      console.error('Lahza initialization outcome unknown', { reference: payment.reference, error: error instanceof Error ? error.message : 'unknown' });
      return NextResponse.json({ code: 'PAYMENT_RECONCILIATION_PENDING', error: 'Payment initialization is pending reconciliation. Do not submit a new payment.' }, { status: 202, headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' } });
    }
  } catch (error) {
    if (error instanceof Error && (error.message === 'CHECKOUT_CONFLICT' || error.message === 'CHECKOUT_PENDING')) return NextResponse.json({ code: error.message, error: error.message === 'CHECKOUT_PENDING' ? 'Checkout is processing; retry with the same key.' : 'This checkout attempt cannot be used with these details.' }, { status: 409, headers: { 'Cache-Control': 'no-store', 'Retry-After': '2' } });
    if (error instanceof Error && error.message.startsWith('Lahza is not configured:')) {
      return NextResponse.json({ error: 'الدفع بالبطاقة غير متاح حالياً. يمكنك إتمام الطلب بالدفع عند الاستلام. / Card payment is currently unavailable. You can complete your order with cash on delivery.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    if (error instanceof Error && (error.message === 'INVALID_SHIPPING_OPTION' || error.message === 'INVALID_COUPON')) return NextResponse.json({ error: 'Invalid shipping option or coupon.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    if (error instanceof Error && error.message === 'CURRENCY_MISMATCH') return NextResponse.json({ error: 'Your cart contains products in different currencies.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    console.error('Lahza initialization failed', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ error: 'Unable to start secure payment. Your card has not been charged.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
