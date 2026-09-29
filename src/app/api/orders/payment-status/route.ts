import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token || !/^[A-Za-z0-9_-]{40,80}$/.test(token)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const order = await prisma.order.findUnique({
    where: { paymentAccessToken: token },
    select: { orderNumber: true, status: true, payments: { orderBy: { createdAt: 'desc' }, take: 1, select: { status: true } } },
  });
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ orderNumber: order.orderNumber, orderStatus: order.status, paymentStatus: order.payments[0]?.status || 'PENDING' }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
