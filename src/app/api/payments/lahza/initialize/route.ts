import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createReservedOrder, parseCheckout } from '@/lib/checkout-orders';
import { getLahzaConfig, initializeLahzaTransaction } from '@/lib/lahza';
import { toMinorUnits } from '@/lib/money';
import { releaseInventoryReservation, releaseExpiredReservations } from '@/lib/payment-lifecycle';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function callbackUrl(request: NextRequest, token: string) {
  const url = new URL(getLahzaConfig().callbackUrl || request.url);
  url.searchParams.set('token', token);
  return url.toString();
}

export async function POST(req: NextRequest) {
  try {
    getLahzaConfig();
    // Opportunistic cleanup complements the protected scheduler endpoint.
    await releaseExpiredReservations();
    const details = parseCheckout(await req.json());
    if (!details) return NextResponse.json({ error: 'Missing or invalid checkout fields.' }, { status: 400 });
    const user = await getCurrentUser();
    const order = await createReservedOrder(details, 'LAHZA', user?.id);
    if (!order.paymentAccessToken) throw new Error('Payment access token was not created.');
    const reference = `PAY-${order.orderNumber}-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const payment = await prisma.payment.create({ data: { orderId: order.id, reference, amount: order.totalAmount, currency: order.currency } });
    try {
      const initialized = await initializeLahzaTransaction({
        email: details.email, mobile: details.phone, amount: toMinorUnits(payment.amount), currency: payment.currency,
        reference: payment.reference, callbackUrl: callbackUrl(req, order.paymentAccessToken), metadata: { order_id: order.id, payment_id: payment.id },
      });
      if (initialized.reference !== payment.reference || !initialized.authorization_url) throw new Error('Invalid Lahza initialization response.');
      console.info('Lahza payment initialized', { reference: payment.reference, orderNumber: order.orderNumber });
      return NextResponse.json({ authorizationUrl: initialized.authorization_url }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failedAt: new Date() } });
      await releaseInventoryReservation(payment.id);
      throw error;
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Lahza is not configured:')) {
      return NextResponse.json({ error: 'الدفع بالبطاقة غير متاح حالياً. يمكنك إتمام الطلب بالدفع عند الاستلام. / Card payment is currently unavailable. You can complete your order with cash on delivery.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    if (error instanceof Error && (error.message === 'INVALID_SHIPPING_OPTION' || error.message === 'INVALID_COUPON')) return NextResponse.json({ error: 'Invalid shipping option or coupon.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    if (error instanceof Error && error.message === 'CURRENCY_MISMATCH') return NextResponse.json({ error: 'Your cart contains products in different currencies.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    console.error('Lahza initialization failed', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ error: 'Unable to start secure payment. Your card has not been charged.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
