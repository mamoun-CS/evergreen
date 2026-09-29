import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { Plus, Pencil, Eye, Check, X } from 'lucide-react';
import Link from 'next/link';
import { PurchaseMode } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  await requireAdmin();
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { variants: true } } }
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">المنتجات</h1>
          <p className="mt-2 text-sm text-slate-700">إدارة كتالوج المنتجات، الأسعار، والمخزون.</p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link href="/admin/products/new" className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">
            <Plus className="h-4 w-4" /> إضافة منتج جديد
          </Link>
        </div>
      </div>
      
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-right text-sm font-semibold text-slate-900 sm:pl-6">المنتج</th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">وضع الشراء</th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">السعر</th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">المخزون</th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">متاح</th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">مميز</th>
                <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">إجراءات</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                    <div className="flex items-center">
                      {product.images[0] && (
                        <div className="h-10 w-10 flex-shrink-0 ml-3">
                          <img className="h-10 w-10 rounded object-cover" src={product.images[0]} alt="" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-slate-900">{product.nameAr}</div>
                        <div className="text-slate-500">{product.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{product.purchaseMode}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900">
                    {product.purchaseMode === PurchaseMode.PURCHASABLE ? (
                      <span className="font-semibold">{Number(product.discountPrice || product.basePrice || 0).toLocaleString()} {product.currency}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                    {product.stockQuantity} {product._count.variants > 0 && `(+${product._count.variants} متغيرات)`}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                    {product.isAvailable ? <Check className="h-5 w-5 text-emerald-600" /> : <X className="h-5 w-5 text-slate-400" />}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                    {product.isFeatured ? <Check className="h-5 w-5 text-emerald-600" /> : <X className="h-5 w-5 text-slate-400" />}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/products/${product.slug}`} target="_blank" className="text-slate-400 hover:text-slate-600"><Eye className="h-4 w-4" /></Link>
                      <Link href={`/admin/products/${product.id}`} className="text-emerald-600 hover:text-emerald-900"><Pencil className="h-4 w-4" /></Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {products.length === 0 && <div className="py-10 text-center text-sm text-slate-500">لا توجد منتجات.</div>}
      </div>
    </div>
  );
}
