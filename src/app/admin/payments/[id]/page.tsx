import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
const dateFormatter = new Intl.DateTimeFormat('ar-PS', { dateStyle: 'long', timeStyle: 'short' });

export default async function PaymentDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    include: { order: true }
  });

  if (!payment) notFound();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">تفاصيل الدفع</h1>
        <p className="mt-1 text-sm text-slate-500">المرجع: {payment.reference}</p>
      </div>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 border-b border-slate-100 pb-2">معلومات العملية</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">بوابة الدفع:</span><span className="font-semibold text-slate-900">{payment.provider}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">معرف العملية (Gateway):</span><span className="font-semibold text-slate-900">{payment.providerTransactionId || '-'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">المبلغ:</span><span className="font-bold text-emerald-700">{Number(payment.amount).toLocaleString()} {payment.currency}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">الحالة:</span><span className="font-semibold text-slate-900">{payment.status}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">تاريخ الإنشاء:</span><span className="font-semibold text-slate-900">{dateFormatter.format(payment.createdAt)}</span></div>
            {payment.paidAt && <div className="flex justify-between"><span className="text-slate-500">تاريخ الدفع:</span><span className="font-semibold text-slate-900">{dateFormatter.format(payment.paidAt)}</span></div>}
            {payment.failedAt && <div className="flex justify-between"><span className="text-slate-500">تاريخ الفشل:</span><span className="font-semibold text-red-600">{dateFormatter.format(payment.failedAt)}</span></div>}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 border-b border-slate-100 pb-2">تفاصيل البطاقة / القناة</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">قناة الدفع:</span><span className="font-semibold text-slate-900">{payment.channel || '-'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">نوع البطاقة:</span><span className="font-semibold text-slate-900">{payment.cardBrand || '-'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">آخر 4 أرقام:</span><span className="font-semibold text-slate-900">{payment.cardLast4 ? `**** ${payment.cardLast4}` : '-'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">البنك المصدر:</span><span className="font-semibold text-slate-900">{payment.bank || '-'}</span></div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex">
        <Link href={`/admin/orders/${payment.orderId}`} className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900">
          عرض الطلب المرتبط (#{payment.order.orderNumber})
        </Link>
      </div>
    </div>
  );
}
