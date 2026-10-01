import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { consumeRateLimit, rateLimitConfig, rateLimitResponseHeaders } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

async function customer() {
  const user = await getCurrentUser();
  return user?.role === 'CUSTOMER' ? user : null;
}

export async function GET() {
  const user = await customer();
  if (!user) return NextResponse.json({ error: 'Sign in required. / يرجى تسجيل الدخول.' }, { status: 401 });
  const items = await prisma.wishlistItem.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, select: { productId: true, createdAt: true, product: { select: { id: true, slug: true, nameEn: true, nameAr: true, images: true, basePrice: true, discountPrice: true, currency: true, purchaseMode: true, stockQuantity: true, isAvailable: true } } } });
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const user = await customer();
  if (!user) return NextResponse.json({ error: 'Sign in required. / يرجى تسجيل الدخول.' }, { status: 401 });
  const limit = await consumeRateLimit(`wishlist:${user.id}`, rateLimitConfig.write.maximum, rateLimitConfig.write.windowMs);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many wishlist changes. / تغييرات كثيرة على قائمة الرغبات.' }, { status: 429, headers: rateLimitResponseHeaders(limit) });
  const body = await request.json().catch(() => null);
  const productId = typeof body?.productId === 'string' ? body.productId : '';
  if (!productId || productId.length > 64) return NextResponse.json({ error: 'Invalid product. / المنتج غير صالح.' }, { status: 400 });
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) return NextResponse.json({ error: 'Product not found. / المنتج غير موجود.' }, { status: 404 });
  try {
    const item = await prisma.wishlistItem.create({ data: { userId: user.id, productId } });
    return NextResponse.json({ item }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002') return NextResponse.json({ success: true, alreadySaved: true });
    throw error;
  }
}

export async function DELETE(request: NextRequest) {
  const user = await customer();
  if (!user) return NextResponse.json({ error: 'Sign in required. / يرجى تسجيل الدخول.' }, { status: 401 });
  const limit = await consumeRateLimit(`wishlist:${user.id}`, rateLimitConfig.write.maximum, rateLimitConfig.write.windowMs);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many wishlist changes. / تغييرات كثيرة على قائمة الرغبات.' }, { status: 429, headers: rateLimitResponseHeaders(limit) });
  const productId = request.nextUrl.searchParams.get('productId') || '';
  if (!productId || productId.length > 64) return NextResponse.json({ error: 'Invalid product. / المنتج غير صالح.' }, { status: 400 });
  await prisma.wishlistItem.deleteMany({ where: { userId: user.id, productId } });
  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
}
