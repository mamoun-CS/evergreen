import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Globe } from 'lucide-react';
import { deleteSocialLink } from '../../actions/cms-actions';

export const dynamic = 'force-dynamic';

export default async function SocialLinksPage() {
  await requireAdmin();
  const socialLinks = await prisma.socialLink.findMany({ orderBy: { order: 'asc' } });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">روابط التواصل الاجتماعي</h1>
          <p className="mt-2 text-sm text-slate-700">إدارة روابط وسائل التواصل الاجتماعي المعروضة في التذييل.</p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link href="/admin/content/social-links/new" className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-900">
            <Plus className="h-4 w-4" /> إضافة رابط
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">المنصة</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">الاسم (عربي)</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">الاسم (إنجليزي)</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">الرابط (URL)</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">الترتيب</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">الحالة</th>
              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">إجراءات</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {socialLinks.map((link) => (
              <tr key={link.id}>
                <td className="px-3 py-4 text-sm font-bold text-slate-900 dir-ltr text-right">{link.platform}</td>
                <td className="px-3 py-4 text-sm font-bold text-slate-900">{link.labelAr}</td>
                <td className="px-3 py-4 text-sm text-slate-500">{link.labelEn}</td>
                <td className="px-3 py-4 text-sm text-slate-500 dir-ltr text-right max-w-xs truncate">{link.url}</td>
                <td className="px-3 py-4 text-sm text-slate-500">{link.order}</td>
                <td className="px-3 py-4 text-sm text-slate-500">{link.isActive ? <span className="text-emerald-600 font-bold">نشط</span> : 'معطل'}</td>
                <td className="relative py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6">
                  <div className="flex justify-end gap-3">
                    <Link href={`/admin/content/social-links/${link.id}`} className="text-emerald-600 hover:text-emerald-900"><Pencil className="h-4 w-4" /></Link>
                    <form action={async () => { 'use server'; await deleteSocialLink(link.id); }}>
                      <button type="submit" className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {socialLinks.length === 0 && <div className="py-10 text-center text-slate-500">لا توجد روابط تواصل اجتماعي.</div>}
      </div>
    </div>
  );
}