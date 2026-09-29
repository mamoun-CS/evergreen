import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-middleware';
import PendingOrders from './PendingOrders';
export const dynamic='force-dynamic';
export default async function Page() {
 await requirePermission('update','order');
 const orders=await prisma.order.findMany({where:{paymentMethod:'CASH_ON_DELIVERY',status:'PENDING',requiresAdminConfirmation:true},include:{items:{include:{product:true}}},orderBy:{createdAt:'asc'},take:200});
 return <div className="p-6 space-y-6"><h1 className="text-2xl font-bold">Pending COD orders</h1><PendingOrders orders={orders.map(o=>({id:o.id,orderNumber:o.orderNumber,customerName:o.customerName,total:`${o.totalAmount} ${o.currency}`,createdAt:o.createdAt.toISOString(),items:o.items.map(i=>`${i.product.nameEn} × ${i.quantity}`).join(', '),held:o.heldForReview}))}/></div>;
}
