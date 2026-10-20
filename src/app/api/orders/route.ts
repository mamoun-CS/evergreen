import { NextRequest, NextResponse } from 'next/server';
import { createReservedOrder, parseCheckout, validCheckoutKey } from '@/lib/checkout-orders';
import { getCurrentUser } from '@/lib/auth';
import { getClientIp } from '@/lib/auth-middleware';
import { consumeRateLimit, rateLimitConfig, rateLimitResponseHeaders } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const key = req.headers.get('idempotency-key');
    if (!validCheckoutKey(key)) return NextResponse.json({ code: 'INVALID_IDEMPOTENCY_KEY', error: 'A valid checkout key is required.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    const details = parseCheckout(await req.json());
    if (!details) return NextResponse.json({ error: 'Missing or invalid order fields.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    const limit = await consumeRateLimit(`order:${getClientIp(req.headers)}:${details.email}`, rateLimitConfig.payment.maximum, rateLimitConfig.payment.windowMs);
    if (!limit.allowed) return NextResponse.json({ error: 'Too many order attempts. Please try again later.' }, { status: 429, headers: { ...rateLimitResponseHeaders(limit), 'Cache-Control': 'no-store' } });
    const user = await getCurrentUser();
    const guestSecret = req.headers.get('checkout-guest-secret');
    if (!user && !validCheckoutKey(guestSecret)) return NextResponse.json({ code: 'INVALID_CHECKOUT_OWNER', error: 'A valid guest checkout secret is required.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    const order = await createReservedOrder(details, 'CASH_ON_DELIVERY', user?.id, { key, guestSecret: guestSecret || undefined });
    return NextResponse.json({ success: true, message: 'Order received! Our team will review and confirm soon.', order: { orderNumber: order.orderNumber, paymentAccessToken: order.paymentAccessToken } }, { status: order.replayed ? 200 : 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && (error.message === 'CHECKOUT_CONFLICT' || error.message === 'CHECKOUT_PENDING')) return NextResponse.json({ code: error.message, error: error.message === 'CHECKOUT_PENDING' ? 'Checkout is processing; retry with the same key.' : 'This checkout attempt cannot be used with these details.' }, { status: 409, headers: { 'Cache-Control': 'no-store', 'Retry-After': '2' } });
    if (error instanceof Error && error.message === 'UNAVAILABLE_PRODUCT') {
      return NextResponse.json({ error: 'One or more products are unavailable in the requested quantity.' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    }
    if (error instanceof Error && (error.message === 'INVALID_SHIPPING_OPTION' || error.message === 'INVALID_COUPON' || error.message === 'INVALID_PRODUCT')) return NextResponse.json({ error: 'Invalid product, shipping option or coupon.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    if (error instanceof Error && error.message === 'CURRENCY_MISMATCH') return NextResponse.json({ error: 'Your cart contains products in different currencies.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    console.error('API Error creating manual order:', error);
    return NextResponse.json(
      { error: 'Failed to create order.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
