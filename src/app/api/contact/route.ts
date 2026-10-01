import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClientIp } from '@/lib/auth-middleware';
import { consumeRateLimit, rateLimitConfig, rateLimitResponseHeaders } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!name || name.length > 120 || !email || email.length > 254 || !email.includes('@') || !message || message.length > 2000) {
      return NextResponse.json({ error: 'Invalid contact details.' }, { status: 400 });
    }
    const limit = await consumeRateLimit(`contact:${getClientIp(request.headers)}:${email}`, rateLimitConfig.write.maximum, rateLimitConfig.write.windowMs);
    if (!limit.allowed) return NextResponse.json({ error: 'Too many messages. Please try again later.' }, { status: 429, headers: rateLimitResponseHeaders(limit) });

    await prisma.contactInquiry.create({ data: { name, email, message } });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Unable to submit contact enquiry:', error);
    return NextResponse.json({ error: 'Unable to submit contact enquiry.' }, { status: 500 });
  }
}
