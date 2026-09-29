'use server';

import { ReviewStatus } from '@prisma/client';
import { prisma } from '@/lib/admin-prisma';
import { requirePermission, logAdminAction } from '@/lib/auth-middleware';
import { recalculateProductRating } from '@/lib/reviews';
import { revalidatePath } from 'next/cache';

export async function moderateReview(id: string, status: 'APPROVED' | 'REJECTED') {
  const admin = await requirePermission('update', 'review');
  const previous = await prisma.review.findUnique({ where: { id } });
  if (!previous) throw new Error('Review not found.');
  const updated = await prisma.review.update({ where: { id }, data: { status: status as ReviewStatus } });
  await recalculateProductRating(previous.productId);
  await logAdminAction({ userId: admin.id, action: status === 'APPROVED' ? 'REVIEW_APPROVED' : 'REVIEW_REJECTED', resourceType: 'review', resourceId: id, oldData: { status: previous.status }, newData: { status } });
  revalidatePath('/admin/reviews');
  revalidatePath(`/products/${previous.productId}`);
  return updated;
}

export async function deleteReview(id: string) {
  const admin = await requirePermission('delete', 'review');
  const previous = await prisma.review.findUnique({ where: { id } });
  if (!previous) return;
  await prisma.review.delete({ where: { id } });
  await recalculateProductRating(previous.productId);
  await logAdminAction({ userId: admin.id, action: 'REVIEW_DELETED', resourceType: 'review', resourceId: id, oldData: { status: previous.status, rating: previous.rating } });
  revalidatePath('/admin/reviews');
  revalidatePath(`/products/${previous.productId}`);
}
