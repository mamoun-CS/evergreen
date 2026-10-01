import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(token)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const order = await prisma.order.findUnique({
    where: { paymentAccessToken: token },
    select: {
      orderNumber: true, status: true, paymentMethod: true, totalAmount: true, currency: true,
      customerName: true, email: true, phone: true, shippingAddress: true,
      payments: { orderBy: { createdAt: 'desc' }, take: 1, select: { status: true } },
      items: { select: { quantity: true, price: true, product: { select: { nameAr: true, nameEn: true, images: true } } } },
    },
  });
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    orderNumber: order.orderNumber, orderStatus: order.status, paymentMethod: order.paymentMethod,
    paymentStatus: order.payments[0]?.status || 'PENDING', total: order.totalAmount, currency: order.currency,
    customer: { name: order.customerName, email: order.email, phone: order.phone, address: order.shippingAddress },
    items: order.items.map((item) => ({ quantity: item.quantity, unitPrice: item.price, nameAr: item.product.nameAr, nameEn: item.product.nameEn, image: item.product.images[0] || '/images/logo.jpg' })),
  }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
