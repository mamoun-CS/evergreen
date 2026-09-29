import 'server-only';
import nodemailer from 'nodemailer';
import { prisma } from './prisma';
import { orderConfirmation, EmailOrder } from './email-templates/order-confirmation';
import { adminNotification } from './email-templates/admin-notification';
import { escapeHtml, frame } from './email-templates/utils';
export async function sendEmail(recipient: string, subject: string, html: string, orderId?: string) {
 let error = 'SMTP is not configured', attempts = 0;
 const configured = process.env.SMTP_HOST && process.env.SMTP_FROM;
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) error = 'Invalid email address';
 else if (configured) {
  const port = Number(process.env.SMTP_PORT || 587);
  const client = nodemailer.createTransport({host:process.env.SMTP_HOST,port,secure:port===465,auth:process.env.SMTP_USER ? {user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD} : undefined,connectionTimeout:5000,greetingTimeout:5000,socketTimeout:10000});
  for (attempts=1; attempts<=3; attempts++) {
   try { await client.sendMail({from:process.env.SMTP_FROM,to:recipient,subject,html}); error=''; break; }
   catch (e) { error=e instanceof Error ? e.message : 'Delivery failed'; if (attempts<3) await new Promise(r=>setTimeout(r,attempts*250)); }
  }
 }
 await prisma.emailLog.create({data:{recipient,subject,orderId,status:error?'FAILED':'SENT',attempts:Math.min(attempts,3),error:error ? error.slice(0,1000) : null}}).catch(()=>console.error('Email log unavailable'));
 if (error) console.error('Email delivery failed',{orderId,error});
 return !error;
}
export function sendOrderConfirmation(email: string, order: EmailOrder) { return sendEmail(email,`Evergreen — ${order.orderNumber}`,orderConfirmation(order),order.id); }
export function sendAdminNotification(order: EmailOrder) { return sendEmail(process.env.ADMIN_EMAIL || '',`New order ${order.orderNumber}`,adminNotification(order),order.id); }
export async function notifyOrderCreated(id: string) {
 try { const order=await prisma.order.findUniqueOrThrow({where:{id},include:{items:{include:{product:true}}}}); await Promise.allSettled([sendOrderConfirmation(order.email,order),sendAdminNotification(order)]); } catch { console.error('Order notification failed',{id}); }
}
export async function sendOrderUpdate(id: string, message: string) {
 try { const order=await prisma.order.findUniqueOrThrow({where:{id}}); await sendEmail(order.email,`Evergreen — ${order.orderNumber}`,frame(`<h2>${escapeHtml(order.orderNumber)}</h2><p>${escapeHtml(message)}</p>`,order.language),id); } catch { console.error('Order update email failed',{id}); }
}

import { abandonedCart1, abandonedCart2 } from './email-templates/abandoned-cart';

export function sendRecoveryEmail1(cart: any) {
  let items = [];
  try { items = typeof cart.items === 'string' ? JSON.parse(cart.items) : cart.items; } catch (e) {}
  return sendEmail(cart.email, 'You left something in your cart!', abandonedCart1(cart.id, items, cart.subtotal));
}

export function sendRecoveryEmail2(cart: any) {
  let items = [];
  try { items = typeof cart.items === 'string' ? JSON.parse(cart.items) : cart.items; } catch (e) {}
  return sendEmail(cart.email, '10% Off Your Cart!', abandonedCart2(cart.id, items, cart.subtotal));
}
