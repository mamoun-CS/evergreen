import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { createCategory, updateCategory } from '../../actions/category-actions';

export default async function CategoryFormPage({ params }: { params: { id?: string } }) {
  await requireAdmin();
  const isEditing = params.id && params.id !== 'new';
  
  const category = isEditing ? await prisma.category.findUnique({ where: { id: params.id } }) : null;
  if (isEditing && !category) redirect('/admin/categories');

  const allCategories = await prisma.category.findMany({ orderBy: { nameAr: 'asc' } });
  const validParents = isEditing ? allCategories.filter(c => c.id !== category?.id && c.parentId !== category?.id) : allCategories;

  async function submit(formData: FormData) {
    'use server';
    const data = {
      nameAr: formData.get('nameAr') as string,
      nameEn: formData.get('nameEn') as string,
      slug: formData.get('slug') as string,
      parentId: formData.get('parentId') as string || undefined,
    };
    if (isEditing) {
      await updateCategory(params.id!, data);
    } else {
      await createCategory(data);
    }
    redirect('/admin/categories');
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{isEditing ? 'تعديل القسم' : 'إضافة قسم جديد'}</h1>
      </div>
      <form action={submit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="nameAr" className="block text-sm font-medium text-slate-700">الاسم (عربي)</label>
            <input type="text" name="nameAr" id="nameAr" required defaultValue={category?.nameAr || ''} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="nameEn" className="block text-sm font-medium text-slate-700">الاسم (إنجليزي)</label>
            <input type="text" name="nameEn" id="nameEn" required defaultValue={category?.nameEn || ''} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-slate-700">الرابط (Slug)</label>
            <input type="text" name="slug" id="slug" required defaultValue={category?.slug || ''} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="parentId" className="block text-sm font-medium text-slate-700">القسم الأب</label>
            <select name="parentId" id="parentId" defaultValue={category?.parentId || ''} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm">
              <option value="">(لا يوجد - قسم رئيسي)</option>
              {validParents.map(c => (
                <option key={c.id} value={c.id}>{c.nameAr}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <a href="/admin/categories" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">إلغاء</a>
          <button type="submit" className="rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700">{isEditing ? 'حفظ التعديلات' : 'إضافة القسم'}</button>
        </div>
      </form>
    </div>
  );
}
