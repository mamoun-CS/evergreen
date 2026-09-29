import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { toggleCustomerStatus } from '../../actions/customer-actions';

export const dynamic = 'force-dynamic';
const dateFormatter = new Intl.DateTimeFormat('ar-PS', { dateStyle: 'long', timeStyle: 'short' });

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const customer = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });

  if (!customer) notFound();

  const totalSpent = customer.orders.filter(o => o.status === 'COMPLETED').reduce((acc, order) => acc + Number(order.totalAmount), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{customer.name}</h1>
          <p className="mt-1 text-sm text-slate-500">مسجل منذ {dateFormatter.format(customer.createdAt)}</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <form action={async () => {
            'use server';
            await toggleCustomerStatus(customer.id, !customer.isActive);
          }}>
            <button type="submit" className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm ${customer.isActive ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
              {customer.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
            </button>
          </form>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-500">البريد الإلكتروني</h3>
          <p className="mt-2 text-lg font-bold text-slate-900">{customer.email}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-500">إجمالي الطلبات</h3>
          <p className="mt-2 text-lg font-bold text-slate-900">{customer.orders.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-500">القيمة الإجمالية (المدفوعة)</h3>
          <p className="mt-2 text-lg font-bold text-emerald-700">{totalSpent.toLocaleString()} ILS</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="font-bold text-slate-900">آخر الطلبات</h2>
        </div>
        <div className="p-4">
          {customer.orders.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {customer.orders.map(order => (
                <div key={order.id} className="flex justify-between py-3">
                  <div>
                    <a href={`/admin/orders/${order.id}`} className="font-bold text-emerald-700 hover:underline">{order.orderNumber}</a>
                    <p className="text-xs text-slate-500">{dateFormatter.format(order.createdAt)}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-900">{Number(order.totalAmount).toLocaleString()} {order.currency}</p>
                    <p className="text-xs font-semibold text-slate-500">{order.status}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">لا توجد طلبات لهذا العميل.</p>
          )}
        </div>
      </div>
    </div>
  );
}
