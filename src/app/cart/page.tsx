'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { cartKey, useCart } from '@/components/cart/CartContext';
import { useLanguage } from '@/components/layout/LanguageContext';

export default function CartPage() {
  const { cart, removeFromCart, updateCartQuantity } = useCart();
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const money = (value: number) => `${value.toLocaleString()} ILS`;

  return <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12" dir={ar ? 'rtl' : 'ltr'}>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-5">
      <div><h1 className="text-2xl font-extrabold text-slate-900">{ar ? 'سلة التسوق' : 'Shopping cart'}</h1><p className="mt-1 text-sm text-slate-600">{ar ? 'راجع منتجاتك قبل الانتقال إلى الدفع.' : 'Review your products before checkout.'}</p></div>
      <span className="text-sm font-semibold text-slate-600">{ar ? `${cart.length} منتجات` : `${cart.length} items`}</span>
    </div>
    {!cart.length ? <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center"><ShoppingBag className="mx-auto h-12 w-12 text-slate-300" aria-hidden="true" /><h2 className="mt-4 text-lg font-bold text-slate-900">{ar ? 'سلتك فارغة' : 'Your cart is empty'}</h2><Link href="/shop" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-brand-navy px-5 text-sm font-bold text-white">{ar ? 'متابعة التسوق' : 'Continue shopping'}</Link></section> : <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {cart.map((item) => <article key={cartKey(item)} className="flex gap-3 border-b border-slate-100 p-4 last:border-0 sm:gap-5 sm:p-5">
          <Link href={`/products/${item.slug}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:h-24 sm:w-24"><Image src={item.image || '/images/logo.jpg'} alt={ar ? item.nameAr : item.nameEn} fill sizes="96px" className="object-contain p-1" /></Link>
          <div className="min-w-0 flex-1"><Link href={`/products/${item.slug}`} className="font-bold text-slate-900 hover:text-emerald-800">{ar ? item.nameAr : item.nameEn}</Link>{(item.variantTitleAr || item.variantTitleEn) && <p className="mt-1 text-xs text-slate-500">{ar ? item.variantTitleAr : item.variantTitleEn}</p>}<p className="mt-2 text-sm font-bold text-brand-navy">{money(item.price)}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div className="inline-flex min-h-11 items-center rounded-lg border border-slate-300"><button aria-label={ar ? 'تقليل الكمية' : 'Decrease quantity'} onClick={() => updateCartQuantity(cartKey(item), item.quantity - 1)} className="grid h-10 w-10 place-items-center hover:bg-slate-50"><Minus className="h-4 w-4" /></button><span className="w-9 text-center text-sm font-bold" aria-live="polite">{item.quantity}</span><button aria-label={ar ? 'زيادة الكمية' : 'Increase quantity'} onClick={() => updateCartQuantity(cartKey(item), item.quantity + 1)} className="grid h-10 w-10 place-items-center hover:bg-slate-50"><Plus className="h-4 w-4" /></button></div><p className="font-bold text-slate-900">{money(item.price * item.quantity)}</p></div>
          </div><button onClick={() => removeFromCart(item.id, item.variantId)} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700" aria-label={ar ? `إزالة ${item.nameAr}` : `Remove ${item.nameEn}`}><Trash2 className="h-5 w-5" /></button>
        </article>)}
      </section>
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6"><h2 className="text-lg font-bold text-slate-900">{ar ? 'ملخص الطلب' : 'Order summary'}</h2><div className="mt-5 flex items-center justify-between border-y border-slate-100 py-4 text-sm"><span className="text-slate-600">{ar ? 'المجموع الفرعي' : 'Subtotal'}</span><span className="font-bold text-slate-900">{money(subtotal)}</span></div><div className="mt-4 flex items-center justify-between text-base font-extrabold"><span>{ar ? 'الإجمالي' : 'Total'}</span><span className="text-brand-navy">{money(subtotal)}</span></div><p className="mt-2 text-xs leading-5 text-slate-500">{ar ? 'تُحسب تكلفة التوصيل في الخطوة التالية.' : 'Delivery is calculated at checkout.'}</p><Link href="/checkout" className="mt-5 flex min-h-12 items-center justify-center rounded-lg bg-brand-navy px-4 text-sm font-bold text-white hover:bg-slate-800">{ar ? 'المتابعة إلى الدفع' : 'Proceed to checkout'}</Link><Link href="/shop" className="mt-3 flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">{ar ? 'متابعة التسوق' : 'Continue shopping'}</Link></aside>
    </div>}
  </main>;
}
