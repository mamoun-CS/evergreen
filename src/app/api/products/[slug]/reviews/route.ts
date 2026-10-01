import { NextRequest, NextResponse } from 'next/server';
import { ReviewStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { consumeRateLimit, canReviewProduct, rateLimitConfig, rateLimitResponseHeaders } from '@/lib/rate-limit';
import { ReviewSubmissionSchema } from '@/lib/validation';
import { sanitizeReviewText } from '@/lib/reviews';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 10;

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const product = await prisma.product.findUnique({ where: { slug: params.slug }, select: { id: true } });
  if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  const currentPage = Math.max(1, Math.min(1000, Number(request.nextUrl.searchParams.get('page')) || 1));
  const [total, reviews, distribution, user] = await Promise.all([
    prisma.review.count({ where: { productId: product.id, status: ReviewStatus.APPROVED } }),
    prisma.review.findMany({ where: { productId: product.id, status: ReviewStatus.APPROVED }, orderBy: { createdAt: 'desc' }, skip: (currentPage - 1) * PAGE_SIZE, take: PAGE_SIZE, select: { id: true, rating: true, title: true, body: true, createdAt: true, orderId: true, user: { select: { name: true } } } }),
    prisma.review.groupBy({ by: ['rating'], where: { productId: product.id, status: ReviewStatus.APPROVED }, _count: { _all: true } }),
    getCurrentUser(),
  ]);
  let canReview = false;
  let hasReviewed = false;
  if (user?.role === 'CUSTOMER') {
    const [orders, existing] = await Promise.all([
      prisma.order.findMany({ where: { userId: user.id, items: { some: { productId: product.id } }, OR: [{ status: 'COMPLETED' }, { payments: { some: { status: 'PAID' } } }] }, select: { id: true, userId: true, status: true, items: { select: { productId: true } }, payments: { where: { status: 'PAID' }, select: { id: true }, take: 1 } } }),
      prisma.review.findUnique({ where: { productId_userId: { productId: product.id, userId: user.id } }, select: { id: true } }),
    ]);
    canReview = Boolean(canReviewProduct(user.id, product.id, orders.map((order) => ({ id: order.id, userId: order.userId, status: order.status, productIds: order.items.map((item) => item.productId), paid: order.payments.length > 0 }))));
    hasReviewed = Boolean(existing);
  }
  return NextResponse.json({ page: currentPage, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)), reviews: reviews.map((review) => ({ ...review, verifiedPurchase: Boolean(review.orderId) })), distribution: Object.fromEntries(distribution.map((entry) => [entry.rating, entry._count._all])), canReview, hasReviewed }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'CUSTOMER') return NextResponse.json({ error: 'سجّل الدخول بحساب العميل لكتابة تقييم. / Sign in with a customer account to write a review.' }, { status: 401 });
  const limit = await consumeRateLimit(`review:${user.id}`, rateLimitConfig.write.maximum, rateLimitConfig.write.windowMs);
  if (!limit.allowed) return NextResponse.json({ error: 'وصلت إلى حد التقييمات المؤقت. / You have reached the temporary review limit.' }, { status: 429, headers: rateLimitResponseHeaders(limit) });
  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: 'Invalid review data. / بيانات التقييم غير صالحة.' }, { status: 400 }); }
  const parsed = ReviewSubmissionSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: 'أدخل تقييماً من نجمة إلى خمس نجوم ونصاً من 5 إلى 3000 حرف. / Enter a 1–5 star rating and text from 5 to 3,000 characters.' }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { slug: params.slug }, select: { id: true } });
  if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  const orders = await prisma.order.findMany({ where: { userId: user.id, items: { some: { productId: product.id } }, OR: [{ status: 'COMPLETED' }, { payments: { some: { status: 'PAID' } } }] }, select: { id: true, userId: true, status: true, items: { select: { productId: true } }, payments: { where: { status: 'PAID' }, select: { id: true }, take: 1 } } });
  const eligibleOrder = canReviewProduct(user.id, product.id, orders.map((order) => ({ id: order.id, userId: order.userId, status: order.status, productIds: order.items.map((item) => item.productId), paid: order.payments.length > 0 })));
  if (!eligibleOrder) return NextResponse.json({ error: 'يمكن التقييم بعد شراء المنتج وإتمام الدفع. / You can review this product after purchasing and completing payment.' }, { status: 403 });
  try {
    const review = await prisma.review.create({ data: { productId: product.id, userId: user.id, orderId: eligibleOrder.id, rating: parsed.data.rating, title: parsed.data.title ? sanitizeReviewText(parsed.data.title) : null, body: sanitizeReviewText(parsed.data.body), status: ReviewStatus.PENDING } });
    return NextResponse.json({ review: { id: review.id, status: review.status }, message: 'سيظهر تقييمك بعد المراجعة. / Your review will appear after moderation.' }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002') return NextResponse.json({ error: 'لقد أرسلت تقييماً لهذا المنتج مسبقاً. / You have already reviewed this product.' }, { status: 409 });
    throw error;
  }
}
