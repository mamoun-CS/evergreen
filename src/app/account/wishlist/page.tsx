'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/components/cart/CartContext';
import { useWishlist } from '@/components/wishlist/WishlistContext';
import { useLanguage } from '@/components/layout/LanguageContext';

export default function WishlistPage() {
  const { lang } = useLanguage();
  const { products, toggle } = useWishlist();
  const { addToCart } = useCart();
  const ar = lang === 'ar';
  return <section className="space-y-5" dir={ar ? 'rtl' : 'ltr'}>
    <header><h1 className="text-2xl font-extrabold">{ar ? 'قائمة الرغبات' : 'Wishlist'}</h1><p className="mt-1 text-sm text-slate-600">{ar ? 'المنتجات التي حفظتها للرجوع إليها.' : 'Products you saved for later.'}</p></header>
    {!products.length ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">{ar ? 'قائمة الرغبات فارغة.' : 'Your wishlist is empty.'}<Link href="/shop" className="ms-2 font-bold text-emerald-800 underline">{ar ? 'تصفح المتجر' : 'Browse the shop'}</Link></div> : <div className="grid gap-3 sm:grid-cols-2">{products.map((product) => <article key={product.id} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <Link href={`/products/${product.slug}`} className="relative h-24 w-24 shrink-0"><Image src={product.images[0] || '/images/logo.jpg'} alt={ar ? product.nameAr : product.nameEn} fill sizes="96px" className="object-contain" /></Link>
      <div className="min-w-0 flex-1"><Link href={`/products/${product.slug}`} className="font-bold text-slate-900">{ar ? product.nameAr : product.nameEn}</Link><p className="mt-1 text-sm text-slate-600">{product.purchaseMode === 'PURCHASABLE' && (product.discountPrice ?? product.basePrice) != null ? `${(product.discountPrice ?? product.basePrice)?.toLocaleString()} ${product.currency}` : (ar ? 'السعر عند الطلب' : 'Price on request')}</p>
        <div className="mt-3 flex flex-wrap gap-2">{product.purchaseMode === 'PURCHASABLE' && product.isAvailable && product.stockQuantity > 0 && (product.discountPrice ?? product.basePrice) != null && <button onClick={() => addToCart({ id: product.id, slug: product.slug, nameAr: product.nameAr, nameEn: product.nameEn, image: product.images[0] || '/images/logo.jpg', price: product.discountPrice ?? product.basePrice ?? 0 })} className="rounded-lg bg-emerald-800 px-3 py-2 text-xs font-bold text-white">{ar ? 'أضف للسلة' : 'Add to cart'}</button>}
          <button onClick={() => void toggle(product)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold">{ar ? 'إزالة' : 'Remove'}</button></div>
      </div>
    </article>)}</div>}
  </section>;
}
