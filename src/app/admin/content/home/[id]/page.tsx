import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { upsertHomepageSection } from '../../../actions/cms-actions';
import Link from 'next/link';
import ImageUploader from '@/components/admin/ImageUploader';
import { ChevronLeft } from 'lucide-react';

const SECTION_TYPES = [
  { value: 'HERO', label: 'Hero (القسم الرئيسي)' },
  { value: 'CATEGORIES', label: 'الأقسام (Categories)' },
  { value: 'BRANDS', label: 'العلامات التجارية (Brands)' },
  { value: 'BANNERS', label: 'البنرات (Banners)' },
  { value: 'PROMO', label: 'الترويج / بنر (Promo)' },
  { value: 'TEXT', label: 'نص حر (Text Block)' },
];

export default async function HomepageSectionFormPage({ params }: { params: { id?: string } }) {
  await requireAdmin();
  const isEditing = params.id && params.id !== 'new';
  const section = isEditing ? await prisma.homepageSection.findUnique({ where: { id: params.id } }) : null;
  if (isEditing && !section) redirect('/admin/content/home');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/content/home" className="text-slate-500 hover:text-slate-700"><ChevronLeft className="h-5 w-5" /></Link>
        <h1 className="text-2xl font-extrabold text-slate-900">{isEditing ? 'تعديل قسم الصفحة الرئيسية' : 'إضافة قسم جديد'}</h1>
      </div>
      <form action={async (formData) => {
        'use server';
        const data = {
          key: formData.get('key') as string,
          type: formData.get('type') as string,
          titleAr: formData.get('titleAr') as string || null,
          titleEn: formData.get('titleEn') as string || null,
          subtitleAr: formData.get('subtitleAr') as string || null,
          subtitleEn: formData.get('subtitleEn') as string || null,
          contentAr: formData.get('contentAr') as string || null,
          contentEn: formData.get('contentEn') as string || null,
          imageAr: formData.get('imageAr') as string || null,
          imageEn: formData.get('imageEn') as string || null,
          ctaTextAr: formData.get('ctaTextAr') as string || null,
          ctaTextEn: formData.get('ctaTextEn') as string || null,
          ctaLink: formData.get('ctaLink') as string || null,
          order: parseInt(formData.get('order') as string) || 0,
          isActive: formData.get('isActive') === 'on',
        };
        await upsertHomepageSection(data);
        redirect('/admin/content/home');
      }} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isEditing ? (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-500">المفتاح (Key) - لا يمكن تغييره</label>
              <input type="text" disabled value={section?.key} className="mt-1 block w-full rounded border-slate-200 bg-slate-50 text-sm text-slate-500" />
              <input type="hidden" name="key" value={section?.key} />
            </div>
          ) : (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium">المفتاح (Key) *</label>
              <input required name="key" placeholder="hero, promo, features, etc." className="mt-1 block w-full rounded border-slate-300 text-sm dir-ltr" />
            </div>
          )}
          <div><label className="block text-sm font-medium">النوع *</label>
            <select name="type" required defaultValue={section?.type || 'TEXT'} className="mt-1 block w-full rounded border-slate-300 text-sm">
              {SECTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium">الترتيب</label><input type="number" name="order" defaultValue={section?.order ?? 0} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div className="flex items-center gap-2 mt-6"><input type="checkbox" name="isActive" id="isActive" defaultChecked={section ? section.isActive : true} className="rounded text-emerald-600 focus:ring-emerald-500" /><label htmlFor="isActive" className="text-sm font-medium">نشط</label></div>
        </div>
        
        <div className="border-t pt-6">
          <h3 className="text-lg font-bold mb-4">المحتوى</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium">العنوان (عربي)</label><input name="titleAr" defaultValue={section?.titleAr || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
            <div><label className="block text-sm font-medium">العنوان (إنجليزي)</label><input name="titleEn" defaultValue={section?.titleEn || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
            <div><label className="block text-sm font-medium">العنوان الفرعي (عربي)</label><input name="subtitleAr" defaultValue={section?.subtitleAr || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
            <div><label className="block text-sm font-medium">العنوان الفرعي (إنجليزي)</label><input name="subtitleEn" defaultValue={section?.subtitleEn || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium">المحتوى (عربي)</label><textarea name="contentAr" rows={4} defaultValue={section?.contentAr || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium">المحتوى (إنجليزي)</label><textarea name="contentEn" rows={4} defaultValue={section?.contentEn || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
            <div><label className="mb-2 block text-sm font-medium">الصورة (عربي)</label><ImageUploader name="imageAr" defaultValue={section?.imageAr ? [section.imageAr] : []} maxFiles={1} category="banners" /></div>
            <div><label className="mb-2 block text-sm font-medium">الصورة (إنجليزي)</label><ImageUploader name="imageEn" defaultValue={section?.imageEn ? [section.imageEn] : []} maxFiles={1} category="banners" /></div>
            <div><label className="block text-sm font-medium">نص الزر (عربي)</label><input name="ctaTextAr" defaultValue={section?.ctaTextAr || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
            <div><label className="block text-sm font-medium">نص الزر (إنجليزي)</label><input name="ctaTextEn" defaultValue={section?.ctaTextEn || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium">رابط الزر (URL)</label><input type="url" name="ctaLink" defaultValue={section?.ctaLink || ''} className="mt-1 block w-full rounded border-slate-300 text-sm dir-ltr" /></div>
          </div>
        </div>
        <div className="flex justify-end pt-4"><button type="submit" className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700">حفظ</button></div>
      </form>
    </div>
  );
}