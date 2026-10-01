'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Boxes } from 'lucide-react';
import { useLanguage } from '@/components/layout/LanguageContext';

type Category = { id: string; slug: string; nameAr: string; nameEn: string; image: string | null };

export default function CategoriesPage() {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const Arrow = ar ? ArrowLeft : ArrowRight;
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  useEffect(() => { void fetch('/api/categories').then(async (response) => { if (!response.ok) throw new Error('Unable to load categories'); return response.json(); }).then((data) => { setCategories(data.categories || []); setStatus('ready'); }).catch(() => setStatus('error')); }, []);

  if (status === 'loading') return <main className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6"><div className="h-8 w-48 animate-pulse rounded bg-slate-200" /><div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-72 animate-pulse rounded-xl bg-slate-100" />)}</div></main>;
  if (status === 'error') return <main className="mx-auto max-w-7xl px-4 py-20 text-center"><Boxes className="mx-auto h-8 w-8 text-brand-gold" /><h1 className="mt-4 text-xl font-extrabold text-brand-navy">{ar ? 'تعذر تحميل الأقسام' : 'Unable to load categories'}</h1><p className="mt-2 text-sm text-slate-600">{ar ? 'حاول تحديث الصفحة.' : 'Try refreshing the page.'}</p></main>;
  return <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:py-16"><header className="border-b border-brand-gold/30 pb-6"><p className="text-xs font-bold tracking-wide text-brand-gold">{ar ? 'اكتشف مجموعتنا' : 'DISCOVER OUR COLLECTION'}</p><h1 className="mt-2 text-3xl font-extrabold text-brand-navy sm:text-4xl">{ar ? 'الأقسام' : 'Categories'}</h1><p className="mt-3 text-sm text-slate-600">{ar ? 'اختر القسم لاستعراض الأصناف التابعة له.' : 'Choose a category to browse its subcategories.'}</p></header>{categories.length ? <section className="mt-9 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{categories.map((category) => <Link key={category.id} href={`/category/${encodeURIComponent(category.slug)}`} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"><div className="relative aspect-[4/3] overflow-hidden bg-slate-50">{category.image ? <Image src={category.image} alt={ar ? category.nameAr : category.nameEn} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover transition duration-300 group-hover:scale-105" /> : <Image src="/images/Logo-background.png" alt="" fill aria-hidden className="object-contain p-10 opacity-25" />}</div><div className="flex items-center justify-between gap-3 p-5"><h2 className="font-extrabold text-brand-navy">{ar ? category.nameAr : category.nameEn}</h2><Arrow className="h-5 w-5 shrink-0 text-brand-gold" aria-hidden="true" /></div></Link>)}</section> : <div className="mt-9 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">{ar ? 'لا توجد أقسام متاحة حاليًا.' : 'No categories are available yet.'}</div>}</main>;
}
