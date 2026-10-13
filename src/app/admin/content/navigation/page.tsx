import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { createNavItem, updateNavItem, deleteNavItem } from '../../actions/navigation-actions';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NavigationPage() {
  await requireAdmin();
  const navItems = await prisma.navigationItem.findMany({ 
    orderBy: { order: 'asc' },
    include: { children: { orderBy: { order: 'asc' } } }
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">إدارة التنقل الرئيسي</h1>
        <p className="mt-2 text-sm text-slate-700">إدارة روابط التنقل في الهيدر والتذييل. يمكن إنشاء روابط رئيسية وفرعية (قوائم منسدلة).</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">النص (عربي)</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">النص (إنجليزي)</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">المسار (URL)</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">الترتيب</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">الحالة</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">الرئيسي/فرعي</th>
              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">إجراءات</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {navItems.filter(item => !item.parentId).map((item) => (
              <>
                <tr key={item.id} className="bg-white">
                  <td className="px-3 py-4 text-sm font-bold text-slate-900">{item.labelAr}</td>
                  <td className="px-3 py-4 text-sm text-slate-500">{item.labelEn}</td>
                  <td className="px-3 py-4 text-sm text-slate-500 dir-ltr text-right">{item.url}</td>
                  <td className="px-3 py-4 text-sm text-slate-500">{item.order}</td>
                  <td className="px-3 py-4 text-sm text-slate-500">{item.isActive ? <span className="text-emerald-600 font-bold">نشط</span> : 'معطل'}</td>
                  <td className="px-3 py-4 text-sm text-slate-500">رئيسي {item.children.length > 0 && <span className="text-blue-600"> ({item.children.length} فرعي)</span>}</td>
                  <td className="relative py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6">
                    <div className="flex justify-end gap-3">
                      <Link href={`/admin/content/navigation/${item.id}`} className="text-emerald-600 hover:text-emerald-900"><Pencil className="h-4 w-4" /></Link>
                      {item.children.length === 0 && (
                        <form action={async () => { 'use server'; await deleteNavItem(item.id); }}>
                          <button type="submit" className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
                {item.children.length > 0 && item.children.map((child) => (
                  <tr key={child.id} className="bg-slate-50">
                    <td className="px-3 py-4 text-sm text-slate-700 pr-8">└ {child.labelAr}</td>
                    <td className="px-3 py-4 text-sm text-slate-500">{child.labelEn}</td>
                    <td className="px-3 py-4 text-sm text-slate-500 dir-ltr text-right">{child.url}</td>
                    <td className="px-3 py-4 text-sm text-slate-500">{child.order}</td>
                    <td className="px-3 py-4 text-sm text-slate-500">{child.isActive ? <span className="text-emerald-600 font-bold">نشط</span> : 'معطل'}</td>
                    <td className="px-3 py-4 text-sm text-slate-500">فرعي</td>
                    <td className="relative py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6">
                      <div className="flex justify-end gap-3">
                        <Link href={`/admin/content/navigation/${child.id}`} className="text-emerald-600 hover:text-emerald-900"><Pencil className="h-4 w-4" /></Link>
                        <form action={async () => { 'use server'; await deleteNavItem(child.id); }}>
                          <button type="submit" className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
        {navItems.length === 0 && <div className="py-10 text-center text-slate-500">لا توجد روابط تنقل.</div>}
      </div>

      <div className="mt-8 pt-8 border-t border-slate-200 max-w-md">
        <h2 className="text-lg font-bold mb-4">إضافة رابط رئيسي جديد</h2>
        <form action={async (formData) => {
          'use server';
          await createNavItem({
            labelAr: formData.get('labelAr'),
            labelEn: formData.get('labelEn'),
            url: formData.get('url'),
            order: parseInt(formData.get('order') as string) || 0,
            isActive: true
          });
        }} className="space-y-4">
          <div><label className="block text-sm font-medium">النص (عربي)</label><input required name="labelAr" className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div><label className="block text-sm font-medium">النص (إنجليزي)</label><input required name="labelEn" className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div><label className="block text-sm font-medium">المسار (URL)</label><input required type="text" name="url" placeholder="/policies/terms" className="mt-1 block w-full rounded border-slate-300 text-sm dir-ltr text-right" /></div>
          <div><label className="block text-sm font-medium">الترتيب</label><input required type="number" name="order" defaultValue={0} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">إضافة</button>
        </form>
      </div>
    </div>
  );
}
