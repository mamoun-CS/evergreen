import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Truck, CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function TrackOrderPage({ params, searchParams }: { params: { orderNumber: string }; searchParams: { token?: string } }) {
  const { orderNumber } = params;
  const token = searchParams.token;
  
  if (!token) notFound();

  const order = await prisma.order.findUnique({
    where: { orderNumber, paymentAccessToken: token },
    include: { items: { include: { product: true } } }
  });

  if (!order) notFound();

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy">Order #{order.orderNumber}</h1>
            <p className="text-gray-500">{order.createdAt.toLocaleDateString()}</p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-800">
              {order.status === 'COMPLETED' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              {order.status}
            </span>
            {order.requiresAdminConfirmation && (
              <p className="text-xs text-orange-600 font-medium mt-1">Awaiting confirmation</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-gray-900 mb-2">Order Items</h3>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between border-b border-gray-50 pb-2 text-sm">
                  <span>{item.quantity}x {item.product.nameEn}</span>
                  <span className="font-semibold text-brand-navy">{String(item.price)} ILS</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold text-gray-900 mt-4 pt-4 border-t border-gray-100">
              <span>Total</span>
              <span>{String(order.totalAmount)} ILS</span>
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-lg flex items-start gap-3">
            <Truck className="w-5 h-5 text-slate-400 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900 text-sm">Shipping Information</p>
              <p className="text-sm text-gray-600 mt-1">{order.shippingAddress}</p>
              <p className="text-sm text-gray-600 mt-1">Status: {order.status}</p>
            </div>
          </div>
        </div>

        {!order.userId && (
          <div className="mt-8 pt-6 border-t border-gray-100 text-center space-y-4">
            <p className="text-sm text-gray-600">Want to track your orders in one place?</p>
            <Link href="/login" className="inline-block text-brand-navy font-bold hover:underline">
              Create an account or login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
