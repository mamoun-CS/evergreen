import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { upsertPageContent } from '../../actions/cms-actions';
import ImageUploader from '@/components/admin/ImageUploader';

export const dynamic = 'force-dynamic';

export default async function AboutContentPage() {
  await requireAdmin();
  const page = await prisma.pageContent.findUnique({ where: { slug: 'about' } }) || {} as any;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">محتوى صفحة من نحن</h1>
        <p className="mt-1 text-sm text-slate-500">تعديل نصوص وصور صفحة من نحن.</p>
      </div>

      <form action={async (formData) => {
        'use server';
        await upsertPageContent('about', {
          titleAr: formData.get('titleAr'),
          titleEn: formData.get('titleEn'),
          contentAr: formData.get('contentAr'),
          contentEn: formData.get('contentEn'),
          images: formData.getAll('image').filter((value): value is string => typeof value === 'string' && Boolean(value)),
        });
      }} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        
        <div className="grid grid-cols-1 gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium">العنوان (عربي)</label><input name="titleAr" defaultValue={page.titleAr || ''} className="mt-1 block w-full rounded border-slate-300" /></div>
            <div><label className="block text-sm font-medium">العنوان (إنجليزي)</label><input name="titleEn" defaultValue={page.titleEn || ''} className="mt-1 block w-full rounded border-slate-300" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium">المحتوى (عربي)</label><textarea name="contentAr" rows={10} defaultValue={page.contentAr || ''} className="mt-1 block w-full rounded border-slate-300" /></div>
            <div><label className="block text-sm font-medium">المحتوى (إنجليزي)</label><textarea name="contentEn" rows={10} defaultValue={page.contentEn || ''} className="mt-1 block w-full rounded border-slate-300" /></div>
          </div>
      <div><label className="mb-2 block text-sm font-medium">الصورة الرئيسية / Main image</label><ImageUploader name="image" defaultValue={page.images?.[0] ? [page.images[0]] : []} maxFiles={1} category="about" /></div>
        </div>

        <div className="flex justify-end pt-4">
          <button type="submit" className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700">حفظ المحتوى</button>
        </div>
      </form>
    </div>
  );
}
