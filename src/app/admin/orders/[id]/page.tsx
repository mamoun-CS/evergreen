import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { updateOrderStatus } from '../../actions/order-actions';
import { OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';
const dateFormatter = new Intl.DateTimeFormat('ar-PS', { dateStyle: 'long', timeStyle: 'short' });

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { product: true } },
      payments: true,
      user: true,
    }
  });

  if (!order) notFound();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">طلب #{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-slate-500">{dateFormatter.format(order.createdAt)}</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <form action={async (formData) => {
            'use server';
            const s = formData.get('status') as OrderStatus;
            await updateOrderStatus(order.id, s);
          }} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
            <label htmlFor="status" className="text-sm font-semibold text-slate-700">الحالة:</label>
            <select name="status" id="status" defaultValue={order.status} className="block w-40 rounded-md border-slate-300 py-1.5 pl-3 pr-10 text-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500">
              {Object.values(OrderStatus).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <button type="submit" className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-200">تحديث</button>
          </form>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h2 className="font-bold text-slate-900">المنتجات</h2>
            </div>
            <ul className="divide-y divide-slate-100 p-4">
              {order.items.map(item => (
                <li key={item.id} className="flex justify-between py-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.product.nameAr}</p>
                    <p className="text-sm text-slate-500">{Number(item.price)} × {item.quantity}</p>
                  </div>
                  <p className="font-bold text-slate-900">{(Number(item.price) * item.quantity).toLocaleString()} {order.currency}</p>
                </li>
              ))}
            </ul>
            <div className="bg-slate-50 px-4 py-3 text-left">
              <p className="text-lg font-extrabold text-emerald-800">الإجمالي: {Number(order.totalAmount).toLocaleString()} {order.currency}</p>
            </div>
          </div>
          
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h2 className="font-bold text-slate-900">المدفوعات</h2>
            </div>
            <div className="p-4">
              {order.payments.length > 0 ? (
                <div className="space-y-4">
                  {order.payments.map(payment => (
                    <div key={payment.id} className="rounded-lg border border-slate-100 p-3 bg-slate-50 text-sm">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>{payment.provider}</span>
                        <span>{Number(payment.amount).toLocaleString()} {payment.currency}</span>
                      </div>
                      <div className="mt-2 text-slate-600 space-y-1">
                        <p>الحالة: <span className="font-semibold">{payment.status}</span></p>
                        <p>المرجع: {payment.reference}</p>
                        {payment.cardBrand && <p>البطاقة: {payment.cardBrand} **** {payment.cardLast4}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">لا توجد معلومات دفع.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h2 className="font-bold text-slate-900">العميل</h2>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <p><span className="text-slate-500 font-semibold">الاسم:</span> {order.customerName}</p>
              <p><span className="text-slate-500 font-semibold">البريد:</span> {order.email}</p>
              <p><span className="text-slate-500 font-semibold">الهاتف:</span> {order.phone}</p>
              {order.user && (
                <div className="mt-3 inline-block rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                  عضو مسجل
                </div>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h2 className="font-bold text-slate-900">عنوان التوصيل</h2>
            </div>
            <div className="p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {order.shippingAddress}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
