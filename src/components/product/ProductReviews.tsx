'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/layout/LanguageContext';

interface ReviewData {
  id: string; rating: number; title: string | null; body: string; createdAt: string;
  verifiedPurchase: boolean; user: { name: string };
}
interface ReviewPayload {
  total: number; page: number; totalPages: number; canReview: boolean; hasReviewed: boolean;
  reviews: ReviewData[]; distribution: Record<string, number>;
}

export default function ProductReviews({ slug }: { slug: string }) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const [data, setData] = useState<ReviewPayload | null>(null);
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState('');
  const load = () => fetch(`/api/products/${encodeURIComponent(slug)}/reviews?page=${page}`, { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then(setData).catch(() => setData(null));
  useEffect(() => { void load(); }, [slug, page]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage('');
    const response = await fetch(`/api/products/${encodeURIComponent(slug)}/reviews`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating, title, body }) });
    const result = await response.json().catch(() => ({}));
    setMessage(result.message || result.error || (ar ? 'تعذر إرسال التقييم.' : 'Could not submit the review.'));
    if (response.ok) { setTitle(''); setBody(''); await load(); }
  };

  return <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 sm:p-7" aria-labelledby="reviews-title" dir={ar ? 'rtl' : 'ltr'}>
    <h2 id="reviews-title" className="text-lg font-extrabold">{ar ? 'تقييمات العملاء' : 'Customer reviews'}</h2>
    <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
      <div className="text-center"><p className="text-4xl font-extrabold text-emerald-900">{data?.total ? (([1,2,3,4,5].reduce((sum, star) => sum + star * (data.distribution[String(star)] || 0), 0) / data.total).toFixed(1)) : '—'}</p><p className="text-amber-600" aria-label="5 stars">★★★★★</p><p className="text-xs text-gray-500">{data?.total || 0} {ar ? 'تقييماً' : 'reviews'}</p></div>
      <div className="space-y-1">{[5,4,3,2,1].map((star) => { const count = data?.distribution[String(star)] || 0; const percent = data?.total ? count / data.total * 100 : 0; return <div key={star} className="flex items-center gap-2 text-xs"><span>{star} ★</span><div className="h-2 flex-1 rounded bg-gray-100"><div className="h-full rounded bg-amber-500" style={{ width: `${percent}%` }} /></div><span className="w-6 text-end">{count}</span></div>; })}</div>
    </div>
    {data?.canReview && !data.hasReviewed ? <form onSubmit={submit} className="space-y-3 border-y border-gray-100 py-5">
      <h3 className="font-bold">{ar ? 'شارك تجربتك (شراء موثق)' : 'Share your experience (verified purchase)'}</h3>
      <label className="block text-sm">{ar ? 'التقييم' : 'Rating'}<select value={rating} onChange={(event) => setRating(Number(event.target.value))} className="ms-2 rounded border p-2">{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} ★</option>)}</select></label>
      <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder={ar ? 'عنوان اختياري' : 'Optional title'} className="min-h-11 w-full rounded border px-3" />
      <textarea required minLength={5} maxLength={3000} value={body} onChange={(event) => setBody(event.target.value)} placeholder={ar ? 'اكتب تقييمك' : 'Write your review'} className="w-full rounded border p-3" rows={4} />
      <button className="min-h-11 rounded-lg bg-emerald-800 px-4 font-bold text-white">{ar ? 'إرسال للمراجعة' : 'Submit for review'}</button>
      {message && <p role="status" className="text-sm text-emerald-800">{message}</p>}
    </form> : !data?.hasReviewed && <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">{ar ? 'سجّل الدخول واشترِ المنتج لإضافة تقييم بعد إتمام الدفع.' : 'Sign in and purchase this product to leave a review after payment.'} <Link href="/login" className="font-bold text-emerald-800 underline">{ar ? 'تسجيل الدخول' : 'Sign in'}</Link></p>}
    <div className="divide-y divide-gray-100">{data?.reviews.map((review) => <article key={review.id} className="py-4 first:pt-0"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{review.title || (ar ? 'تقييم المنتج' : 'Product review')}</h3><span className="text-amber-600">{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</span></div><p className="mt-1 text-xs text-gray-500">{review.user.name} · {new Date(review.createdAt).toLocaleDateString(ar ? 'ar' : 'en')} {review.verifiedPurchase && <span className="ms-2 rounded bg-emerald-50 px-2 py-1 text-emerald-800">{ar ? 'شراء موثق' : 'Verified purchase'}</span>}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">{review.body}</p></article>)}</div>
    {data && data.totalPages > 1 && <div className="flex items-center justify-between"><button disabled={page <= 1} onClick={() => setPage(page-1)} className="min-h-10 rounded border px-3 disabled:opacity-40">{ar ? 'السابق' : 'Previous'}</button><span className="text-xs">{page} / {data.totalPages}</span><button disabled={page >= data.totalPages} onClick={() => setPage(page+1)} className="min-h-10 rounded border px-3 disabled:opacity-40">{ar ? 'التالي' : 'Next'}</button></div>}
  </section>;
}
