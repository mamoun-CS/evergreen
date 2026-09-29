import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { upsertStorePolicy } from '../../../actions/cms-actions';

export const dynamic = 'force-dynamic';

export default async function PolicyFormPage({ params }: { params: { slug: string } }) {
  await requireAdmin();
  const isNew = params.slug === 'new';
  const policy = isNew ? null : await prisma.storePolicy.findUnique({ where: { slug: params.slug } });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">{isNew ? 'إضافة سياسة جديدة' : `تعديل سياسة: ${params.slug}`}</h1>
      <form action={async (formData) => {
        'use server';
        const targetSlug = isNew ? formData.get('slug') as string : params.slug;
        if (!targetSlug) return;

        await upsertStorePolicy(targetSlug, {
          titleAr: formData.get('titleAr'),
          titleEn: formData.get('titleEn'),
          contentAr: formData.get('contentAr'),
          contentEn: formData.get('contentEn'),
          isActive: formData.get('isActive') === 'on',
        });
        redirect('/admin/content/policies');
      }} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        
        {isNew && (
          <div><label className="block text-sm font-medium text-slate-700">المعرف (Slug)</label><input required name="slug" className="mt-1 block w-full rounded border-slate-300 text-sm dir-ltr text-right" placeholder="privacy, terms, shipping..." /></div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium">العنوان (عربي)</label><input required name="titleAr" defaultValue={policy?.titleAr || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div><label className="block text-sm font-medium">العنوان (إنجليزي)</label><input required name="titleEn" defaultValue={policy?.titleEn || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium">النص (عربي)</label><textarea required name="contentAr" rows={15} defaultValue={policy?.contentAr || ''} className="mt-1 block w-full rounded border-slate-300 text-sm whitespace-pre" /></div>
          <div><label className="block text-sm font-medium">النص (إنجليزي)</label><textarea required name="contentEn" rows={15} defaultValue={policy?.contentEn || ''} className="mt-1 block w-full rounded border-slate-300 text-sm whitespace-pre" /></div>
        </div>

        <div className="flex items-center gap-2 mt-6"><input type="checkbox" name="isActive" id="isActive" defaultChecked={policy ? policy.isActive : true} className="rounded text-emerald-600 focus:ring-emerald-500" /><label htmlFor="isActive" className="text-sm font-medium">نشط</label></div>

        <div className="flex justify-end pt-4"><button type="submit" className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700">حفظ</button></div>
      </form>
    </div>
  );
}
