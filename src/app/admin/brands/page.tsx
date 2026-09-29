import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { deleteBrand } from '../actions/brand-actions';

export const dynamic = 'force-dynamic';

export default async function BrandsPage() {
  await requireAdmin();
  const brands = await prisma.brand.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">العلامات التجارية</h1>
          <p className="mt-2 text-sm text-slate-700">إدارة العلامات التجارية للشركات المصنعة.</p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link href="/admin/brands/new" className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">
            <Plus className="h-4 w-4" /> إضافة علامة تجارية
          </Link>
        </div>
      </div>
      
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-right text-sm font-semibold text-slate-900 sm:pl-6">الاسم</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">الوصف</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">عدد المنتجات</th>
              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">إجراءات</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {brands.map((brand) => (
              <tr key={brand.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6">{brand.name}</td>
                <td className="px-3 py-4 text-sm text-slate-500 max-w-xs truncate">{brand.description || '-'}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{brand._count.products}</td>
                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6">
                  <div className="flex items-center justify-end gap-3">
                    <Link href={`/admin/brands/${brand.id}`} className="text-emerald-600 hover:text-emerald-900"><Pencil className="h-4 w-4" /></Link>
                    {brand._count.products === 0 && (
                      <form action={async () => { 'use server'; await deleteBrand(brand.id); }}>
                        <button type="submit" className="text-red-600 hover:text-red-900"><Trash2 className="h-4 w-4" /></button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {brands.length === 0 && <div className="py-10 text-center text-sm text-slate-500">لا توجد علامات تجارية.</div>}
      </div>
    </div>
  );
}
