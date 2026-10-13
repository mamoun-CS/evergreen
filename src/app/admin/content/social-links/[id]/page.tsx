import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { createSocialLink, updateSocialLink } from '../../../actions/cms-actions';

const PLATFORMS = [
  { value: 'facebook', label: 'Facebook', icon: 'facebook' },
  { value: 'instagram', label: 'Instagram', icon: 'instagram' },
  { value: 'twitter', label: 'X (Twitter)', icon: 'twitter' },
  { value: 'youtube', label: 'YouTube', icon: 'youtube' },
  { value: 'linkedin', label: 'LinkedIn', icon: 'linkedin' },
  { value: 'tiktok', label: 'TikTok', icon: 'tiktok' },
  { value: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp' },
  { value: 'snapchat', label: 'Snapchat', icon: 'snapchat' },
  { value: 'pinterest', label: 'Pinterest', icon: 'pinterest' },
  { value: 'other', label: 'Other', icon: 'globe' },
];

export default async function SocialLinkFormPage({ params }: { params: { id?: string } }) {
  await requireAdmin();
  const isEditing = params.id && params.id !== 'new';
  const socialLink = isEditing ? await prisma.socialLink.findUnique({ where: { id: params.id } }) : null;
  if (isEditing && !socialLink) redirect('/admin/content/social-links');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">{isEditing ? 'تعديل رابط التواصل الاجتماعي' : 'إضافة رابط تواصل اجتماعي جديد'}</h1>
      <form action={async (formData) => {
        'use server';
        const data = {
          platform: formData.get('platform') as string,
          labelAr: formData.get('labelAr') as string,
          labelEn: formData.get('labelEn') as string,
          url: formData.get('url') as string,
          order: parseInt(formData.get('order') as string) || 0,
          isActive: formData.get('isActive') === 'on',
        };
        if (isEditing) await updateSocialLink(params.id!, data);
        else await createSocialLink(data);
        redirect('/admin/content/social-links');
      }} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">المنصة</label>
            <select name="platform" required defaultValue={socialLink?.platform || 'facebook'} className="mt-1 block w-full rounded border-slate-300 text-sm">
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div><label className="block text-sm font-medium">الاسم (عربي)</label><input name="labelAr" defaultValue={socialLink?.labelAr || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div><label className="block text-sm font-medium">الاسم (إنجليزي)</label><input name="labelEn" defaultValue={socialLink?.labelEn || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium">الرابط (URL)</label><input type="url" name="url" required defaultValue={socialLink?.url || ''} className="mt-1 block w-full rounded border-slate-300 text-sm text-left dir-ltr" /></div>
          <div><label className="block text-sm font-medium">الترتيب</label><input type="number" name="order" defaultValue={socialLink?.order ?? 0} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div className="flex items-center gap-2 mt-6"><input type="checkbox" name="isActive" id="isActive" defaultChecked={socialLink ? socialLink.isActive : true} className="rounded text-emerald-600 focus:ring-emerald-500" /><label htmlFor="isActive" className="text-sm font-medium">نشط</label></div>
        </div>
        <div className="flex justify-end pt-4"><button type="submit" className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700">حفظ</button></div>
      </form>
    </div>
  );
}