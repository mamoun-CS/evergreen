'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Boxes } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/layout/LanguageContext';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

type Subcategory = { id: string; slug: string; nameAr: string; nameEn: string; image: string | null; isDirectProducts?: boolean; _count: { products: number } };
type CategoryResponse = {
  category: { id: string; slug: string; nameAr: string; nameEn: string };
  subcategories: Subcategory[];
  isLeaf: boolean;
  productCount: number;
};

type CategoryRequest = {
  controller: AbortController;
  consumers: number;
  promise: Promise<{ status: number; data?: CategoryResponse }>;
};

// Development Strict Mode briefly mounts, cleans up, then mounts again. Share
// an in-flight request across those consumers instead of issuing it twice.
const categoryRequests = new Map<string, CategoryRequest>();

function acquireCategoryRequest(identifier: string) {
  let request = categoryRequests.get(identifier);
  if (!request) {
    const controller = new AbortController();
    request = {
      controller,
      consumers: 0,
      promise: fetch(`/api/categories/${encodeURIComponent(identifier)}`, { signal: controller.signal })
        .then(async (response) => ({
          status: response.status,
          data: response.ok ? await response.json() as CategoryResponse : undefined,
        })),
    };
    categoryRequests.set(identifier, request);
    void request.promise.then(
      () => { if (categoryRequests.get(identifier) === request) categoryRequests.delete(identifier); },
      () => { if (categoryRequests.get(identifier) === request) categoryRequests.delete(identifier); },
    );
  }
  request.consumers += 1;
  return request;
}

function releaseCategoryRequest(identifier: string, request: CategoryRequest) {
  request.consumers -= 1;
  // A microtask lets Strict Mode's immediate replacement subscribe to the same
  // request; an actual route/category change still aborts an orphaned fetch.
  queueMicrotask(() => {
    if (request.consumers === 0 && categoryRequests.get(identifier) === request) {
      request.controller.abort();
      categoryRequests.delete(identifier);
    }
  });
}

export default function CategoryPageClient({ identifier }: { identifier: string }) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const Arrow = ar ? ArrowLeft : ArrowRight;
  const router = useRouter();
  const routerRef = useRef(router);
  const [data, setData] = useState<CategoryResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'not-found' | 'ready'>('loading');

  // `useRouter()` is not part of the request identity. Keeping it in the
  // effect dependencies allowed a new router reference to restart the fetch.
  routerRef.current = router;

  useEffect(() => {
    let active = true;
    const request = acquireCategoryRequest(identifier);
    setStatus('loading');
    void request.promise
      .then(({ status: responseStatus, data: json }) => {
        if (!active) return;
        if (responseStatus === 404) { setStatus('not-found'); return; }
        if (!json) throw new Error('Category request failed');
        // A leaf is already a real product type. Its exact category listing is
        // the useful next step; only actual parents get the type chooser.
        if (json.isLeaf) {
          routerRef.current.replace(`/shop?category=${encodeURIComponent(json.category.slug)}`);
          return;
        }
        setData(json);
        setStatus('ready');
      })
      .catch((error) => {
        if (active && error.name !== 'AbortError') setStatus('error');
      });
    return () => {
      active = false;
      releaseCategoryRequest(identifier, request);
    };
  }, [identifier]);

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
    <main className="catalogue-page mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <Breadcrumbs items={ar
        ? [{ label: 'الرئيسية', href: '/' }, { label: 'الأقسام', href: '/category' }, { label: title }]
        : [{ label: 'Home', href: '/' }, { label: 'Categories', href: '/category' }, { label: title }]} />
      <header className="catalogue-titlebar">
        <p>{ar ? 'تسوّق حسب النوع' : 'EXPLORE BY TYPE'}</p>
        <h1>{title}</h1>
        <span>{ar ? 'اختر نوع المنتج لعرض المجموعة المناسبة لمساحتك.' : 'Choose a product type to find the right collection for your space.'}</span>
      </header>
      {data.subcategories.length ? (
        <section aria-label={ar ? 'أنواع المنتجات' : 'Product types'} className="catalogue-type-grid">
          {data.subcategories.map((subcategory) => (
            <Link
              key={subcategory.id}
              href={`/category/${encodeURIComponent(data.category.slug)}/${encodeURIComponent(subcategory.slug)}`}
              className="catalogue-type-card group"
            >
              <div className="catalogue-type-image relative">
                {subcategory.image
                  ? <Image src={subcategory.image} alt={ar ? subcategory.nameAr : subcategory.nameEn} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover transition duration-300 group-hover:scale-105" />
                  : <Image src="/images/Logo-background.png" alt="" fill aria-hidden className="object-contain p-8 opacity-30" />
                }
              </div>
              <div className="catalogue-type-content">
                <div>
                  <h2 className="font-extrabold text-brand-navy">{ar ? subcategory.nameAr : subcategory.nameEn}</h2>
                  <p>
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
          title={ar ? 'لا توجد أنواع منتجات متاحة حاليًا' : 'No product types are available yet'}
          text={ar ? 'سنضيف أنواع منتجات إلى هذا القسم قريبًا.' : 'Product types will be added to this category soon.'}
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
