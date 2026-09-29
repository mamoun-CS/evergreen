import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { Eye } from 'lucide-react';
import Link from 'next/link';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';
const dateFormatter = new Intl.DateTimeFormat('ar-PS', { dateStyle: 'medium' });

export default async function CustomersPage() {
  await requireAdmin();
  const customers = await prisma.user.findMany({
    where: { role: Role.CUSTOMER },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { orders: true } } }
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">العملاء</h1>
          <p className="mt-2 text-sm text-slate-700">إدارة حسابات العملاء المسجلين في المتجر.</p>
        </div>
      </div>
      
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-right text-sm font-semibold text-slate-900 sm:pl-6">الاسم</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">البريد الإلكتروني</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">تاريخ التسجيل</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">الطلبات</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">الحالة</th>
              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">إجراءات</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-bold text-slate-900 sm:pl-6">{c.name}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{c.email}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{dateFormatter.format(c.createdAt)}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{c._count.orders}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                  {c.isActive ? (
                    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">نشط</span>
                  ) : (
                    <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">محظور</span>
                  )}
                </td>
                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6">
                  <Link href={`/admin/customers/${c.id}`} className="text-emerald-600 hover:text-emerald-900 flex items-center justify-end gap-1"><Eye className="h-4 w-4" /> التفاصيل</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && <div className="py-10 text-center text-sm text-slate-500">لا يوجد عملاء.</div>}
      </div>
    </div>
  );
}
