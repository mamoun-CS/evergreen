import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const token = typeof body.token === 'string' ? body.token : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!token || password.length < 10 || password.length > 128) return NextResponse.json({ error: 'الرابط أو كلمة المرور غير صالحين.' }, { status: 400 });
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash }, select: { id: true, userId: true, expiresAt: true, usedAt: true } });
    if (!reset || reset.usedAt || reset.expiresAt <= new Date()) return NextResponse.json({ error: 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية.' }, { status: 400 });
    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { passwordHash: await bcrypt.hash(password, 12) } }),
      prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: reset.userId, usedAt: null, id: { not: reset.id } } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password reset confirmation failed:', error);
    return NextResponse.json({ error: 'تعذر إعادة تعيين كلمة المرور.' }, { status: 500 });
  }
}
