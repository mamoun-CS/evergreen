'use server';
import { validate } from '@/lib/admin-validation';

import { IdSchema, StatusSchema } from '@/lib/validation';
import { assertAdmin } from '@/lib/auth';
import { prisma } from '@/lib/admin-prisma';
import { OrderStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function updateOrderStatus(id: string, status: OrderStatus) {
  await assertAdmin();
  status = await validate(StatusSchema, status);
  await validate(IdSchema, id);
  const order = await prisma.order.findUniqueOrThrow({where:{id},include:{payments:true,items:true}});
  if (order.requiresAdminConfirmation || order.paymentMethod === 'CASH_ON_DELIVERY' && !order.adminConfirmedAt) throw new Error('Use the COD approval queue');
  if (order.paymentMethod === 'LAHZA' && !order.payments.some(p=>p.status==='PAID')) throw new Error('Payment must be verified first');
  if (order.status !== 'PROCESSING' || status !== 'COMPLETED' || order.fulfillmentNeedsReview) throw new Error('Only fulfilled, processing orders can be completed');
  await prisma.$transaction(async (tx) => {
    const changed = await tx.order.updateMany({where:{id,status:'PROCESSING',inventoryReserved:order.inventoryReserved},data:{status,inventoryReserved:false}});
    if (!changed.count) throw new Error('Order state changed; refresh and try again');
    for (const item of order.items) await tx.inventoryAuditLog.create({data:{productId:item.productId,quantityChange:0,reason:'ORDER_FULFILLED',orderId:id}});
  });
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${id}`);
}
