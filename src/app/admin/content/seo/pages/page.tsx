import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import Link from 'next/link';
import { Pencil, Globe } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PagesSEOPage() {
  await requireAdmin();
  const pages = await prisma.pageContent.findMany({ orderBy: { slug: 'asc' } });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">SEO - الصفحات</h1>
          <p className="mt-1 text-sm text-slate-500">إدارة السيو للصفحات الثابتة.</p>
        </div>
        <Link href="/admin/content/seo/pages/new" className="mt-4 sm:mt-0 inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-900">
          <Globe className="h-4 w-4" /> إضافة صفحة
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">المسار (Slug)</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">العنوان (عربي)</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">Meta Title (ع)</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">Meta Desc (ع)</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">OG Image</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">الحالة</th>
              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">إجراءات</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {pages.map((page) => (
              <tr key={page.id}>
                <td className="px-3 py-4 text-sm font-mono text-slate-700 dir-ltr">{page.slug}</td>
                <td className="px-3 py-4 text-sm font-bold text-slate-900 max-w-xs truncate">{page.titleAr}</td>
                <td className="px-3 py-4 text-sm text-slate-500 max-w-xs truncate">{page.metaTitleAr || '<span class="text-slate-300">—</span>'}</td>
                <td className="px-3 py-4 text-sm text-slate-500 max-w-xs truncate">{page.metaDescAr || '<span class="text-slate-300">—</span>'}</td>
                <td className="px-3 py-4 text-sm text-slate-500 dir-ltr max-w-xs truncate">{page.ogImage || '—'}</td>
                <td className="px-3 py-4 text-sm">{page.isActive ? <span className="text-emerald-600 font-bold">نشط</span> : 'معطل'}</td>
                <td className="relative py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6">
                  <Link href={`/admin/content/seo/pages/${page.id}`} className="text-emerald-600 hover:text-emerald-900"><Pencil className="h-4 w-4" /></Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages.length === 0 && <div className="py-10 text-center text-slate-500">لا توجد صفحات.</div>}
      </div>
    </div>
  );
}