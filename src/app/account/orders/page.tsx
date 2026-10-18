import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import OrderClaimForm from '@/components/account/OrderClaimForm';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Package, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AccountOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { payments: true }
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-6">طلباتي</h1>
      {user.role === 'CUSTOMER' && <OrderClaimForm />}
      
      {orders.length === 0 ? (
        <div className="text-center py-10 text-slate-500 flex flex-col items-center">
          <Package className="w-12 h-12 mb-3 text-slate-300" />
          <p>لا توجد طلبات حتى الآن.</p>
          <Link href="/shop" className="mt-4 text-emerald-600 font-bold hover:underline">ابدأ التسوق</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-slate-900">طلب #{order.orderNumber}</p>
                <p className="text-sm text-slate-500">{order.createdAt.toLocaleDateString('ar-EG')}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 
                  order.status === 'PENDING' ? 'bg-orange-100 text-orange-800' :
                  order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {order.status === 'COMPLETED' ? 'مكتمل' : order.status === 'PENDING' ? 'قيد الانتظار' : order.status === 'CANCELLED' ? 'ملغي' : order.status}
                </span>
                <Link href={`/account/orders/${order.id}`} className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-sm font-bold">
                  التفاصيل <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
