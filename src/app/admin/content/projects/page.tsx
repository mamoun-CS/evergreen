import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { upsertPageContent } from '../../actions/cms-actions';
import ImageUploader from '@/components/admin/ImageUploader';

export const dynamic = 'force-dynamic';

export default async function ProjectsContentPage() {
  await requireAdmin();
  const page = await prisma.pageContent.findUnique({ where: { slug: 'projects' } });

  return <main className="max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
    <header><h1 className="text-2xl font-extrabold text-slate-900">محتوى صفحة المشاريع</h1><p className="mt-1 text-sm text-slate-500">أدخل معلومات المشاريع الفعلية باللغتين العربية والإنجليزية.</p></header>
    <form action={async (formData) => {
      'use server';
      await upsertPageContent('projects', {
        titleAr: formData.get('titleAr'), titleEn: formData.get('titleEn'),
        contentAr: formData.get('contentAr'), contentEn: formData.get('contentEn'),
        images: [formData.get('image')].filter(Boolean),
      });
    }} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm font-semibold">العنوان بالعربية<input required name="titleAr" defaultValue={page?.titleAr || ''} className="w-full rounded border-slate-300" /></label>
        <label className="space-y-1 text-sm font-semibold">Title in English<input required name="titleEn" defaultValue={page?.titleEn || ''} className="w-full rounded border-slate-300" /></label>
        <label className="space-y-1 text-sm font-semibold">تفاصيل المشاريع بالعربية<textarea required name="contentAr" rows={10} defaultValue={page?.contentAr || ''} className="w-full rounded border-slate-300" /></label>
        <label className="space-y-1 text-sm font-semibold">Project details in English<textarea required name="contentEn" rows={10} defaultValue={page?.contentEn || ''} className="w-full rounded border-slate-300" /></label>
      </div>
      <label className="block space-y-1 text-sm font-semibold">الصورة الرئيسية / Main image<ImageUploader name="image" defaultValue={page?.images?.[0] ? [page.images[0]] : []} maxFiles={1} /></label>
      <div className="flex justify-end"><button className="rounded-md bg-emerald-700 px-6 py-2 text-sm font-bold text-white hover:bg-emerald-800">حفظ المحتوى</button></div>
    </form>
  </main>;
}
