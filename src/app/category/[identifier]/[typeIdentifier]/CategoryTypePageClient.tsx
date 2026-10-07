'use client';

import Link from 'next/link';
import { PackageOpen, Phone } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { useLanguage } from '@/components/layout/LanguageContext';

export default function CategoryTypePageClient({ parent, type, products }: { parent: { slug: string; nameEn: string; nameAr: string }; type: { nameEn: string; nameAr: string; slug?: string }; products: any[] }) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const parentName = ar ? parent.nameAr : parent.nameEn;
  const typeName = ar ? type.nameAr : type.nameEn;
  const parentId = encodeURIComponent(parent.slug);
  return <main className="catalogue-page mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
    <Breadcrumbs items={ar
      ? [{ label: 'الرئيسية', href: '/' }, { label: 'الأقسام', href: '/category' }, { label: parentName, href: `/category/${parent.slug}` }, { label: typeName }]
      : [{ label: 'Home', href: '/' }, { label: 'Categories', href: '/category' }, { label: parentName, href: `/category/${parent.slug}` }, { label: typeName }]} />
    <header className="catalogue-titlebar"><p>{ar ? 'نوع المنتج' : 'PRODUCT TYPE'}</p><h1>{typeName}</h1><span>{ar ? `${products.length} ${products.length === 1 ? 'منتج' : 'منتجات'} في هذه المجموعة` : `${products.length} ${products.length === 1 ? 'product' : 'products'} in this collection`}</span></header>
    {products.length ? (
      <>
        <section aria-label={`${typeName} products`} className="catalogue-product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</section>
        <section className="dg-chiprow mt-10" aria-label={ar ? 'متابعة التصفح' : 'Continue browsing'}>
          <Link href="/shop" className="dg-chip">{ar ? 'المتجر الكامل' : 'Full shop'}</Link>
          <Link href={`/category/${parentId}`} className="dg-chip">{ar ? `كل أنواع ${parentName}` : `All ${parentName} types`}</Link>
          <Link href="/contact" className="dg-chip"><Phone aria-hidden="true" className="h-3.5 w-3.5" />{ar ? 'استفسار عن منتج' : 'Product inquiry'}</Link>
        </section>
      </>
    ) : (
      <section className="catalogue-empty" aria-live="polite"><PackageOpen aria-hidden="true" /><h2>{ar ? 'المنتجات قادمة قريبًا' : 'Products are coming soon'}</h2><p>{ar ? 'نجهّز هذه المجموعة الآن. استكشف نوعًا آخر في الوقت الحالي.' : 'We are preparing this collection. Explore another product type in the meantime.'}</p>
        <div className="dg-chiprow justify-center">
          <Link href={`/category/${parentId}`} className="dg-chip">{ar ? `استكشف ${parentName}` : `Explore ${parentName}`}</Link>
          <Link href="/contact" className="dg-chip"><Phone aria-hidden="true" className="h-3.5 w-3.5" />{ar ? 'استفسار عن منتج' : 'Product inquiry'}</Link>
        </div>
      </section>
    )}
  </main>;
}
