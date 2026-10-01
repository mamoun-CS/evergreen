'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCompare } from './CompareContext';
import { useLanguage } from '@/components/layout/LanguageContext';

interface ComparedProduct {
  id: string; slug: string; nameAr: string; nameEn: string; images: string[]; basePrice: number | string | null; discountPrice: number | string | null; currency: string; purchaseMode: string; stockQuantity: number;
  brand: { name: string } | null; categories: Array<{ nameAr: string; nameEn: string }>; specifications: Array<{ keyAr: string; keyEn: string; valueAr: string; valueEn: string }>;
}
export default function ComparePage() {
  const { items, remove, clear } = useCompare();
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const [products, setProducts] = useState<ComparedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!items.length) { setProducts([]); return; }
    setLoading(true); setError('');
    fetch(`/api/products/compare?slugs=${items.map((item) => encodeURIComponent(item.slug)).join(',')}`, { cache: 'no-store' })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setProducts(data.products); })
      .catch(() => setError(ar ? 'تعذر تحميل بيانات المقارنة.' : 'Could not load comparison data.'))
      .finally(() => setLoading(false));
  }, [items, ar]);

  const specNames = useMemo(() => {
    const names = new Set<string>();
    products.forEach((product) => product.specifications.forEach((spec) => names.add(ar ? spec.keyAr : spec.keyEn)));
    return [...names];
  }, [products, ar]);
  const valueFor = (product: ComparedProduct, key: string) => { const spec = product.specifications.find((entry) => (ar ? entry.keyAr : entry.keyEn) === key); return spec ? (ar ? spec.valueAr : spec.valueEn) : '—'; };
  const rowDiffers = (key: string) => new Set(products.map((product) => valueFor(product, key))).size > 1;
  const label = (arText: string, enText: string) => ar ? arText : enText;

  return <main dir={ar ? 'rtl' : 'ltr'} className="mx-auto max-w-7xl space-y-5 px-4 py-8">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-extrabold">{label('مقارنة المنتجات','Compare products')}</h1><p className="mt-1 text-sm text-slate-600">{label('قارن المواصفات والأسعار جنباً إلى جنب.','Compare prices and specifications side by side.')}</p></div>{items.length > 0 && <button onClick={clear} className="rounded-lg border px-3 py-2 text-sm font-bold">{label('مسح الكل','Clear all')}</button>}</header>
    {!items.length ? <section className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><p>{label('لم تختر منتجات للمقارنة بعد.','No products selected for comparison yet.')}</p><Link href="/shop" className="mt-4 inline-block rounded-lg bg-emerald-800 px-4 py-2 text-sm font-bold text-white">{label('تصفح المتجر','Browse shop')}</Link></section> : loading ? <p role="status">{label('جارٍ التحميل...','Loading...')}</p> : error ? <p role="alert" className="text-red-700">{error}</p> : <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="min-w-[680px] border-collapse text-sm"><thead><tr><th className="sticky start-0 z-10 min-w-40 bg-slate-50 p-3 text-start">{label('المنتج','Product')}</th>{products.map((product) => <th key={product.id} className="min-w-52 p-4 align-top"><div className="flex justify-end"><button onClick={() => remove(product.slug)} className="rounded border px-2 py-1 text-xs">{label('إزالة','Remove')}</button></div><Link href={`/products/${product.slug}`} className="block"><span className="relative mx-auto mt-2 block h-32 w-full"><Image src={product.images[0] || '/images/logo.jpg'} alt={ar ? product.nameAr : product.nameEn} fill sizes="208px" className="object-contain" /></span><span className="mt-2 block font-bold">{ar ? product.nameAr : product.nameEn}</span></Link></th>)}</tr></thead><tbody>
      {[[label('الماركة','Brand'), (product: ComparedProduct) => product.brand?.name || '—'], [label('القسم','Category'), (product: ComparedProduct) => product.categories.map((category) => ar ? category.nameAr : category.nameEn).join(', ') || '—'], [label('السعر','Price'), (product: ComparedProduct) => product.purchaseMode === 'PURCHASABLE' ? `${Number((product.discountPrice ?? product.basePrice) || 0).toLocaleString()} ${product.currency}` : label('السعر عند الطلب','Price on request')], [label('التوفر','Availability'), (product: ComparedProduct) => product.stockQuantity > 0 ? label('متوفر','In stock') : label('غير متوفر','Out of stock')]].map(([name, render] : any) => <tr key={name} className="border-t border-slate-100"><th className="sticky start-0 bg-slate-50 p-3 text-start">{name}</th>{products.map((product) => <td key={product.id} className="p-3 text-center">{render(product)}</td>)}</tr>)}
      {specNames.map((name) => <tr key={name} className={`border-t border-slate-100 ${rowDiffers(name) ? 'bg-amber-50' : ''}`}><th className="sticky start-0 bg-inherit p-3 text-start">{name}</th>{products.map((product) => <td key={product.id} className="p-3 text-center">{valueFor(product, name)}</td>)}</tr>)}
    </tbody></table></div>}
  </main>;
}
