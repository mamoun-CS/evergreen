import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { upsertPageContent } from '../../../../actions/cms-actions';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default async function PageSEOFormPage({ params }: { params: { id?: string } }) {
  await requireAdmin();
  const isEditing = params.id && params.id !== 'new';
  const page = isEditing ? await prisma.pageContent.findUnique({ where: { id: params.id } }) : null;
  if (isEditing && !page) redirect('/admin/content/seo/pages');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/content/seo/pages" className="text-slate-500 hover:text-slate-700"><ChevronLeft className="h-5 w-5" /></Link>
        <h1 className="text-2xl font-extrabold text-slate-900">{isEditing ? 'تعديل SEO للصفحة' : 'إضافة صفحة جديدة'}</h1>
      </div>
      <form action={async (formData) => {
        'use server';
        const data = {
          slug: formData.get('slug') as string,
          titleAr: formData.get('titleAr') as string,
          titleEn: formData.get('titleEn') as string,
          contentAr: formData.get('contentAr') as string,
          contentEn: formData.get('contentEn') as string,
          metaTitleAr: formData.get('metaTitleAr') as string || null,
          metaTitleEn: formData.get('metaTitleEn') as string || null,
          metaDescAr: formData.get('metaDescAr') as string || null,
          metaDescEn: formData.get('metaDescEn') as string || null,
          ogImage: formData.get('ogImage') as string || null,
          isActive: formData.get('isActive') === 'on',
        };
        await upsertPageContent(data.slug, data);
        redirect('/admin/content/seo/pages');
      }} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isEditing ? (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-500">المسار (Slug) - لا يمكن تغييره</label>
              <input type="text" disabled value={page?.slug} className="mt-1 block w-full rounded border-slate-200 bg-slate-50 text-sm text-slate-500" />
              <input type="hidden" name="slug" value={page?.slug} />
            </div>
          ) : (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium">المسار (Slug) *</label>
              <input required name="slug" placeholder="about, contact, privacy, etc." className="mt-1 block w-full rounded border-slate-300 text-sm dir-ltr" />
            </div>
          )}
          <div><label className="block text-sm font-medium">العنوان (عربي) *</label><input required name="titleAr" defaultValue={page?.titleAr || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div><label className="block text-sm font-medium">العنوان (إنجليزي) *</label><input required name="titleEn" defaultValue={page?.titleEn || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium">المحتوى (عربي)</label><textarea required name="contentAr" rows={4} defaultValue={page?.contentAr || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium">المحتوى (إنجليزي)</label><textarea required name="contentEn" rows={4} defaultValue={page?.contentEn || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-bold mb-4">إعدادات السيو (SEO)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium">Meta Title (عربي)</label><input name="metaTitleAr" defaultValue={page?.metaTitleAr || ''} placeholder="اتركه فارغاً لاستخدام العنوان" className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
            <div><label className="block text-sm font-medium">Meta Title (إنجليزي)</label><input name="metaTitleEn" defaultValue={page?.metaTitleEn || ''} placeholder="Leave empty to use title" className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium">Meta Description (عربي)</label><textarea name="metaDescAr" rows={2} defaultValue={page?.metaDescAr || ''} placeholder="أقصى 160 حرف" className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium">Meta Description (إنجليزي)</label><textarea name="metaDescEn" rows={2} defaultValue={page?.metaDescEn || ''} placeholder="Max 160 characters" className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium">OG Image URL (للنشر على فيسبوك/تويتر)</label><input type="url" name="ogImage" defaultValue={page?.ogImage || ''} className="mt-1 block w-full rounded border-slate-300 text-sm text-left dir-ltr" /></div>
            <div className="flex items-center gap-2 mt-6"><input type="checkbox" name="isActive" id="isActive" defaultChecked={page ? page.isActive : true} className="rounded text-emerald-600 focus:ring-emerald-500" /><label htmlFor="isActive" className="text-sm font-medium">نشط</label></div>
          </div>
        </div>
        <div className="flex justify-end pt-4"><button type="submit" className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700">حفظ</button></div>
      </form>
    </div>
  );
}