import { prisma } from '@/lib/prisma';
import { getClientIp, requirePermission } from '@/lib/auth-middleware';
import { IdSchema, validate } from '@/lib/validation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminAlertsPage() {
  await requirePermission('read', 'alert');

  const alerts = await prisma.adminAlert.findMany({
    where: { dismissedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      product: { select: { id: true, nameEn: true, stockQuantity: true } }
    }
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin Alerts</h1>
      </div>
      
      {alerts.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500">
          No active alerts.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {alerts.map(alert => (
            <div key={alert.id} className="bg-white p-4 rounded-xl border border-red-200 shadow-sm flex justify-between items-center">
              <div>
                <h3 className="font-bold text-red-700">{alert.type === 'LOW_STOCK' ? 'Low Stock Warning' : alert.type}</h3>
                <p className="text-sm text-gray-700 mt-1">
                  Product <Link href={`/admin/products/${alert.product.id}`} className="font-semibold underline">{alert.product.nameEn}</Link> has dropped to {alert.currentStock} items (Threshold: {alert.threshold}).
                </p>
                <p className="text-xs text-gray-500 mt-2">{alert.createdAt.toLocaleString()}</p>
              </div>
              <div>
                <form action={async () => {
                  'use server';
                  const user = await requirePermission('update', 'alert');
                  const id = validate(IdSchema, alert.id);
                  await prisma.$transaction(async (tx) => {
                    const previous = await tx.adminAlert.findUniqueOrThrow({ where: { id } });
                    const updated = await tx.adminAlert.update({ where: { id }, data: { dismissedAt: new Date() } });
                    await tx.adminAuditLog.create({ data: {
                      userId: user.id, action: 'update', resourceType: 'adminAlert', resourceId: id,
                      oldData: { dismissedAt: previous.dismissedAt?.toISOString() ?? null },
                      newData: { dismissedAt: updated.dismissedAt!.toISOString() }, ipAddress: getClientIp(),
                    } });
                  });
                }}>
                  <button type="submit" className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded text-gray-700 font-medium">
                    Dismiss
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
