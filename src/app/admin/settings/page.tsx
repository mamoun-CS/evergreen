import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { updateSiteSettings } from '../actions/cms-actions';

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
          contactEmail: formData.get('contactEmail') as string,
          contactPhone: formData.get('contactPhone') as string,
          contactWhatsApp: formData.get('contactWhatsApp') as string,
          addressAr: formData.get('addressAr') as string,
          addressEn: formData.get('addressEn') as string,
          footerAboutAr: formData.get('footerAboutAr') as string,
          footerAboutEn: formData.get('footerAboutEn') as string,
        };
        await updateSiteSettings(data);
      }} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        
        <h2 className="text-lg font-bold">المعلومات العامة</h2>
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
        </div>

        <h2 className="text-lg font-bold border-t pt-4">نصوص التذييل (Footer)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium">من نحن (عربي)</label><textarea name="footerAboutAr" rows={3} defaultValue={settings.footerAboutAr || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div><label className="block text-sm font-medium">من نحن (إنجليزي)</label><textarea name="footerAboutEn" rows={3} defaultValue={settings.footerAboutEn || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
        </div>

        <div className="flex justify-end pt-4">
          <button type="submit" className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700">حفظ الإعدادات</button>
        </div>
      </form>
    </div>
  );
}
