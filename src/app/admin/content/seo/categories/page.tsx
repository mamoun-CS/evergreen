import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import Link from 'next/link';
import { Pencil, Image as ImageIcon, Search } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CategoriesSEOPage() {
  await requireAdmin();
  const categories = await prisma.category.findMany({ 
    orderBy: { nameAr: 'asc' },
    include: { children: true }
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">SEO - الأقسام</h1>
        <p className="mt-1 text-sm text-slate-500">إدارة السيو وصور العرض للأقسام.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">الاسم (عربي)</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">المسار (Slug)</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">صورة العرض</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">Meta Title (ع)</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">Meta Desc (ع)</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">OG Image</th>
              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">إجراءات</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {categories.filter(c => !c.parentId).map((cat) => (
              <>
                <tr key={cat.id} className="bg-white">
                  <td className="px-3 py-4 text-sm font-bold text-slate-900">{cat.nameAr}</td>
                  <td className="px-3 py-4 text-sm text-slate-500 font-mono dir-ltr">{cat.slug}</td>
                  <td className="px-3 py-4 text-sm text-slate-500 dir-ltr max-w-xs truncate">{cat.imageUrl || '—'}</td>
                  <td className="px-3 py-4 text-sm text-slate-500 max-w-xs truncate">{cat.metaTitleAr || '<span class="text-slate-300">—</span>'}</td>
                  <td className="px-3 py-4 text-sm text-slate-500 max-w-xs truncate">{cat.metaDescAr || '<span class="text-slate-300">—</span>'}</td>
                  <td className="px-3 py-4 text-sm text-slate-500 dir-ltr max-w-xs truncate">{cat.ogImage || '—'}</td>
                  <td className="relative py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6">
                    <Link href={`/admin/content/seo/categories/${cat.id}`} className="text-emerald-600 hover:text-emerald-900"><Pencil className="h-4 w-4" /></Link>
                  </td>
                </tr>
                {cat.children.map((child) => (
                  <tr key={child.id} className="bg-slate-50">
                    <td className="px-3 py-4 text-sm text-slate-700 pr-8">└ {child.nameAr}</td>
                    <td className="px-3 py-4 text-sm text-slate-500 font-mono dir-ltr">{child.slug}</td>
                    <td className="px-3 py-4 text-sm text-slate-500 dir-ltr max-w-xs truncate">{child.imageUrl || '—'}</td>
                    <td className="px-3 py-4 text-sm text-slate-500 max-w-xs truncate">{child.metaTitleAr || '<span class="text-slate-300">—</span>'}</td>
                    <td className="px-3 py-4 text-sm text-slate-500 max-w-xs truncate">{child.metaDescAr || '<span class="text-slate-300">—</span>'}</td>
                    <td className="px-3 py-4 text-sm text-slate-500 dir-ltr max-w-xs truncate">{child.ogImage || '—'}</td>
                    <td className="relative py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6">
                      <Link href={`/admin/content/seo/categories/${child.id}`} className="text-emerald-600 hover:text-emerald-900"><Pencil className="h-4 w-4" /></Link>
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
        {categories.length === 0 && <div className="py-10 text-center text-slate-500">لا توجد أقسام.</div>}
      </div>
    </div>
  );
}