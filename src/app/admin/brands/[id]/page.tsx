import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { createBrand, updateBrand } from '../../actions/brand-actions';

export default async function BrandFormPage({ params }: { params: { id?: string } }) {
  await requireAdmin();
  const isEditing = params.id && params.id !== 'new';
  const brand = isEditing ? await prisma.brand.findUnique({ where: { id: params.id } }) : null;
  if (isEditing && !brand) redirect('/admin/brands');

  async function submit(formData: FormData) {
    'use server';
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
      logoUrl: formData.get('logoUrl') as string || undefined,
    };
    if (isEditing) {
      await updateBrand(params.id!, data);
    } else {
      await createBrand(data);
    }
    redirect('/admin/brands');
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{isEditing ? 'تعديل العلامة التجارية' : 'إضافة علامة تجارية'}</h1>
      </div>
      <form action={submit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700">الاسم</label>
            <input type="text" name="name" id="name" required defaultValue={brand?.name || ''} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700">الوصف</label>
            <textarea name="description" id="description" rows={3} defaultValue={brand?.description || ''} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"></textarea>
          </div>
          <div>
            <label htmlFor="logoUrl" className="block text-sm font-medium text-slate-700">رابط الشعار (Logo URL)</label>
            <input type="url" name="logoUrl" id="logoUrl" defaultValue={brand?.logoUrl || ''} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <a href="/admin/brands" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">إلغاء</a>
          <button type="submit" className="rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700">{isEditing ? 'حفظ التعديلات' : 'إضافة'}</button>
        </div>
      </form>
    </div>
  );
}
