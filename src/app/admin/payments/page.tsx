import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { Eye } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
const dateFormatter = new Intl.DateTimeFormat('ar-PS', { dateStyle: 'medium', timeStyle: 'short' });

export default async function PaymentsPage() {
  await requireAdmin();
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: 'desc' },
    include: { order: { select: { orderNumber: true } } }
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">المدفوعات</h1>
          <p className="mt-2 text-sm text-slate-700">سجل عمليات الدفع الإلكتروني وحالتها.</p>
        </div>
      </div>
      
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-right text-sm font-semibold text-slate-900 sm:pl-6">المرجع</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">رقم الطلب</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">المبلغ</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">الحالة</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">التاريخ</th>
              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">إجراءات</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-bold text-slate-900 sm:pl-6">{payment.reference}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-emerald-700">
                  <Link href={`/admin/orders/${payment.orderId}`}>{payment.order.orderNumber}</Link>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-slate-900">{Number(payment.amount).toLocaleString()} {payment.currency}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${payment.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : payment.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{payment.status}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{dateFormatter.format(payment.createdAt)}</td>
                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6">
                  <Link href={`/admin/payments/${payment.id}`} className="text-emerald-600 hover:text-emerald-900 flex items-center justify-end gap-1"><Eye className="h-4 w-4" /> التفاصيل</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 && <div className="py-10 text-center text-sm text-slate-500">لا توجد عمليات دفع.</div>}
      </div>
    </div>
  );
}
