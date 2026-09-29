import { Prisma } from '@prisma/client';
import { appUrl, escapeHtml as e, frame } from './utils';
export type EmailOrder = Prisma.OrderGetPayload<{include:{items:{include:{product:true}}}}>;
export function orderConfirmation(order: EmailOrder) {
 const ar = order.language === 'ar';
 const link = `${appUrl()}/track/${encodeURIComponent(order.orderNumber)}?token=${encodeURIComponent(order.paymentAccessToken || '')}`;
 return frame(`<h2>${ar ? 'تم استلام طلبك' : 'Order received'} ${e(order.orderNumber)}</h2><p>${e(order.createdAt.toISOString().slice(0,10))}</p><p>${order.requiresAdminConfirmation ? (ar ? 'سيقوم فريقنا بمراجعة طلبك وتأكيده قريباً.' : 'Our team will review and confirm your order soon.') : (ar ? 'بانتظار تأكيد الدفع.' : 'Awaiting payment confirmation.')}</p><table style="width:100%"><tbody>${order.items.map(i=>`<tr><td>${e(ar ? i.product.nameAr : i.product.nameEn)}</td><td>${i.quantity}</td><td>${e(i.price)} ${e(order.currency)}</td></tr>`).join('')}</tbody></table><p>${ar ? 'الإجمالي' : 'Total'}: ${e(order.totalAmount)} ${e(order.currency)}</p><p>${e(order.customerName)}<br>${e(order.shippingAddress)}<br>${e(order.shippingMethod)}</p><a href="${e(link)}">${ar ? 'تتبع الطلب' : 'Track order'}</a>`, order.language);
}
