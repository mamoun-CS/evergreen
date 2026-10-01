'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Boxes, ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/components/layout/LanguageContext';

type Subcategory = { id: string; slug: string; nameAr: string; nameEn: string; image: string | null; _count: { products: number } };
type CategoryResponse = {
  category: { id: string; slug: string; nameAr: string; nameEn: string };
  subcategories: Subcategory[];
  isLeaf: boolean;
  productCount: number;
};

export default function CategoryPageClient({ identifier }: { identifier: string }) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const Arrow = ar ? ArrowLeft : ArrowRight;
  const router = useRouter();
  const [data, setData] = useState<CategoryResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'not-found' | 'ready'>('loading');

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/categories/${encodeURIComponent(identifier)}`, { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 404) { setStatus('not-found'); return; }
        if (!response.ok) throw new Error('Category request failed');
        const json: CategoryResponse = await response.json();

        // If this is a leaf category (no subcategories), redirect directly to shop with filter.
        // This handles root categories that have products directly, not through subcategories.
        if (json.isLeaf) {
          router.replace(`/shop?category=${encodeURIComponent(json.category.slug)}`);
          return;
        }

        setData(json);
        setStatus('ready');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setStatus('error');
      });
    return () => controller.abort();
  }, [identifier, router]);

  if (status === 'loading') return (
    <main className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
      <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-72 animate-pulse rounded-xl bg-slate-100" />)}
      </div>
    </main>
  );
  if (status === 'not-found') return <CategoryMessage icon={<Boxes />} title={ar ? 'القسم غير موجود' : 'Category not found'} text={ar ? 'تحقق من الرابط أو عُد إلى قائمة الأقسام.' : 'Check the link or return to the category list.'} action={ar ? 'عرض الأقسام' : 'Browse categories'} />;
  if (status === 'error') return <CategoryMessage icon={<Boxes />} title={ar ? 'تعذر تحميل الأصناف' : 'Unable to load subcategories'} text={ar ? 'حدث خطأ مؤقت. حاول مرة أخرى.' : 'A temporary error occurred. Please try again.'} action={ar ? 'العودة للأقسام' : 'Back to categories'} />;
  if (!data) return null;

  const title = ar ? data.category.nameAr : data.category.nameEn;
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
      <Link href="/category" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-navy hover:text-brand-hover">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />{ar ? 'كل الأقسام' : 'All categories'}
      </Link>
      <header className="mt-5 border-b border-brand-gold/30 pb-6">
        <p className="text-xs font-bold tracking-wide text-brand-gold">{ar ? 'تسوّق حسب القسم' : 'SHOP BY CATEGORY'}</p>
        <h1 className="mt-2 text-3xl font-extrabold text-brand-navy sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-slate-600">{ar ? 'اختر الصنف لعرض المنتجات التابعة له.' : 'Choose a subcategory to view its products.'}</p>
      </header>
      {data.subcategories.length ? (
        <section className="mt-9 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.subcategories.map((subcategory) => (
            <Link
              key={subcategory.id}
              href={`/shop?category=${encodeURIComponent(subcategory.slug)}`}
              className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
                {subcategory.image
                  ? <Image src={subcategory.image} alt={ar ? subcategory.nameAr : subcategory.nameEn} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover transition duration-300 group-hover:scale-105" />
                  : <Image src="/images/Logo-background.png" alt="" fill aria-hidden className="object-contain p-8 opacity-30" />
                }
              </div>
              <div className="flex items-center justify-between gap-3 p-5">
                <div>
                  <h2 className="font-extrabold text-brand-navy">{ar ? subcategory.nameAr : subcategory.nameEn}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {ar ? `${subcategory._count.products} منتج متاح` : `${subcategory._count.products} products available`}
                  </p>
                </div>
                <Arrow className="h-5 w-5 shrink-0 text-brand-gold transition-transform group-hover:-translate-x-1" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <CategoryMessage
          icon={<Boxes />}
          title={ar ? 'لا توجد أصناف متاحة حاليًا' : 'No subcategories are available yet'}
          text={ar ? 'لم تتم إضافة أصناف لهذا القسم بعد.' : 'No subcategories have been added to this category yet.'}
          action={ar ? 'كل الأقسام' : 'All categories'}
          compact
        />
      )}
    </main>
  );
}

function CategoryMessage({ icon, title, text, action, compact = false }: { icon: React.ReactNode; title: string; text: string; action: string; compact?: boolean }) {
  return (
    <main className={`${compact ? 'mt-9' : 'mx-auto max-w-7xl px-4 py-20 sm:px-6'} rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center`}>
      <div className="mx-auto mb-4 w-fit text-brand-gold">{icon}</div>
      <h1 className="text-xl font-extrabold text-brand-navy">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{text}</p>
      <Link href="/category" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-navy px-5 text-sm font-bold text-white hover:bg-brand-hover">{action}</Link>
    </main>
  );
}
