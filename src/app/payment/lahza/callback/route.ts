import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAndFinalizePayment } from '@/lib/payment-lifecycle';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get('reference');
  const token = req.nextUrl.searchParams.get('token');
  const statusUrl = new URL('/checkout/payment-status', req.url);
  if (token) statusUrl.searchParams.set('token', token);
  if (!reference || !token || !/^[A-Za-z0-9.=-]{8,150}$/.test(reference)) return NextResponse.redirect(statusUrl);
  const payment = await prisma.payment.findFirst({ where: { reference, order: { paymentAccessToken: token } }, select: { id: true } });
  if (payment) await verifyAndFinalizePayment(reference);
  return NextResponse.redirect(statusUrl);
}
