import 'server-only';
import { ReviewStatus } from '@prisma/client';
import { prisma } from './prisma';

export async function recalculateProductRating(productId: string) {
  const aggregate = await prisma.review.aggregate({ where: { productId, status: ReviewStatus.APPROVED }, _avg: { rating: true }, _count: { _all: true } });
  await prisma.product.update({ where: { id: productId }, data: { ratingAvg: aggregate._avg.rating || 0, ratingCount: aggregate._count._all } });
}

export function sanitizeReviewText(value: string) {
  return value.replace(/<[^>]*>/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
}
