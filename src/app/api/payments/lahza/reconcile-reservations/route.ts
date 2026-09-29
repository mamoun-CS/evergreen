import { NextRequest, NextResponse } from 'next/server';
import { releaseExpiredReservations } from '@/lib/payment-lifecycle';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Invoke from a trusted scheduler every few minutes; never expose this endpoint publicly. */
export async function POST(req: NextRequest) {
  const secret = process.env.PAYMENT_RECONCILIATION_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const released = await releaseExpiredReservations();
  return NextResponse.json({ released }, { headers: { 'Cache-Control': 'no-store' } });
}
