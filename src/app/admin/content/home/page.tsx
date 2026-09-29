import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { upsertHomepageSection } from '../../actions/cms-actions';

export const dynamic = 'force-dynamic';

export default async function HomepageContentPage() {
  await requireAdmin();
  const heroSection = await prisma.homepageSection.findUnique({ where: { key: 'hero' } }) || {} as any;
  const storySection = await prisma.homepageSection.findUnique({ where: { key: 'story' } }) || {} as any;
  const finalSection = await prisma.homepageSection.findUnique({ where: { key: 'final' } }) || {} as any;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">محتوى الصفحة الرئيسية</h1>
        <p className="mt-1 text-sm text-slate-500">إدارة النصوص الترويجية والصور في الصفحة الرئيسية للمتجر.</p>
      </div>

      <form action={async (formData) => {
        'use server';
        await upsertHomepageSection({
          key: 'hero', type: 'HERO',
          titleAr: formData.get('hero_titleAr'), titleEn: formData.get('hero_titleEn'),
          subtitleAr: formData.get('hero_eyebrowAr'), subtitleEn: formData.get('hero_eyebrowEn'),
          contentAr: formData.get('hero_descAr'), contentEn: formData.get('hero_descEn'),
          imageAr: formData.get('hero_imgAr'), imageEn: formData.get('hero_imgEn'),
        });
        await upsertHomepageSection({
          key: 'story', type: 'TEXT',
          titleAr: formData.get('story_titleAr'), titleEn: formData.get('story_titleEn'),
          contentAr: formData.get('story_descAr'), contentEn: formData.get('story_descEn'),
          imageAr: formData.get('story_imgAr'), imageEn: formData.get('story_imgEn'),
        });
        await upsertHomepageSection({
          key: 'final', type: 'TEXT',
          titleAr: formData.get('final_titleAr'), titleEn: formData.get('final_titleEn'),
          contentAr: formData.get('final_descAr'), contentEn: formData.get('final_descEn'),
        });
      }} className="space-y-6">
        
        {/* HERO SECTION */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4"><h2 className="font-bold">القسم الأول (Hero)</h2></div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-medium">العنوان الرئيسي (ع)</label><input name="hero_titleAr" defaultValue={heroSection.titleAr || ''} className="mt-1 block w-full rounded border-slate-300" /></div>
            <div><label className="block text-sm font-medium">العنوان الرئيسي (إ)</label><input name="hero_titleEn" defaultValue={heroSection.titleEn || ''} className="mt-1 block w-full rounded border-slate-300" /></div>
            <div><label className="block text-sm font-medium">الترويسة الصغرى (Eyebrow - ع)</label><input name="hero_eyebrowAr" defaultValue={heroSection.subtitleAr || ''} className="mt-1 block w-full rounded border-slate-300" /></div>
            <div><label className="block text-sm font-medium">الترويسة الصغرى (Eyebrow - إ)</label><input name="hero_eyebrowEn" defaultValue={heroSection.subtitleEn || ''} className="mt-1 block w-full rounded border-slate-300" /></div>
            <div><label className="block text-sm font-medium">الوصف (ع)</label><textarea name="hero_descAr" rows={3} defaultValue={heroSection.contentAr || ''} className="mt-1 block w-full rounded border-slate-300" /></div>
            <div><label className="block text-sm font-medium">الوصف (إ)</label><textarea name="hero_descEn" rows={3} defaultValue={heroSection.contentEn || ''} className="mt-1 block w-full rounded border-slate-300" /></div>
            <div><label className="block text-sm font-medium">الخلفية (ع)</label><input type="url" name="hero_imgAr" defaultValue={heroSection.imageAr || ''} className="mt-1 block w-full rounded border-slate-300 dir-ltr" /></div>
            <div><label className="block text-sm font-medium">الخلفية (إ)</label><input type="url" name="hero_imgEn" defaultValue={heroSection.imageEn || ''} className="mt-1 block w-full rounded border-slate-300 dir-ltr" /></div>
          </div>
        </div>

        {/* STORY SECTION */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4"><h2 className="font-bold">قسم (من نحن / القصة)</h2></div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-medium">العنوان (ع)</label><input name="story_titleAr" defaultValue={storySection.titleAr || ''} className="mt-1 block w-full rounded border-slate-300" /></div>
            <div><label className="block text-sm font-medium">العنوان (إ)</label><input name="story_titleEn" defaultValue={storySection.titleEn || ''} className="mt-1 block w-full rounded border-slate-300" /></div>
            <div><label className="block text-sm font-medium">النص (ع)</label><textarea name="story_descAr" rows={3} defaultValue={storySection.contentAr || ''} className="mt-1 block w-full rounded border-slate-300" /></div>
            <div><label className="block text-sm font-medium">النص (إ)</label><textarea name="story_descEn" rows={3} defaultValue={storySection.contentEn || ''} className="mt-1 block w-full rounded border-slate-300" /></div>
            <div><label className="block text-sm font-medium">الصورة (ع)</label><input type="url" name="story_imgAr" defaultValue={storySection.imageAr || ''} className="mt-1 block w-full rounded border-slate-300 dir-ltr" /></div>
            <div><label className="block text-sm font-medium">الصورة (إ)</label><input type="url" name="story_imgEn" defaultValue={storySection.imageEn || ''} className="mt-1 block w-full rounded border-slate-300 dir-ltr" /></div>
          </div>
        </div>

        {/* FINAL SECTION */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4"><h2 className="font-bold">قسم الختام (الدعوة للشراء)</h2></div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-medium">العنوان (ع)</label><input name="final_titleAr" defaultValue={finalSection.titleAr || ''} className="mt-1 block w-full rounded border-slate-300" /></div>
            <div><label className="block text-sm font-medium">العنوان (إ)</label><input name="final_titleEn" defaultValue={finalSection.titleEn || ''} className="mt-1 block w-full rounded border-slate-300" /></div>
            <div><label className="block text-sm font-medium">الوصف (ع)</label><input name="final_descAr" defaultValue={finalSection.contentAr || ''} className="mt-1 block w-full rounded border-slate-300" /></div>
            <div><label className="block text-sm font-medium">الوصف (إ)</label><input name="final_descEn" defaultValue={finalSection.contentEn || ''} className="mt-1 block w-full rounded border-slate-300" /></div>
          </div>
        </div>

        <div className="flex justify-end pt-4"><button type="submit" className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700">حفظ جميع الأقسام</button></div>
      </form>
    </div>
  );
}
