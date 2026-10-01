import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import { getClientIp } from '@/lib/auth-middleware';
import { consumeRateLimit, rateLimitConfig, rateLimitResponseHeaders } from '@/lib/rate-limit';

const reply = 'إذا كان البريد مسجلاً، ستصلك رسالة إعادة التعيين قريبًا.';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'أدخل بريدًا إلكترونيًا صحيحًا.' }, { status: 400 });
    const limit = await consumeRateLimit(`password-reset:${getClientIp(request.headers)}:${email}`, rateLimitConfig.passwordReset.maximum, rateLimitConfig.passwordReset.windowMs);
    if (!limit.allowed) return NextResponse.json({ error: reply }, { status: 429, headers: rateLimitResponseHeaders(limit) });
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, isActive: true } });
    if (!user || !user.isActive) return NextResponse.json({ success: true, message: reply });
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    if (!await sendPasswordResetEmail(email, token)) {
      await prisma.passwordResetToken.delete({ where: { tokenHash } });
      return NextResponse.json({ error: 'خدمة البريد غير مهيأة حاليًا. تواصل مع إدارة المتجر.' }, { status: 503 });
    }
    return NextResponse.json({ success: true, message: reply });
  } catch (error) {
    console.error('Password reset request failed:', error);
    return NextResponse.json({ error: 'تعذر إرسال رسالة إعادة التعيين.' }, { status: 500 });
  }
}
