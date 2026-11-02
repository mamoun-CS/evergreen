import 'server-only';
import { prisma } from './prisma';
// Email is intentionally disabled. Log a durable failure for visibility, but
// never construct a transport or attempt network delivery.
export async function sendEmail(recipient: string, subject: string, _html: string, orderId?: string, _sensitive = false) {
 await prisma.emailLog.create({data:{recipient,subject,orderId,status:'FAILED',attempts:0,error:'Email notifications are disabled'}}).catch(()=>console.error('Email log unavailable'));
 return false;
}
export function sendOrderClaimEmail(email: string, orderNumber: string, _token: string) { return sendEmail(email, `Evergreen — ${orderNumber}`, '', undefined, true); }
export function sendOrderConfirmation(email: string, order: { orderNumber: string; id: string }) { return sendEmail(email, `Evergreen — ${order.orderNumber}`, '', order.id); }
export function sendAdminNotification(order: { orderNumber: string; id: string }) { return sendEmail(process.env.ADMIN_EMAIL || '', `New order ${order.orderNumber}`, '', order.id); }
export async function notifyOrderCreated(_id: string) { return; }
export async function sendOrderUpdate(_id: string, _message: string) { return; }
export function sendRecoveryEmail1(cart: { email: string }) { return sendEmail(cart.email, 'Recovery email disabled', ''); }
export function sendRecoveryEmail2(cart: { email: string }) { return sendEmail(cart.email, 'Recovery email disabled', ''); }
