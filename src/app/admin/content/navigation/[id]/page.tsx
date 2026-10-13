import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { updateNavItem } from '../../../actions/navigation-actions';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default async function NavItemFormPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const navItem = await prisma.navigationItem.findUnique({ 
    where: { id: params.id },
    include: { parent: true, children: true }
  });
  if (!navItem) redirect('/admin/content/navigation');

  const parents = await prisma.navigationItem.findMany({ 
    where: { parentId: null, id: { not: params.id } },
    orderBy: { order: 'asc' }
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/content/navigation" className="text-slate-500 hover:text-slate-700"><ChevronLeft className="h-5 w-5" /></Link>
        <h1 className="text-2xl font-extrabold text-slate-900">تعديل رابط التنقل</h1>
      </div>
      <form action={async (formData) => {
        'use server';
        const data = {
          labelAr: formData.get('labelAr'),
          labelEn: formData.get('labelEn'),
          url: formData.get('url'),
          order: parseInt(formData.get('order') as string) || 0,
          isActive: formData.get('isActive') === 'on',
          parentId: formData.get('parentId') || null,
        };
        await updateNavItem(params.id, data);
        redirect('/admin/content/navigation');
      }} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium">النص (عربي)</label><input required name="labelAr" defaultValue={navItem.labelAr} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div><label className="block text-sm font-medium">النص (إنجليزي)</label><input required name="labelEn" defaultValue={navItem.labelEn} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium">المسار (URL)</label><input required type="text" name="url" defaultValue={navItem.url} className="mt-1 block w-full rounded border-slate-300 text-sm dir-ltr text-right" /></div>
          <div><label className="block text-sm font-medium">الترتيب</label><input type="number" name="order" defaultValue={navItem.order} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">الرابط الأب (للقوائم الفرعية)</label>
            <select name="parentId" className="mt-1 block w-full rounded border-slate-300 text-sm">
              <option value="">لا يوجد (رابط رئيسي)</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id} selected={navItem.parentId === p.id}>{p.labelAr} / {p.labelEn}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 mt-6"><input type="checkbox" name="isActive" id="isActive" defaultChecked={navItem.isActive} className="rounded text-emerald-600 focus:ring-emerald-500" /><label htmlFor="isActive" className="text-sm font-medium">نشط</label></div>
        </div>
        <div className="flex justify-end pt-4"><button type="submit" className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700">حفظ</button></div>
      </form>
    </div>
  );
}