import { ReviewStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { moderateReview, deleteReview } from '../actions/review-actions';

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage({ searchParams }: { searchParams: { status?: string } }) {
  const statuses = Object.values(ReviewStatus);
  const status = statuses.includes(searchParams.status as ReviewStatus) ? searchParams.status as ReviewStatus : undefined;
  const reviews = await prisma.review.findMany({ where: status ? { status } : undefined, include: { user: { select: { name: true, email: true } }, product: { select: { nameAr: true, nameEn: true, slug: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
  return <main className="space-y-5 p-4 sm:p-6 lg:p-8">
    <header><h1 className="text-2xl font-extrabold text-slate-900">تقييمات المنتجات / Product reviews</h1><p className="mt-1 text-sm text-slate-600">مراجعة التقييمات قبل نشرها / Moderate reviews before publishing.</p></header>
    <nav className="flex flex-wrap gap-2 text-sm">{['ALL', ...statuses].map((value) => <a key={value} href={value === 'ALL' ? '/admin/reviews' : `/admin/reviews?status=${value}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold">{value}</a>)}</nav>
    <div className="space-y-3">{reviews.map((review) => <article key={review.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><a href={`/products/${review.product.slug}`} className="font-bold text-emerald-800">{review.product.nameAr} / {review.product.nameEn}</a><p className="mt-1 text-xs text-slate-500">{review.user.name} · {review.user.email} · {review.status}</p></div><p aria-label={`${review.rating} / 5`} className="font-bold text-amber-700">{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</p></div>
      {review.title && <h2 className="mt-3 font-bold">{review.title}</h2>}<p className="mt-2 whitespace-pre-wrap text-sm leading-6">{review.body}</p><p className="mt-2 text-xs text-slate-500">{review.orderId ? 'Verified purchase / شراء موثق' : 'Unverified / غير موثق'}</p>
      <div className="mt-3 flex flex-wrap gap-2">{review.status !== 'APPROVED' && <form action={async () => { 'use server'; await moderateReview(review.id, 'APPROVED'); }}><button className="min-h-10 rounded-lg bg-emerald-800 px-3 text-sm font-bold text-white">اعتماد / Approve</button></form>}{review.status !== 'REJECTED' && <form action={async () => { 'use server'; await moderateReview(review.id, 'REJECTED'); }}><button className="min-h-10 rounded-lg border border-amber-500 px-3 text-sm font-bold">رفض / Reject</button></form>}<form action={async () => { 'use server'; await deleteReview(review.id); }}><button className="min-h-10 rounded-lg border border-red-300 px-3 text-sm font-bold text-red-700">حذف / Delete</button></form></div>
    </article>)}{reviews.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-600">لا توجد تقييمات / No reviews found.</p>}</div>
  </main>;
}
