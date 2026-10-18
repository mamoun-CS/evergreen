import { appUrl, escapeHtml, frame } from './utils';

export function orderClaimEmail(orderNumber: string, token: string) {
  const url = new URL('/claim-order', appUrl());
  if (!['http:', 'https:'].includes(url.protocol) || (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) throw new Error('Invalid claim URL configuration');
  url.hash = new URLSearchParams({ order: orderNumber, token }).toString();
  return frame(`<h2>تأكيد ربط الطلب بحسابك / Confirm order ownership</h2>
    <p>الرابط صالح لمدة 30 دقيقة وللاستخدام مرة واحدة. افتحه وسجّل الدخول بالحساب الذي طلب الربط ثم اضغط تأكيد.</p>
    <p>This link expires in 30 minutes. Sign in with the account that requested it, then explicitly confirm.</p>
    <p><a href="${escapeHtml(url.toString())}">تأكيد ملكية الطلب / Confirm ownership</a></p>
    <p>إن لم تطلب ذلك، تجاهل الرسالة. / If you did not request this, ignore this email.</p>`, 'ar');
}
