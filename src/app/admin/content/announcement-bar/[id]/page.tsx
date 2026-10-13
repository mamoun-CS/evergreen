import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { createAnnouncementBar, updateAnnouncementBar } from '../../../actions/cms-actions';

export default async function AnnouncementBarFormPage({ params }: { params: { id?: string } }) {
  await requireAdmin();
  const isEditing = params.id && params.id !== 'new';
  const announcement = isEditing ? await prisma.announcementBar.findUnique({ where: { id: params.id } }) : null;
  if (isEditing && !announcement) redirect('/admin/content/announcement-bar');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">{isEditing ? 'تعديل الشريط الإعلاني' : 'إضافة شريط إعلاني جديد'}</h1>
      <form action={async (formData) => {
        'use server';
        const data = {
          textAr: formData.get('textAr') as string,
          textEn: formData.get('textEn') as string,
          linkUrl: formData.get('linkUrl') as string || null,
          linkTextAr: formData.get('linkTextAr') as string || null,
          linkTextEn: formData.get('linkTextEn') as string || null,
          backgroundColor: formData.get('backgroundColor') as string || '#0f5132',
          textColor: formData.get('textColor') as string || '#ffffff',
          order: parseInt(formData.get('order') as string) || 0,
          isActive: formData.get('isActive') === 'on',
          startDate: formData.get('startDate') ? new Date(formData.get('startDate') as string) : null,
          endDate: formData.get('endDate') ? new Date(formData.get('endDate') as string) : null,
        };
        if (isEditing) await updateAnnouncementBar(params.id!, data);
        else await createAnnouncementBar(data);
        redirect('/admin/content/announcement-bar');
      }} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium">النص (عربي) *</label><input required name="textAr" defaultValue={announcement?.textAr || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div><label className="block text-sm font-medium">النص (إنجليزي) *</label><input required name="textEn" defaultValue={announcement?.textEn || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium">رابط الزر (اختياري)</label><input type="url" name="linkUrl" defaultValue={announcement?.linkUrl || ''} className="mt-1 block w-full rounded border-slate-300 text-sm text-left dir-ltr" /></div>
          <div><label className="block text-sm font-medium">نص الزر بالعربي (اختياري)</label><input name="linkTextAr" defaultValue={announcement?.linkTextAr || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div><label className="block text-sm font-medium">نص الزر بالإنجليزي (اختياري)</label><input name="linkTextEn" defaultValue={announcement?.linkTextEn || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div><label className="block text-sm font-medium">لون الخلفية (HEX)</label><input type="color" name="backgroundColor" defaultValue={announcement?.backgroundColor || '#0f5132'} className="mt-1 block w-full h-10 rounded border-slate-300 cursor-pointer" /></div>
          <div><label className="block text-sm font-medium">لون النص (HEX)</label><input type="color" name="textColor" defaultValue={announcement?.textColor || '#ffffff'} className="mt-1 block w-full h-10 rounded border-slate-300 cursor-pointer" /></div>
          <div><label className="block text-sm font-medium">تاريخ البداية (اختياري)</label><input type="datetime-local" name="startDate" defaultValue={announcement?.startDate ? announcement.startDate.toISOString().slice(0,16) : ''} className="mt-1 block w-full rounded border-slate-300 text-sm text-left dir-ltr" /></div>
          <div><label className="block text-sm font-medium">تاريخ النهاية (اختياري)</label><input type="datetime-local" name="endDate" defaultValue={announcement?.endDate ? announcement.endDate.toISOString().slice(0,16) : ''} className="mt-1 block w-full rounded border-slate-300 text-sm text-left dir-ltr" /></div>
          <div><label className="block text-sm font-medium">الترتيب</label><input type="number" name="order" defaultValue={announcement?.order ?? 0} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div className="flex items-center gap-2 mt-6"><input type="checkbox" name="isActive" id="isActive" defaultChecked={announcement ? announcement.isActive : true} className="rounded text-emerald-600 focus:ring-emerald-500" /><label htmlFor="isActive" className="text-sm font-medium">نشط</label></div>
        </div>
        <div className="flex justify-end pt-4"><button type="submit" className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700">حفظ</button></div>
      </form>
    </div>
  );
}