import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { orderNumber: string } }) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orderNumber = params.orderNumber;
    if (!orderNumber) return NextResponse.json({ error: 'Missing order number' }, { status: 400 });

    const order = await prisma.order.findUnique({
      where: { orderNumber }
    });

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.userId) return NextResponse.json({ error: 'Order already claimed' }, { status: 400 });
    
    // To claim, the order's email must match the user's email
    if (order.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: 'Email mismatch. Order email does not match your account email.' }, { status: 403 });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { userId: user.id }
    });

    return NextResponse.json({ success: true, message: 'Order successfully linked to your account' });
  } catch (error) {
    console.error('Error claiming order', error);
    return NextResponse.json({ error: 'Failed to claim order' }, { status: 500 });
  }
}
