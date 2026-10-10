'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '../layout/LanguageContext';
import { Heart } from 'lucide-react';
import { useWishlist, WishlistProduct } from '@/components/wishlist/WishlistContext';
import { ArrowLeftRight } from 'lucide-react';
import { useCompare } from '@/components/compare/CompareContext';

interface ProductCardProps {
  variant?: 'featured';
  product: {
    id: string;
    slug: string;
    sku?: string | null;
    nameEn: string;
    nameAr: string;
    purchaseMode: 'PURCHASABLE' | 'CONTACT_FOR_PRICE';
    basePrice?: number | null;
    discountPrice?: number | null;
    currency?: string;
    images: string[];
    brand?: { name: string } | null;
    isAvailable?: boolean;
    stockQuantity?: number;
    warrantyInfoEn?: string | null;
    warrantyInfoAr?: string | null;
    variants?: Array<{ id: string; titleEn: string; titleAr: string; price?: number | null; stock: number }>;
    ratingAvg?: number | null;
    ratingCount?: number;
  };
}

export default function ProductCard({ product, variant }: ProductCardProps) {
  const { lang } = useLanguage();
  const wishlist = useWishlist();
  const compare = useCompare();
  const ar = lang === 'ar';

  const title = ar ? product.nameAr : product.nameEn;
  let image = product.images?.[0] || '/images/logo.jpg';
  if (image.startsWith('/uploads/products/evg-product-')) {
    image = image.replace('/uploads/products/', '/products/');
  }
  const inStock = product.isAvailable !== false && (product.stockQuantity === undefined || product.stockQuantity > 0);
  const unitPrice = product.discountPrice ?? product.basePrice;
  const showPrice = product.purchaseMode === 'PURCHASABLE' && Boolean(unitPrice);
  const currencyGlyph = !product.currency || product.currency === 'ILS' ? '\u20AA' : product.currency === 'USD' ? '$' : product.currency;
  const productHref = `/products/${product.slug}`;

  const wishlistProduct: WishlistProduct = { id: product.id, slug: product.slug, nameEn: product.nameEn, nameAr: product.nameAr, images: product.images || [], basePrice: product.basePrice ?? null, discountPrice: product.discountPrice ?? null, currency: product.currency || 'ILS', purchaseMode: product.purchaseMode, stockQuantity: product.stockQuantity || 0, isAvailable: product.isAvailable !== false };
  const wishlisted = wishlist.has(product.id);

  const wishLabel = wishlisted ? (ar ? 'إزالة من قائمة الرغبات' : 'Remove from wishlist') : (ar ? 'إضافة إلى قائمة الرغبات' : 'Add to wishlist');
  const compareLabel = compare.items.some((item) => item.slug === product.slug) ? (ar ? 'إزالة من المقارنة' : 'Remove from comparison') : (ar ? 'إضافة إلى المقارنة' : 'Add to comparison');
  const overlayButtons = (
    <>
      <button type="button" onClick={() => void wishlist.toggle(wishlistProduct)} aria-label={wishLabel} className="absolute end-2 top-2 z-10 rounded-full bg-white/90 p-2 text-brand-dark shadow"><Heart className="h-4 w-4" fill={wishlisted ? 'currentColor' : 'none'} /></button>
      <button type="button" onClick={() => compare.toggle({ slug: product.slug, nameAr: product.nameAr, nameEn: product.nameEn, image })} aria-label={compareLabel} className="absolute end-2 bottom-2 z-10 rounded-full bg-white/90 p-2 text-brand-dark shadow"><ArrowLeftRight className="h-4 w-4" /></button>
    </>
  );

  const priceRow = (
    <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
      {showPrice ? (
        <span className="flex items-baseline gap-1.5">
          <b className="font-mono text-[15px] font-extrabold text-brand-dark">{Number(unitPrice).toLocaleString()}</b>
          <span className="text-[11px] font-bold text-gray-500">{currencyGlyph}</span>
          {product.discountPrice && product.basePrice && Number(product.discountPrice) < Number(product.basePrice) && (
            <s className="text-[11px] text-gray-400">{Number(product.basePrice).toLocaleString()}</s>
          )}
        </span>
      ) : (
        <span className="rounded-full bg-brand-gold/15 px-2.5 py-1 text-[10.5px] font-extrabold text-amber-800">{ar ? 'السعر عند الطلب' : 'Price on request'}</span>
      )}
    </div>
  );

  if (variant === 'featured') {
    return <article className="eg-product-card group">
      <div className="eg-agri-product-image">
        {overlayButtons}
        <Link href={productHref} className="absolute inset-0">
          <Image src={image} alt={title} fill sizes="(max-width: 760px) 50vw, 220px" quality={90} className="object-contain p-3 transition-transform duration-300 group-hover:scale-105" />
        </Link>
      </div>
      <div className="eg-product-body">
        <Link href={productHref}><h3>{title}</h3></Link>
        {showPrice && <span className="font-mono text-sm font-extrabold text-brand-dark">{Number(unitPrice).toLocaleString()} {currencyGlyph}</span>}
        <div className="mt-2 pt-2 border-t border-gray-100 text-center">
          <Link href={productHref} className="text-sm font-bold text-brand-dark hover:text-brand-hover">
            {ar ? 'مزيد من المعلومات' : 'More information'}
          </Link>
        </div>
      </div>
    </article>;
  }

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift group">
      <div className="relative aspect-square overflow-hidden border-b border-gray-100 bg-gray-50">
        {overlayButtons}
        <Link href={productHref} className="absolute inset-0 block p-4" aria-label={title}>
          <Image
            src={image}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
            quality={90}
            className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
          />
          {product.brand && (
            <span className="absolute top-2 start-2 rounded bg-brand-dark/90 px-2 py-0.5 text-[10px] font-bold text-white shadow">
              {product.brand.name}
            </span>
          )}
          {product.sku && (
            <span className="absolute bottom-2 left-2 rounded bg-gray-900/85 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-gray-200">
              {product.sku}
            </span>
          )}
        </Link>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div>
          <Link href={productHref}>
            <h3 className="line-clamp-2 text-xs sm:text-sm font-bold text-gray-900 transition-colors hover:text-brand-navy" lang={ar ? 'ar' : 'en'}>
              {title}
            </h3>
          </Link>
          {!!product.ratingCount && <p className="mt-1 text-[11px] text-amber-700" aria-label={`${Number(product.ratingAvg || 0).toFixed(1)} stars, ${product.ratingCount} reviews`}>★ {Number(product.ratingAvg || 0).toFixed(1)} <span className="text-gray-500">({product.ratingCount})</span></p>}
          {!inStock && <p className="mt-1 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">{ar ? 'غير متوفر حالياً' : 'Currently unavailable'}</p>}
        </div>

        <div className="mt-auto border-t border-gray-100 pt-3">
          {priceRow}
          <Link
            href={productHref}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand-dark px-4 text-center text-sm font-bold text-white transition-colors hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
          >
            {ar ? 'مزيد من المعلومات' : 'More information'}
          </Link>
        </div>
      </div>
    </article>
  );
}
