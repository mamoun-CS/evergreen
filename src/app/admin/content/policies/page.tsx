import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import Link from 'next/link';
import { Plus, Pencil, Eye } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminPoliciesPage() {
  await requireAdmin();
  const policies = await prisma.storePolicy.findMany({ orderBy: { updatedAt: 'desc' } });

  const defaultSlugs = ['privacy', 'terms', 'shipping', 'refunds'];
  const missingSlugs = defaultSlugs.filter(s => !policies.some(p => p.slug === s));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">سياسات المتجر</h1>
          <p className="mt-2 text-sm text-slate-700">إدارة صفحات الخصوصية، الشروط، الشحن والاسترجاع.</p>
        </div>
        <div className="mt-4 flex gap-2 sm:ml-16 sm:mt-0 sm:flex-none">
          {missingSlugs.map(slug => (
            <Link key={slug} href={`/admin/content/policies/${slug}`} className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-900">
              <Plus className="h-4 w-4" /> إضافة {slug}
            </Link>
          ))}
          {missingSlugs.length === 0 && (
            <Link href="/admin/content/policies/new" className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-900">
              <Plus className="h-4 w-4" /> إضافة سياسة أخرى
            </Link>
          )}
        </div>
      </div>
      
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">المعرف (Slug)</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">العنوان</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">الحالة</th>
              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">إجراءات</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {policies.map((p) => (
              <tr key={p.id}>
                <td className="px-3 py-4 text-sm font-bold text-slate-900 dir-ltr text-right">{p.slug}</td>
                <td className="px-3 py-4 text-sm font-bold text-slate-900">{p.titleAr}</td>
                <td className="px-3 py-4 text-sm text-slate-500">{p.isActive ? <span className="text-emerald-600 font-bold">نشط</span> : 'معطل'}</td>
                <td className="relative py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6">
                  <div className="flex justify-end gap-3">
                    <Link href={`/policies/${p.slug}`} target="_blank" className="text-blue-600 hover:text-blue-900"><Eye className="h-4 w-4" /></Link>
                    <Link href={`/admin/content/policies/${p.slug}`} className="text-emerald-600 hover:text-emerald-900"><Pencil className="h-4 w-4" /></Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {policies.length === 0 && <div className="py-10 text-center text-slate-500">لا توجد سياسات.</div>}
      </div>
    </div>
  );
}
