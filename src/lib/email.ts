import 'server-only';

import nodemailer from 'nodemailer';

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function transporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass || !process.env.SMTP_FROM) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const client = transporter();
  if (!client) return false;
  const resetUrl = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  await client.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'إعادة تعيين كلمة مرور Evergreen',
    text: `طلبت إعادة تعيين كلمة مرورك. استخدم الرابط التالي خلال ساعة واحدة: ${resetUrl}`,
    html: `<div dir="rtl"><h2>إعادة تعيين كلمة المرور</h2><p>اضغط الرابط التالي خلال ساعة واحدة لإعداد كلمة مرور جديدة:</p><p><a href="${resetUrl}">إعادة تعيين كلمة المرور</a></p><p>إن لم تطلب ذلك، تجاهل هذه الرسالة.</p></div>`,
  });
  return true;
}
