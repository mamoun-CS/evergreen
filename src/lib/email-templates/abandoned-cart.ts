import { frame, appUrl, escapeHtml } from './utils';

export function abandonedCart1(cartId: string, items: any[], subtotal: number) {
  const resumeUrl = `${appUrl()}/cart/recover/${cartId}`;
  
  const itemsHtml = items.map(item => `
    <div style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
      <p><strong>${escapeHtml(item.product?.nameEn || 'Item')}</strong> x ${item.quantity}</p>
      <p>Price: ${escapeHtml(item.price)}</p>
    </div>
  `).join('');

  return frame(`
    <h2>You left something in your cart!</h2>
    <p>Hi there,</p>
    <p>We noticed you left some items in your cart. They are waiting for you!</p>
    ${itemsHtml}
    <p><strong>Subtotal: ${subtotal} ILS</strong></p>
    <div style="margin-top: 30px; margin-bottom: 30px;">
      <a href="${resumeUrl}" style="background-color: #065f46; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Complete Your Purchase</a>
    </div>
    <p>If you have any questions, reply to this email.</p>
  `, 'en');
}

export function abandonedCart2(cartId: string, items: any[], subtotal: number) {
  const resumeUrl = `${appUrl()}/cart/recover/${cartId}`;
  
  const itemsHtml = items.map(item => `
    <div style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
      <p><strong>${escapeHtml(item.product?.nameEn || 'Item')}</strong> x ${item.quantity}</p>
      <p>Price: ${escapeHtml(item.price)}</p>
    </div>
  `).join('');

  return frame(`
    <h2>10% Off Your Cart!</h2>
    <p>Hi there,</p>
    <p>We noticed you still have items in your cart. We'd love to offer you a <strong>10% discount</strong> to help you complete your purchase!</p>
    <p>Use code <strong>RECOVER10</strong> at checkout.</p>
    ${itemsHtml}
    <p><strong>Subtotal: ${subtotal} ILS</strong></p>
    <div style="margin-top: 30px; margin-bottom: 30px;">
      <a href="${resumeUrl}" style="background-color: #065f46; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Complete Your Purchase</a>
    </div>
    <p>This offer expires in 3 days.</p>
  `, 'en');
}
