import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { updateAdminStatus, updateAdminRole, createAdmin, requestAdminCode } from '../actions/admin-users-actions';

export const dynamic = 'force-dynamic';

export default async function AdminsPage() {
  const session = await getCurrentUser();
  if (!session || session.role !== 'SUPER_ADMIN') {
    redirect('/admin');
  }

  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'MANAGER'] } },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <form action={requestAdminCode}><p>Each admin account change needs a fresh code sent to your email.</p><button className="rounded bg-emerald-700 text-white p-3">Send confirmation code</button></form>
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">مدراء النظام</h1>
          <p className="mt-2 text-sm text-slate-700">إدارة حسابات المدراء وصلاحياتهم.</p>
        </div>
      </div>
      
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">الاسم</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">البريد الإلكتروني</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">الصلاحية</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold">الحالة</th>
              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">إجراءات</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {admins.map((admin) => (
              <tr key={admin.id}>
                <td className="px-3 py-4 text-sm font-bold text-slate-900">{admin.name}</td>
                <td className="px-3 py-4 text-sm text-slate-500 dir-ltr text-right">{admin.email}</td>
                <td className="px-3 py-4 text-sm text-slate-500">
                  {admin.id === session.id ? (
                    <span className="font-bold text-slate-700">{admin.role === 'SUPER_ADMIN' ? 'مدير أعلى' : 'مدير'}</span>
                  ) : (
                    <form action={async (formData) => { 'use server'; await updateAdminRole(admin.id, formData.get('role'), formData.get('confirmationCode')); }} className="flex items-center gap-2">
                      <select name="role" defaultValue={admin.role} className="text-sm rounded border-slate-300 py-1">
                        <option value="MANAGER">Manager (read only)</option><option value="ADMIN">مدير</option>
                        <option value="SUPER_ADMIN">مدير أعلى</option>
                      </select>
                      <label className="block text-sm">Confirmation code<input name="confirmationCode" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} className="border rounded p-2" /></label><button type="submit" className="text-xs bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded">حفظ</button>
                    </form>
                  )}
                </td>
                <td className="px-3 py-4 text-sm text-slate-500">
                  {admin.isActive ? <span className="text-emerald-600 font-bold">نشط</span> : <span className="text-red-600 font-bold">معطل</span>}
                </td>
                <td className="relative py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6">
                  {admin.id !== session.id && (
                    <form action={async (formData) => { 'use server'; await updateAdminStatus(admin.id, !admin.isActive, formData.get('confirmationCode')); }}>
                      <label className="block text-sm">Confirmation code<input name="confirmationCode" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} className="border rounded p-2" /></label><button type="submit" className="text-slate-600 hover:text-slate-900">
                        {admin.isActive ? 'تعطيل' : 'تفعيل'}
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 pt-8 border-t border-slate-200 max-w-md">
        <h2 className="text-lg font-bold mb-4">إضافة مدير جديد</h2>
        <form action={async (formData) => {
          'use server';
          await createAdmin({
            name: formData.get('name'),
            email: formData.get('email'),
            password: formData.get('password'),
            role: formData.get('role'),
          }, formData.get('confirmationCode'));
        }} className="space-y-4">
          <div><label className="block text-sm font-medium">الاسم</label><input required name="name" className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div><label className="block text-sm font-medium">البريد الإلكتروني</label><input required type="email" name="email" className="mt-1 block w-full rounded border-slate-300 text-sm dir-ltr text-right" /></div>
          <div><label className="block text-sm font-medium">كلمة المرور</label><input required type="password" name="password" minLength={12} className="mt-1 block w-full rounded border-slate-300 text-sm dir-ltr text-right" /></div>
          <div><label className="block text-sm font-medium">الصلاحية</label><select name="role" className="mt-1 block w-full rounded border-slate-300 text-sm"><option value="MANAGER">Manager (read only)</option><option value="ADMIN">مدير (ADMIN)</option><option value="SUPER_ADMIN">مدير أعلى (SUPER_ADMIN)</option></select></div>
          <label className="block text-sm">Confirmation code<input name="confirmationCode" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} className="border rounded p-2" /></label><button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">إنشاء الحساب</button>
        </form>
      </div>
    </div>
  );
}
