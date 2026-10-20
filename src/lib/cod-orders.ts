import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { requirePermission, getClientIp } from './auth-middleware';
import { frame, escapeHtml } from './email-templates/utils';
import { enqueueNotification, processNotificationOutbox } from './notification-outbox';
import { IdSchema, validate } from './validation';
export async function reviewCodOrder(id: string, action: 'confirm'|'reject'|'hold', reason = '', actor?: { id: string }) {
 const user = actor || await requirePermission('update','order'); validate(IdSchema,id);
 if(action==='reject' && (!reason.trim() || reason.length>1000)) throw new Error('A rejection reason is required (maximum 1000 characters)');
  const order=await prisma.$transaction(async tx=>{
  const old=await tx.order.findUnique({where:{id},include:{items:true}});
  if(!old || old.paymentMethod!=='CASH_ON_DELIVERY' || old.status!=='PENDING' || !old.requiresAdminConfirmation || old.adminConfirmedAt) throw new Error('Order is not awaiting COD approval');
  if(action==='confirm') {
   for (const item of old.items) {
    const changed = item.variantId
     ? await tx.productVariant.updateMany({where:{id:item.variantId,productId:item.productId,stock:{gte:item.quantity},product:{isAvailable:true,purchaseMode:'PURCHASABLE'}},data:{stock:{decrement:item.quantity}}})
     : await tx.product.updateMany({where:{id:item.productId,isAvailable:true,purchaseMode:'PURCHASABLE',stockQuantity:{gte:item.quantity},variants:{none:{}}},data:{stockQuantity:{decrement:item.quantity}}});
    if (!changed.count) throw new Error('Insufficient stock to confirm order');
   }
  }
  const updated=await tx.order.updateMany({where:{id,status:'PENDING',inventoryReserved:old.inventoryReserved},data:action==='hold'?{heldForReview:true}:action==='confirm'?{status:'PROCESSING',adminConfirmedAt:new Date(),paymentVerifiedAt:new Date(),requiresAdminConfirmation:false,heldForReview:false,inventoryReserved:true}:{status:'CANCELLED',requiresAdminConfirmation:false,inventoryReserved:false,rejectionReason:reason.trim()}});
  if(!updated.count) throw new Error('Order changed while processing');
  if(action==='confirm') for(const item of old.items) {
   await tx.inventoryAuditLog.create({data: { productId: item.productId, quantityChange: -item.quantity, reason: 'ORDER_RESERVED', orderId: old.id }});
  }
  if(action==='reject' && old.inventoryReserved) for(const item of old.items) {
   if(item.variantId) await tx.productVariant.update({where:{id:item.variantId},data:{stock:{increment:item.quantity}}});
   else await tx.product.update({where:{id:item.productId},data:{stockQuantity:{increment:item.quantity}}});
   await tx.inventoryAuditLog.create({data: { productId: item.productId, quantityChange: item.quantity, reason: 'ORDER_CANCELLED', orderId: old.id }});
  }
  const order=await tx.order.findUniqueOrThrow({where:{id}});
  await tx.adminAuditLog.create({data:{userId:user.id,action:`COD_${action.toUpperCase()}`,resourceType:'order',resourceId:id,oldData:{status:old.status},newData:{status:order.status,reason},ipAddress:getClientIp()}});
  if(action!=='hold') {
    const msg = action==='confirm'
      ? (order.language==='ar'?'تم تأكيد طلبك، سنتواصل معك لتفاصيل الدفع.':"Your order has been confirmed. We'll follow up with payment details.")
      : (order.language==='ar'?`تم إلغاء الطلب: ${reason}`:`Your order was cancelled: ${reason}`);
    await enqueueNotification(tx, {
      orderId: id,
      eventType: action === 'confirm' ? 'ORDER_CONFIRMED' : 'ORDER_CANCELLED',
      recipientRole: 'CUSTOMER',
      recipient: order.email,
      subject: `Evergreen — ${order.orderNumber}`,
      htmlContent: frame(`<h2>${escapeHtml(order.orderNumber)}</h2><p>${escapeHtml(msg)}</p>`, order.language),
    });
  }
  return order;
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 if(action!=='hold') await processNotificationOutbox({ limit: 5 }).catch(() => {});
 return order;
}
