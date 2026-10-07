'use client';

import Link from 'next/link';
import Image from 'next/image';
import useSWR from 'swr';
import { ArrowLeft, ArrowRight, LayoutGrid } from 'lucide-react';
import { useLanguage } from './LanguageContext';

export type MegaCategory = { id: string; slug: string; nameAr: string; nameEn: string; image?: string | null };

export default function CatalogMegaMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const Arrow = ar ? ArrowLeft : ArrowRight;
  const { data } = useSWR<{ categories: MegaCategory[] }>(
    '/api/categories',
    (url: string) => fetch(url).then((res) => (res.ok ? res.json() : { categories: [] })),
    { revalidateOnFocus: false, revalidateIfStale: false, dedupingInterval: 300_000 }
  );
  if (!open) return null;
  const categories = data?.categories ?? [];

  return (
    <div className="dg-megamenu" onMouseLeave={onClose}>
      <div className="dg-container dg-megamenu-in">
        {categories.length ? categories.slice(0, 12).map((category) => (
          <Link key={category.id} href={`/category/${encodeURIComponent(category.slug)}`} onClick={onClose} className="dg-mega-link">
            <span className="dg-mega-thumb">
              {category.image ? (
                <Image src={category.image.startsWith('/uploads/products/evg-product-') ? category.image.replace('/uploads/products/', '/products/') : category.image} alt="" fill sizes="52px" />
              ) : (
                <Image src="/images/Logo-background.png" alt="" fill sizes="52px" />
              )}
            </span>
            <span>
              <b>{ar ? category.nameAr : category.nameEn}</b>
              <small>{ar ? 'استعرض الأنواع' : 'Browse types'}</small>
            </span>
          </Link>
        )) : (
          <span className="dg-mega-link">{ar ? 'جارٍ تحميل الأقسام…' : 'Loading categories…'}</span>
        )}
        <div className="dg-mega-foot">
          <Link href="/category" onClick={onClose} className="dg-btn dg-btn-light">
            {ar ? 'كل الأقسام' : 'All categories'} <ArrowRight aria-hidden="true" style={ar ? { display: 'none' } : undefined} /><ArrowLeft aria-hidden="true" style={ar ? undefined : { display: 'none' }} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function MegaTriggerLabel() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <LayoutGrid aria-hidden="true" style={{ width: 15, height: 15 }} />
    </span>
  );
}
