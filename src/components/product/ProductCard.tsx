'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '../layout/LanguageContext';
import { useCart } from '../cart/CartContext';
import { ShoppingCart, CheckCircle, Heart } from 'lucide-react';
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
    variants?: Array<{id:string; titleEn:string; titleAr:string; price?:number|null; stock:number}>;
    seriesModel?: string | null;
    ratingAvg?: number | null;
    ratingCount?: number;
  };
}

export default function ProductCard({ product, variant }: ProductCardProps) {
  const { lang, t } = useLanguage();
  const { addToCart } = useCart();
  const wishlist = useWishlist();
  const compare = useCompare();

  const title = lang === 'ar' ? product.nameAr : product.nameEn;
  let image = product.images?.[0] || '/images/logo.jpg';
  if (image.startsWith('/uploads/products/evg-product-')) {
    image = image.replace('/uploads/products/', '/products/');
  }
  const inStock = product.isAvailable !== false && (product.stockQuantity === undefined || product.stockQuantity > 0);
  const purchasable = product.purchaseMode === 'PURCHASABLE' && inStock && Boolean(product.discountPrice ?? product.basePrice);
  const wishlistProduct: WishlistProduct = { id: product.id, slug: product.slug, nameEn: product.nameEn, nameAr: product.nameAr, images: product.images || [], basePrice: product.basePrice ?? null, discountPrice: product.discountPrice ?? null, currency: product.currency || 'ILS', purchaseMode: product.purchaseMode, stockQuantity: product.stockQuantity || 0, isAvailable: product.isAvailable !== false };
  const wishlisted = wishlist.has(product.id);

  const handleAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const unitPrice = product.discountPrice ?? product.basePrice;
    if (purchasable && unitPrice && !product.variants?.length) {
      addToCart({
        id: product.id,
        slug: product.slug,
        nameEn: product.nameEn,
        nameAr: product.nameAr,
        image,
        price: Number(unitPrice),
      });
    }
  };

  if (variant === 'featured') {
    return <article className="eg-product-card group relative">
      <button type="button" onClick={() => void wishlist.toggle(wishlistProduct)} aria-label={wishlisted ? (lang === 'ar' ? 'إزالة من قائمة الرغبات' : 'Remove from wishlist') : (lang === 'ar' ? 'إضافة إلى قائمة الرغبات' : 'Add to wishlist')} className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-2 text-brand-dark shadow"><Heart className="h-4 w-4" fill={wishlisted ? 'currentColor' : 'none'} /></button>
      <button type="button" onClick={() => compare.toggle({ slug: product.slug, nameAr: product.nameAr, nameEn: product.nameEn, image })} aria-label={compare.items.some((item) => item.slug === product.slug) ? (lang === 'ar' ? 'إزالة من المقارنة' : 'Remove from comparison') : (lang === 'ar' ? 'إضافة إلى المقارنة' : 'Add to comparison')} className="absolute bottom-2 right-2 z-10 rounded-full bg-white/90 p-2 text-brand-dark shadow"><ArrowLeftRight className="h-4 w-4" /></button>
      <Link href={`/products/${product.slug}`} className="eg-agri-product-image relative">
        <Image src={image} alt={title} fill sizes="(max-width: 760px) 100vw, 220px" className="object-contain p-3 transition-transform duration-300 group-hover:scale-105" />
      </Link>
      <div className="eg-product-body"><Link href={`/products/${product.slug}`}><h3>{title}</h3></Link><div className="eg-product-meta">{product.basePrice ? <b>{Number(product.discountPrice ?? product.basePrice).toLocaleString()} {product.currency || (lang === 'ar' ? '₪' : 'ILS')}</b> : <span>{product.purchaseMode === 'PURCHASABLE' ? (lang === 'ar' ? 'السعر عند الطلب' : 'Price on request') : t.product.priceOnRequest}</span>}{product.purchaseMode === 'PURCHASABLE' ? <button onClick={handleAction} disabled={!inStock} aria-label={lang === 'ar' ? 'أضف للسلة' : 'Add to cart'}><ShoppingCart /></button> : <Link href={`/contact?product=${encodeURIComponent(product.slug)}`} aria-label={t.product.contactUsForPrice}>{t.product.contactUsForPrice}</Link>}</div></div>
    </article>;
  }

  return (
    <div className={`${variant === 'featured' ? 'eg-product-card' : 'bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md'} transition-all duration-200 flex flex-col group relative`}>
      <button type="button" onClick={() => void wishlist.toggle(wishlistProduct)} aria-label={wishlisted ? (lang === 'ar' ? 'إزالة من قائمة الرغبات' : 'Remove from wishlist') : (lang === 'ar' ? 'إضافة إلى قائمة الرغبات' : 'Add to wishlist')} className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-2 text-brand-dark shadow"><Heart className="h-4 w-4" fill={wishlisted ? 'currentColor' : 'none'} /></button>
      <button type="button" onClick={() => compare.toggle({ slug: product.slug, nameAr: product.nameAr, nameEn: product.nameEn, image })} aria-label={compare.items.some((item) => item.slug === product.slug) ? (lang === 'ar' ? 'إزالة من المقارنة' : 'Remove from comparison') : (lang === 'ar' ? 'إضافة إلى المقارنة' : 'Add to comparison')} className="absolute bottom-2 right-2 z-10 rounded-full bg-white/90 p-2 text-brand-dark shadow"><ArrowLeftRight className="h-4 w-4" /></button>
      {/* Image Container */}
      <Link href={`/products/${product.slug}`} className="block relative aspect-square bg-gray-50 border-b border-gray-100 overflow-hidden p-4">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
        />

        {/* Brand Badge */}
        {product.brand && (
          <span className="absolute top-2 right-2 bg-brand-dark text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
            {product.brand.name}
          </span>
        )}

        {/* SKU Badge */}
        {product.sku && (
          <span className="absolute bottom-2 left-2 bg-gray-900/80 text-gray-200 text-[9px] font-mono px-1.5 py-0.5 rounded">
            {product.sku}
          </span>
        )}
      </Link>

      {/* Content */}
      <div className={`${variant === 'featured' ? 'eg-product-body' : 'p-4'} flex-1 flex flex-col justify-between space-y-3`}>
        <div>
          {product.seriesModel && (
            <span className="text-[10px] font-semibold text-brand-muted block mb-1">
              {product.seriesModel}
            </span>
          )}
          <Link href={`/products/${product.slug}`}>
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 hover:text-brand-navy transition-colors">
              {title}
            </h3>
          </Link>
          {!!product.ratingCount && <p className="mt-1 text-[11px] text-amber-700" aria-label={`${Number(product.ratingAvg || 0).toFixed(1)} stars, ${product.ratingCount} reviews`}>★ {Number(product.ratingAvg || 0).toFixed(1)} <span className="text-gray-500">({product.ratingCount})</span></p>}
        </div>

        {/* Availability & Warranty */}
        <div className="flex items-center justify-between text-[11px] text-gray-500 border-t border-gray-100 pt-2">
          <span className={`flex items-center gap-1 font-medium ${inStock ? 'text-emerald-700' : 'text-red-700'}`}>
            {inStock && <CheckCircle className="w-3 h-3" />}
            {product.purchaseMode !== 'PURCHASABLE' ? t.product.priceOnRequest : inStock ? t.product.inStock : t.product.outOfStock}
          </span>
          {(lang === 'ar' ? product.warrantyInfoAr : product.warrantyInfoEn) && <span className="text-slate-500">{t.product.warranty}: {lang === 'ar' ? product.warrantyInfoAr : product.warrantyInfoEn}</span>}
        </div>

        {/* Pricing / Mode Badge & Button */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
          <div>
            {product.purchaseMode === 'PURCHASABLE' && product.basePrice ? (
              <div>
                <span className="text-xs text-gray-400 block">{t.product.price}</span>
                <span className="text-sm font-extrabold text-brand-navy">
                  {Number(product.discountPrice ?? product.basePrice).toLocaleString()} {product.currency || 'ILS'}
                </span>
                {product.discountPrice && <span className="ms-1 text-[10px] text-gray-400 line-through">{Number(product.basePrice).toLocaleString()}</span>}
              </div>
            ) : (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded inline-block">
                  {t.product.priceOnRequest}
                </span>
              </div>
            )}
          </div>

            {product.purchaseMode === 'PURCHASABLE' ? <button
            onClick={handleAction}
              disabled={product.purchaseMode === 'PURCHASABLE' && (!inStock || !product.basePrice && !product.discountPrice)}
              aria-label={product.purchaseMode === 'PURCHASABLE' && !inStock ? t.product.outOfStock : undefined}
            className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
              product.purchaseMode === 'PURCHASABLE' && inStock
                ? 'bg-brand-navy text-white hover:bg-slate-800'
                : 'bg-brand-dark text-white hover:bg-brand-hover'
            }`}
          >
            {product.purchaseMode === 'PURCHASABLE' && inStock ? (
              <>
                <ShoppingCart className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.product.addToCart}</span>
              </>
            ) : <span>{t.product.outOfStock}</span>}
            </button> : <Link href={`/contact?product=${encodeURIComponent(product.slug)}`} className="px-3 py-2 rounded-lg text-xs font-bold bg-brand-dark text-white hover:bg-brand-hover transition-all shadow-sm">{t.product.contactUsForPrice}</Link>}
        </div>
      </div>
    </div>
  );
}
