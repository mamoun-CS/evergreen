'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Boxes, PackageOpen, Phone } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { useLanguage } from '@/components/layout/LanguageContext';
import { catalogCategories } from '@/lib/catalog-taxonomy';

type Category = { id: string; slug: string; nameAr: string; nameEn: string };
type Child = Category & { image: string | null; _count: { products: number } };

export default function CategoryHierarchyPage({ trail, subcategories: children, products, pagination }: { trail: Category[]; subcategories: Child[]; products: any[]; pagination: { page: number; totalPages: number; total: number } }) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const Arrow = ar ? ArrowLeft : ArrowRight;
  const category = trail[trail.length - 1];
  const title = ar ? category.nameAr : category.nameEn;
  // Keep verified supplier types first; hide empty internal catch-all groups.
  children = children.filter(child => catalogCategories.some(node => node.slug === child.slug));
  const hrefFor = (slug?: string) => `/category/${[...trail.map((item) => encodeURIComponent(item.slug)), ...(slug ? [encodeURIComponent(slug)] : [])].join('/')}`;
  const crumbs = [
    { label: ar ? 'الرئيسية' : 'Home', href: '/' },
    { label: ar ? 'الأقسام' : 'Categories', href: '/category' },
    ...trail.map((item, index) => ({ label: ar ? item.nameAr : item.nameEn, href: index === trail.length - 1 ? undefined : `/category/${trail.slice(0, index + 1).map((part) => encodeURIComponent(part.slug)).join('/')}` })),
  ];

  return <main className="catalogue-page mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
    <Breadcrumbs items={crumbs} />
    <header className="catalogue-titlebar"><p>{children.length ? (ar ? 'تسوّق حسب القسم' : 'EXPLORE BY CATEGORY') : (ar ? 'مجموعة المنتجات' : 'PRODUCT COLLECTION')}</p><h1>{title}</h1><span>{children.length ? (ar ? 'اختر قسمًا فرعيًا لعرض أصنافه.' : 'Choose a subcategory to view its items.') : (ar ? `${pagination.total} ${pagination.total === 1 ? 'صنف' : 'أصناف'} متاح` : `${pagination.total} ${pagination.total === 1 ? 'item' : 'items'} available`)}</span></header>
    {children.length > 0 && <section aria-label={ar ? 'الأقسام الفرعية' : 'Subcategories'} className="catalogue-type-grid">
      {children.map((child) => <Link key={child.id} href={hrefFor(child.slug)} className="catalogue-type-card group"><div className="catalogue-type-image relative">{child.image ? <Image src={child.image} alt={ar ? child.nameAr : child.nameEn} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-contain transition duration-300 group-hover:scale-105" /> : <Image src="/images/Logo-background.png" alt="" fill aria-hidden className="object-contain p-8 opacity-30" />}</div><div className="catalogue-type-content"><div><h2 className="font-extrabold text-brand-navy">{ar ? child.nameAr : child.nameEn}</h2><p>{ar ? `${child._count.products} صنف متاح` : `${child._count.products} items available`}</p></div><Arrow className="h-5 w-5 shrink-0 text-brand-gold" aria-hidden="true" /></div></Link>)}
    </section>}
    {products.length > 0 && <section className={children.length ? 'mt-12' : ''} aria-label={`${title} products`}><h2 className="mb-5 text-xl font-extrabold text-brand-navy">{children.length ? (ar ? 'أصناف هذا القسم' : 'Items in this category') : null}</h2><div className="catalogue-product-grid">{products.map((product) => <ProductCard key={product.id} product={product} imageSizes="(max-width: 480px) calc(100vw - 32px), (max-width: 700px) calc((100vw - 44px) / 2), (max-width: 1100px) 32vw, 295px" />)}</div></section>}
    {pagination.totalPages > 1 && <nav aria-label={ar ? 'صفحات المنتجات' : 'Product pages'} className="mt-8 flex items-center justify-center gap-3">
      {pagination.page > 1 && <Link rel="prev" className="dg-chip" href={pagination.page === 2 ? hrefFor() : `${hrefFor()}?page=${pagination.page - 1}`}>{ar ? 'السابق' : 'Previous'}</Link>}
      <span className="text-sm text-slate-500">{ar ? `صفحة ${pagination.page} من ${pagination.totalPages}` : `Page ${pagination.page} of ${pagination.totalPages}`}</span>
      {pagination.page < pagination.totalPages && <Link rel="next" className="dg-chip" href={`${hrefFor()}?page=${pagination.page + 1}`}>{ar ? 'التالي' : 'Next'}</Link>}
    </nav>}
    {!children.length && !products.length && <section className="catalogue-empty"><PackageOpen aria-hidden="true" /><h2>{ar ? 'لا توجد أصناف متاحة حاليًا' : 'No items are available yet'}</h2><p>{ar ? 'نجهّز هذه المجموعة الآن.' : 'We are preparing this collection.'}</p><Link href="/contact" className="dg-chip"><Phone aria-hidden="true" className="h-3.5 w-3.5" />{ar ? 'استفسار عن منتج' : 'Product inquiry'}</Link></section>}
    {children.length > 0 && products.length === 0 && <div className="mt-10 flex justify-center text-sm text-slate-500"><Boxes className="me-2 h-5 w-5" />{ar ? 'اختر قسمًا فرعيًا لعرض الأصناف.' : 'Choose a subcategory to view its items.'}</div>}
  </main>;
}
