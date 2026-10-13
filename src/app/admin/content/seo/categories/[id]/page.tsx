import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import ImageUploader from '@/components/admin/ImageUploader';

export default async function CategorySEOFormPage({ params }: { params: { id?: string } }) {
  await requireAdmin();
  const isEditing = params.id && params.id !== 'new';
  const category = isEditing ? await prisma.category.findUnique({ where: { id: params.id }, include: { parent: true, children: true } }) : null;
  if (isEditing && !category) redirect('/admin/content/seo/categories');

  const parentOptions = await prisma.category.findMany({ where: { parentId: null }, select: { id: true, nameAr: true, nameEn: true, slug: true } });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/content/seo/categories" className="text-slate-500 hover:text-slate-700"><ChevronLeft className="h-5 w-5" /></Link>
        <h1 className="text-2xl font-extrabold text-slate-900">{isEditing ? 'تعديل SEO للقسم' : 'إضافة قسم جديد'}</h1>
      </div>
      <form action={async (formData) => {
        'use server';
        const data = {
          nameAr: formData.get('nameAr') as string,
          nameEn: formData.get('nameEn') as string,
          slug: formData.get('slug') as string,
          parentId: formData.get('parentId') as string || null,
          imageUrl: formData.get('imageUrl') as string || null,
          metaTitleAr: formData.get('metaTitleAr') as string || null,
          metaTitleEn: formData.get('metaTitleEn') as string || null,
          metaDescAr: formData.get('metaDescAr') as string || null,
          metaDescEn: formData.get('metaDescEn') as string || null,
          ogImage: formData.get('ogImage') as string || null,
        };
        if (isEditing) {
          await prisma.category.update({ where: { id: params.id }, data });
        } else {
          await prisma.category.create({ data });
        }
        redirect('/admin/content/seo/categories');
      }} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isEditing ? (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-500">المعرف (ID) - لا يمكن تغييره</label>
              <input type="text" disabled value={category?.id} className="mt-1 block w-full rounded border-slate-200 bg-slate-50 text-sm text-slate-500 font-mono" />
            </div>
          ) : null}
          <div><label className="block text-sm font-medium">الاسم (عربي) *</label><input required name="nameAr" defaultValue={category?.nameAr || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div><label className="block text-sm font-medium">الاسم (إنجليزي) *</label><input required name="nameEn" defaultValue={category?.nameEn || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          {isEditing ? (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-500">المسار (Slug) - لا يمكن تغييره</label>
              <input type="text" disabled value={category?.slug} className="mt-1 block w-full rounded border-slate-200 bg-slate-50 text-sm text-slate-500 dir-ltr" />
              <input type="hidden" name="slug" value={category?.slug} />
            </div>
          ) : (
            <div><label className="block text-sm font-medium">المسار (Slug) *</label><input required name="slug" placeholder="garden-fountains" className="mt-1 block w-full rounded border-slate-300 text-sm dir-ltr" /></div>
          )}
          <div><label className="block text-sm font-medium">القسم الأب (للقوائم الفرعية)</label>
            <select name="parentId" defaultValue={category?.parentId || ''} className="mt-1 block w-full rounded border-slate-300 text-sm">
              <option value="">— لا يوجد (رئيسي) —</option>
              {parentOptions.filter(p => p.id !== category?.id && !category?.children?.some(c => c.id === p.id)).map(p => (
                <option key={p.id} value={p.id}>{p.nameAr} / {p.nameEn}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-bold mb-4">صورة العرض والقسم</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className="mb-2 block text-sm font-medium">صورة القسم (Display Image) / Category display image</label><ImageUploader name="imageUrl" defaultValue={category?.imageUrl ? [category.imageUrl] : []} maxFiles={1} category="categories" /></div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-bold mb-4">إعدادات السيو (SEO)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium">Meta Title (عربي)</label><input name="metaTitleAr" defaultValue={category?.metaTitleAr || ''} placeholder="اتركه فارغاً لاستخدام الاسم" className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
            <div><label className="block text-sm font-medium">Meta Title (إنجليزي)</label><input name="metaTitleEn" defaultValue={category?.metaTitleEn || ''} placeholder="Leave empty to use name" className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium">Meta Description (عربي)</label><textarea name="metaDescAr" rows={2} defaultValue={category?.metaDescAr || ''} placeholder="أقصى 160 حرف" className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium">Meta Description (إنجليزي)</label><textarea name="metaDescEn" rows={2} defaultValue={category?.metaDescEn || ''} placeholder="Max 160 characters" className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium">OG Image URL (للنشر على فيسبوك/تويتر)</label><input type="url" name="ogImage" defaultValue={category?.ogImage || ''} className="mt-1 block w-full rounded border-slate-300 text-sm text-left dir-ltr" /></div>
          </div>
        </div>
        <div className="flex justify-end pt-4"><button type="submit" className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700">حفظ</button></div>
      </form>
    </div>
  );
}