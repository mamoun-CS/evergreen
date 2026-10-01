import { NextRequest, NextResponse } from 'next/server';
import { createReservedOrder, parseCheckout } from '@/lib/checkout-orders';
import { getCurrentUser } from '@/lib/auth';
import { getClientIp } from '@/lib/auth-middleware';
import { consumeRateLimit, rateLimitConfig, rateLimitResponseHeaders } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const details = parseCheckout(await req.json());
    if (!details) return NextResponse.json({ error: 'Missing or invalid order fields.' }, { status: 400 });
    const limit = await consumeRateLimit(`order:${getClientIp(req.headers)}:${details.email}`, rateLimitConfig.payment.maximum, rateLimitConfig.payment.windowMs);
    if (!limit.allowed) return NextResponse.json({ error: 'Too many order attempts. Please try again later.' }, { status: 429, headers: rateLimitResponseHeaders(limit) });
    const user = await getCurrentUser();
    const order = await createReservedOrder(details, 'CASH_ON_DELIVERY', user?.id);
    return NextResponse.json({ success: true, message: 'Order received! Our team will review and confirm soon.', order: { orderNumber: order.orderNumber, paymentAccessToken: order.paymentAccessToken } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAVAILABLE_PRODUCT') {
      return NextResponse.json({ error: 'One or more products are unavailable in the requested quantity.' }, { status: 409 });
    }
    if (error instanceof Error && (error.message === 'INVALID_SHIPPING_OPTION' || error.message === 'INVALID_COUPON')) return NextResponse.json({ error: 'Invalid shipping option or coupon.' }, { status: 400 });
    if (error instanceof Error && error.message === 'CURRENCY_MISMATCH') return NextResponse.json({ error: 'Your cart contains products in different currencies.' }, { status: 400 });
    console.error('API Error creating manual order:', error);
    return NextResponse.json(
      { error: 'Failed to create order.' },
      { status: 500 }
    );
  }
}
