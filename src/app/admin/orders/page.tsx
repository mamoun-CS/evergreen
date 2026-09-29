import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { Eye } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
const dateFormatter = new Intl.DateTimeFormat('ar-PS', { dateStyle: 'medium', timeStyle: 'short' });

export default async function OrdersPage() {
  await requireAdmin();
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { items: true } } }
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">الطلبات</h1>
          <p className="mt-2 text-sm text-slate-700">إدارة طلبات العملاء وحالات الدفع والتوصيل.</p>
        </div>
      </div>
      
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-right text-sm font-semibold text-slate-900 sm:pl-6">رقم الطلب</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">العميل</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">التاريخ</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">الإجمالي</th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">حالة الطلب</th>
              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">إجراءات</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-bold text-emerald-800 sm:pl-6">{order.orderNumber}</td>
                <td className="px-3 py-4 text-sm text-slate-900">
                  {order.customerName}
                  <div className="text-xs text-slate-500 font-normal">{order.email}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{dateFormatter.format(order.createdAt)}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-slate-900">{Number(order.totalAmount).toLocaleString()} {order.currency}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{order.status}</span>
                </td>
                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6">
                  <Link href={`/admin/orders/${order.id}`} className="text-emerald-600 hover:text-emerald-900 flex items-center justify-end gap-1"><Eye className="h-4 w-4" /> عرض</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <div className="py-10 text-center text-sm text-slate-500">لا توجد طلبات.</div>}
      </div>
    </div>
  );
}
