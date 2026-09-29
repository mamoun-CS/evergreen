import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import Link from 'next/link';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { deleteBanner } from '../../actions/cms-actions';

export const dynamic = 'force-dynamic';

export default async function BannersPage() {
  await requireAdmin();
  const banners = await prisma.banner.findMany({ orderBy: { order: 'asc' } });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">البنرات الإعلانية</h1>
          <p className="mt-2 text-sm text-slate-700">إدارة البنرات والعروض الترويجية.</p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link href="/admin/content/banners/new" className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-900">
            <Plus className="h-4 w-4" /> إضافة بنر
          </Link>
        </div>
      </div>
      
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-right text-sm font-semibold">الصورة</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">العنوان (عربي)</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">العنوان (إنجليزي)</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">الترتيب</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">الحالة</th>
              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">إجراءات</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {banners.map((b) => (
              <tr key={b.id}>
                <td className="py-4 pl-4 pr-3 text-sm sm:pl-6"><img src={b.imageUrl} className="h-12 w-24 object-cover rounded" alt="" /></td>
                <td className="px-3 py-4 text-sm font-bold text-slate-900">{b.titleAr || '-'}</td>
                <td className="px-3 py-4 text-sm text-slate-500">{b.titleEn || '-'}</td>
                <td className="px-3 py-4 text-sm text-slate-500">{b.order}</td>
                <td className="px-3 py-4 text-sm text-slate-500">{b.isActive ? <span className="text-emerald-600 font-bold">نشط</span> : 'معطل'}</td>
                <td className="relative py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6">
                  <div className="flex justify-end gap-3">
                    <Link href={`/admin/content/banners/${b.id}`} className="text-emerald-600 hover:text-emerald-900"><Pencil className="h-4 w-4" /></Link>
                    <form action={async () => { 'use server'; await deleteBanner(b.id); }}>
                      <button type="submit" className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {banners.length === 0 && <div className="py-10 text-center text-slate-500">لا توجد بنرات.</div>}
      </div>
    </div>
  );
}
