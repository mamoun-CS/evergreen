import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { updateSiteSettings } from '../actions/cms-actions';
import ImageUploader from '@/components/admin/ImageUploader';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'global' } }) || {} as any;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">إعدادات المتجر</h1>
        <p className="mt-1 text-sm text-slate-500">تعديل معلومات المتجر الأساسية وطرق التواصل.</p>
      </div>

      <form action={async (formData) => {
        'use server';
        const data = {
          storeNameAr: formData.get('storeNameAr') as string,
          storeNameEn: formData.get('storeNameEn') as string,
          logoUrl: formData.get('logoUrl') as string || null,
          faviconUrl: formData.get('faviconUrl') as string || null,
          contactEmail: formData.get('contactEmail') as string,
          contactPhone: formData.get('contactPhone') as string,
          contactWhatsApp: formData.get('contactWhatsApp') as string,
          addressAr: formData.get('addressAr') as string,
          addressEn: formData.get('addressEn') as string,
          googleMapsUrl: formData.get('googleMapsUrl') as string || null,
          businessHoursAr: formData.get('businessHoursAr') as string || null,
          businessHoursEn: formData.get('businessHoursEn') as string || null,
          footerAboutAr: formData.get('footerAboutAr') as string,
          footerAboutEn: formData.get('footerAboutEn') as string,
          copyrightTextAr: formData.get('copyrightTextAr') as string || null,
          copyrightTextEn: formData.get('copyrightTextEn') as string || null,
        };
        await updateSiteSettings(data);
      }} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        
        <h2 className="text-lg font-bold">الشعار والأيقونة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><label className="mb-2 block text-sm font-medium">الشعار (Logo) / Logo image</label><ImageUploader name="logoUrl" defaultValue={settings.logoUrl ? [settings.logoUrl] : []} maxFiles={1} category="settings" /></div>
          <div className="md:col-span-2"><label className="mb-2 block text-sm font-medium">أيقونة المتصفح (Favicon) / Favicon image (32x32 or 16x16)</label><ImageUploader name="faviconUrl" defaultValue={settings.faviconUrl ? [settings.faviconUrl] : []} maxFiles={1} category="settings" /></div>
        </div>

        <h2 className="text-lg font-bold border-t pt-4">المعلومات العامة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium">اسم المتجر (عربي)</label><input name="storeNameAr" defaultValue={settings.storeNameAr || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div><label className="block text-sm font-medium">اسم المتجر (إنجليزي)</label><input name="storeNameEn" defaultValue={settings.storeNameEn || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
        </div>

        <h2 className="text-lg font-bold border-t pt-4">معلومات التواصل</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className="block text-sm font-medium">البريد الإلكتروني</label><input type="email" name="contactEmail" defaultValue={settings.contactEmail || ''} className="mt-1 block w-full rounded border-slate-300 text-sm text-left" dir="ltr" /></div>
          <div><label className="block text-sm font-medium">رقم الهاتف</label><input name="contactPhone" defaultValue={settings.contactPhone || ''} className="mt-1 block w-full rounded border-slate-300 text-sm text-left" dir="ltr" /></div>
          <div><label className="block text-sm font-medium">رقم واتساب</label><input name="contactWhatsApp" defaultValue={settings.contactWhatsApp || ''} className="mt-1 block w-full rounded border-slate-300 text-sm text-left" dir="ltr" /></div>
          <div><label className="block text-sm font-medium">العنوان (عربي)</label><input name="addressAr" defaultValue={settings.addressAr || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div><label className="block text-sm font-medium">العنوان (إنجليزي)</label><input name="addressEn" defaultValue={settings.addressEn || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium">رابط جوجل مابس / Google Maps URL</label><input type="url" name="googleMapsUrl" defaultValue={settings.googleMapsUrl || ''} className="mt-1 block w-full rounded border-slate-300 text-sm text-left dir-ltr" /></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium">ساعات العمل (عربي)</label><textarea name="businessHoursAr" rows={2} defaultValue={settings.businessHoursAr || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" placeholder="مثال: الأحد - الخميس: 9 صباحاً - 6 مساءً" /></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium">ساعات العمل (إنجليزي)</label><textarea name="businessHoursEn" rows={2} defaultValue={settings.businessHoursEn || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" placeholder="Example: Sun - Thu: 9 AM - 6 PM" /></div>
        </div>

        <h2 className="text-lg font-bold border-t pt-4">نصوص التذييل (Footer)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium">من نحن (عربي)</label><textarea name="footerAboutAr" rows={3} defaultValue={settings.footerAboutAr || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div><label className="block text-sm font-medium">من نحن (إنجليزي)</label><textarea name="footerAboutEn" rows={3} defaultValue={settings.footerAboutEn || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div><label className="block text-sm font-medium">نص حقوق النشر (عربي)</label><input name="copyrightTextAr" defaultValue={settings.copyrightTextAr || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div><label className="block text-sm font-medium">نص حقوق النشر (إنجليزي)</label><input name="copyrightTextEn" defaultValue={settings.copyrightTextEn || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
        </div>

        <div className="flex justify-end pt-4">
          <button type="submit" className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700">حفظ الإعدادات</button>
        </div>
      </form>
    </div>
  );
}
