'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, LayoutGrid } from 'lucide-react';
import { useLanguage } from './LanguageContext';

export type MegaCategory = { id: string; slug: string; nameAr: string; nameEn: string; image?: string | null };

export default function CatalogMegaMenu({ open, onClose, categories }: { open: boolean; onClose: () => void; categories: MegaCategory[] }) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const Arrow = ar ? ArrowLeft : ArrowRight;
  if (!open) return null;

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
            <span className="dg-all-categories-label">{ar ? 'كل الأقسام' : 'All categories'}</span> <ArrowRight aria-hidden="true" style={ar ? { display: 'none' } : undefined} /><ArrowLeft aria-hidden="true" style={ar ? undefined : { display: 'none' }} />
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
