import { prisma } from '@/lib/prisma';
import { getSessionPayload } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AccountOrderDetailsPage({ params }: { params: { id: string } }) {
  const session = await getSessionPayload();
  if (!session) redirect('/login');

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      createdAt: true,
      customerName: true,
      phone: true,
      shippingAddress: true,
      totalAmount: true,
      currency: true,
      paymentMethod: true,
      userId: true,
      items: {
        select: {
          id: true,
          quantity: true,
          price: true,
          product: { select: { nameAr: true, nameEn: true } },
        },
      },
      payments: { select: { id: true, status: true } },
    },
  });

  if (!order || order.userId !== session.userId) {
    redirect('/account/orders');
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">تفاصيل الطلب #{order.orderNumber}</h1>
          <p className="text-sm text-slate-500 mt-1">{order.createdAt.toLocaleDateString('ar-EG')} - {order.createdAt.toLocaleTimeString('ar-EG')}</p>
        </div>
        <span className="px-3 py-1 rounded bg-slate-100 font-bold text-slate-700">{order.status}</span>
      </div>

      <div>
        <h2 className="font-bold text-lg mb-3">المنتجات</h2>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between items-center border p-3 rounded bg-slate-50">
              <div>
                <p className="font-bold text-slate-900">{item.product.nameAr}</p>
                <p className="text-sm text-slate-500">الكمية: {item.quantity}</p>
              </div>
              <p className="font-bold">{item.price.toString()} {order.currency}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t flex justify-between items-center text-lg font-bold">
          <span>المجموع الكلي:</span>
          <span>{order.totalAmount.toString()} {order.currency}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
        <div>
          <h2 className="font-bold mb-2">معلومات الشحن</h2>
          <p className="text-slate-600">{order.customerName}</p>
          <p className="text-slate-600">{order.phone}</p>
          <p className="text-slate-600">{order.shippingAddress}</p>
        </div>
        <div>
          <h2 className="font-bold mb-2">الدفع</h2>
          <p className="text-slate-600">طريقة الدفع: {order.paymentMethod === 'LAHZA' ? 'دفع إلكتروني (لحظة)' : 'الدفع عند الاستلام / تحويل'}</p>
          {order.payments.map((p) => (
            <p key={p.id} className="text-sm text-slate-500 mt-1">حالة الدفع: {p.status}</p>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t">
        <Link href="/account/orders" className="text-emerald-600 font-bold hover:underline">&rarr; العودة للطلبات</Link>
      </div>
    </div>
  );
}
