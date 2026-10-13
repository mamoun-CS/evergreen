import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import Link from 'next/link';
import { Pencil, Search } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ProductsSEOPage() {
  await requireAdmin();
  const products = await prisma.product.findMany({ 
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { id: true, slug: true, nameAr: true, nameEn: true, metaTitleAr: true, metaTitleEn: true, metaDescAr: true, metaDescEn: true, ogImage: true, isAvailable: true, images: true }
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">SEO - المنتجات</h1>
        <p className="mt-1 text-sm text-slate-500">إدارة السيو للمنتجات (أحدث 200 منتج).</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">الاسم (عربي)</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">المسار (Slug)</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">Meta Title (ع)</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">Meta Desc (ع)</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">OG Image</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">الحالة</th>
              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">إجراءات</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-3 py-4 text-sm font-bold text-slate-900 max-w-xs truncate">{product.nameAr}</td>
                <td className="px-3 py-4 text-sm text-slate-500 font-mono dir-ltr max-w-xs truncate">{product.slug}</td>
                <td className="px-3 py-4 text-sm text-slate-500 max-w-xs truncate">{product.metaTitleAr || '<span class="text-slate-300">—</span>'}</td>
                <td className="px-3 py-4 text-sm text-slate-500 max-w-xs truncate">{product.metaDescAr || '<span class="text-slate-300">—</span>'}</td>
                <td className="px-3 py-4 text-sm text-slate-500 dir-ltr max-w-xs truncate">{product.ogImage || '—'}</td>
                <td className="px-3 py-4 text-sm">{product.isAvailable ? <span className="text-emerald-600 font-bold">متاح</span> : 'غير متاح'}</td>
                <td className="relative py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6">
                  <Link href={`/admin/content/seo/products/${product.id}`} className="text-emerald-600 hover:text-emerald-900"><Pencil className="h-4 w-4" /></Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && <div className="py-10 text-center text-slate-500">لا توجد منتجات.</div>}
      </div>
    </div>
  );
}