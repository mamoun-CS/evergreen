import { EmailOrder } from './order-confirmation';
import { appUrl, escapeHtml as e, frame } from './utils';
export function adminNotification(order: EmailOrder) {
 return frame(`<h2>${Number(order.totalAmount) >= 1000 ? 'LARGE ORDER — ' : ''}${e(order.orderNumber)}</h2><p>${e(order.customerName)} · ${e(order.email)} · ${e(order.phone)}</p><p>${e(order.shippingAddress)}</p><ul>${order.items.map(i=>`<li>${e(i.product.nameEn)} × ${i.quantity}</li>`).join('')}</ul><p>${e(order.totalAmount)} ${e(order.currency)} — ${e(order.paymentMethod)}</p><a href="${e(appUrl())}/admin/orders/${e(order.id)}">View order</a>`);
}
