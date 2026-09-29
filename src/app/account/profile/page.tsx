import { prisma } from '@/lib/prisma';
import { getSessionPayload } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { updateProfile } from '../actions';
import { UserRound } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AccountProfilePage() {
  const session = await getSessionPayload();
  if (!session) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });

  if (!user) redirect('/login');

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm max-w-2xl">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-6 flex items-center gap-2">
        <UserRound className="w-6 h-6" /> الملف الشخصي
      </h1>
      
      <form action={async (formData) => {
        'use server';
        await updateProfile({
          name: formData.get('name'),
          phone: formData.get('phone'),
          language: formData.get('language'),
        });
      }} className="space-y-4">
        
        <div>
          <label className="block text-sm font-medium text-slate-700">البريد الإلكتروني (لا يمكن تغييره)</label>
          <input disabled type="email" value={user.email} className="mt-1 block w-full rounded border-slate-300 bg-slate-100 text-slate-500 text-sm cursor-not-allowed dir-ltr text-right" />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700">الاسم الكامل</label>
          <input required name="name" defaultValue={user.name} className="mt-1 block w-full rounded border-slate-300 text-sm focus:border-emerald-500 focus:ring-emerald-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">رقم الهاتف</label>
          <input name="phone" defaultValue={user.phone || ''} className="mt-1 block w-full rounded border-slate-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 dir-ltr text-right" />
        </div>

        <label className="block">Email language / لغة البريد<select name="language" defaultValue={user.language} className="block border p-2"><option value="ar">العربية</option><option value="en">English</option></select></label>
        <div className="pt-4">
          <button type="submit" className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition-colors">
            حفظ التغييرات
          </button>
        </div>
      </form>
    </div>
  );
}
