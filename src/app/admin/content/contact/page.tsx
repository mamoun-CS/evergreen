import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { upsertPageContent } from '../../actions/cms-actions';

export const dynamic = 'force-dynamic';

export default async function ContactContentPage() {
  await requireAdmin();
  const page = await prisma.pageContent.findUnique({ where: { slug: 'contact' } }) || {} as any;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">محتوى صفحة اتصل بنا</h1>
        <p className="mt-1 text-sm text-slate-500">تعديل نصوص صفحة اتصل بنا (معلومات التواصل نفسها تعدل من الإعدادات).</p>
      </div>

      <form action={async (formData) => {
        'use server';
        await upsertPageContent('contact', {
          titleAr: formData.get('titleAr'),
          titleEn: formData.get('titleEn'),
          contentAr: formData.get('contentAr'),
          contentEn: formData.get('contentEn'),
        });
      }} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        
        <div className="grid grid-cols-1 gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium">العنوان (عربي)</label><input name="titleAr" defaultValue={page.titleAr || ''} className="mt-1 block w-full rounded border-slate-300" /></div>
            <div><label className="block text-sm font-medium">العنوان (إنجليزي)</label><input name="titleEn" defaultValue={page.titleEn || ''} className="mt-1 block w-full rounded border-slate-300" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium">الرسالة الترحيبية (عربي)</label><textarea name="contentAr" rows={5} defaultValue={page.contentAr || ''} className="mt-1 block w-full rounded border-slate-300" /></div>
            <div><label className="block text-sm font-medium">الرسالة الترحيبية (إنجليزي)</label><textarea name="contentEn" rows={5} defaultValue={page.contentEn || ''} className="mt-1 block w-full rounded border-slate-300" /></div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button type="submit" className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700">حفظ المحتوى</button>
        </div>
      </form>
    </div>
  );
}
