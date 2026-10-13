import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { createBanner, updateBanner } from '../../../actions/cms-actions';
import ImageUploader from '@/components/admin/ImageUploader';

export default async function BannerFormPage({ params }: { params: { id?: string } }) {
  await requireAdmin();
  const isEditing = params.id && params.id !== 'new';
  const banner = isEditing ? await prisma.banner.findUnique({ where: { id: params.id } }) : null;
  if (isEditing && !banner) redirect('/admin/content/banners');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">{isEditing ? 'تعديل البنر' : 'إضافة بنر جديد'}</h1>
      <form action={async (formData) => {
        'use server';
        const data = {
          titleAr: formData.get('titleAr') as string || null,
          titleEn: formData.get('titleEn') as string || null,
          subtitleAr: formData.get('subtitleAr') as string || null,
          subtitleEn: formData.get('subtitleEn') as string || null,
          imageUrl: formData.get('imageUrl') as string,
          mobileImageUrl: formData.get('mobileImageUrl') as string || null,
          ctaTextAr: formData.get('ctaTextAr') as string || null,
          ctaTextEn: formData.get('ctaTextEn') as string || null,
          ctaUrl: formData.get('ctaUrl') as string || null,
          order: parseInt(formData.get('order') as string) || 0,
          isActive: formData.get('isActive') === 'on',
        };
        if (isEditing) await updateBanner(params.id!, data);
        else await createBanner(data);
        redirect('/admin/content/banners');
      }} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium">العنوان (عربي)</label><input name="titleAr" defaultValue={banner?.titleAr || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div><label className="block text-sm font-medium">العنوان (إنجليزي)</label><input name="titleEn" defaultValue={banner?.titleEn || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div><label className="block text-sm font-medium">الوصف (عربي)</label><input name="subtitleAr" defaultValue={banner?.subtitleAr || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div><label className="block text-sm font-medium">الوصف (إنجليزي)</label><input name="subtitleEn" defaultValue={banner?.subtitleEn || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          
          <div className="md:col-span-2"><label className="mb-2 block text-sm font-medium">صورة البنر (كمبيوتر) / Desktop banner image</label><ImageUploader name="imageUrl" defaultValue={banner?.imageUrl ? [banner.imageUrl] : []} maxFiles={1} category="banners" /></div>
          <div className="md:col-span-2"><label className="mb-2 block text-sm font-medium">صورة البنر (جوال) / Mobile banner image (اختياري)</label><ImageUploader name="mobileImageUrl" defaultValue={banner?.mobileImageUrl ? [banner.mobileImageUrl] : []} maxFiles={1} category="banners" /></div>
          
          <div><label className="block text-sm font-medium">نص الزر (عربي)</label><input name="ctaTextAr" defaultValue={banner?.ctaTextAr || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div><label className="block text-sm font-medium">نص الزر (إنجليزي)</label><input name="ctaTextEn" defaultValue={banner?.ctaTextEn || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium">رابط الزر (URL)</label><input name="ctaUrl" defaultValue={banner?.ctaUrl || ''} className="mt-1 block w-full rounded border-slate-300 text-sm text-left" dir="ltr" /></div>
          
          <div><label className="block text-sm font-medium">الترتيب</label><input type="number" name="order" defaultValue={banner?.order ?? 0} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div className="flex items-center gap-2 mt-6"><input type="checkbox" name="isActive" id="isActive" defaultChecked={banner ? banner.isActive : true} className="rounded text-emerald-600 focus:ring-emerald-500" /><label htmlFor="isActive" className="text-sm font-medium">نشط</label></div>
        </div>
        <div className="flex justify-end pt-4"><button type="submit" className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700">حفظ</button></div>
      </form>
    </div>
  );
}
