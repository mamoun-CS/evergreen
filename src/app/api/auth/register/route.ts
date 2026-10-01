import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createSessionCookieValue, sessionCookie } from '@/lib/auth';
import { getClientIp } from '@/lib/auth-middleware';
import { consumeRateLimit, rateLimitConfig, rateLimitResponseHeaders } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    if (!name || name.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || password.length < 10 || password.length > 128 || phone.length > 40) return NextResponse.json({ error: 'تحقق من البيانات: كلمة المرور يجب أن تكون 10 أحرف على الأقل.' }, { status: 400 });
    const limit = await consumeRateLimit(`register:${getClientIp(request.headers)}:${email}`, rateLimitConfig.registration.maximum, rateLimitConfig.registration.windowMs);
    if (!limit.allowed) return NextResponse.json({ error: 'Too many registration attempts. / محاولات تسجيل كثيرة.' }, { status: 429, headers: rateLimitResponseHeaders(limit) });
    const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (exists) return NextResponse.json({ error: 'البريد الإلكتروني مسجل بالفعل.' }, { status: 409 });
    const user = await prisma.user.create({ data: { name, email, phone: phone || null, passwordHash: await bcrypt.hash(password, 12), role: Role.CUSTOMER } });
    const response = NextResponse.json({ success: true, redirectUrl: '/account' }, { status: 201 });
    response.cookies.set(sessionCookie(createSessionCookieValue(user.id, user.role)));
    return response;
  } catch (error) {
    console.error('Registration failed:', error);
    return NextResponse.json({ error: 'تعذر إنشاء الحساب.' }, { status: 500 });
  }
}
