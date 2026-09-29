import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

export default async function InventoryAuditPage() {
  await requirePermission('read', 'product');

  const logs = await prisma.inventoryAuditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      product: { select: { nameEn: true, nameAr: true, stockQuantity: true } }
    }
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Inventory Audit Logs</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Context</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map(log => (
              <tr key={log.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.createdAt.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.product.nameEn}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded font-bold ${log.quantityChange > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {log.quantityChange > 0 ? '+' : ''}{log.quantityChange}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.reason}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.orderId || log.changedBy || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">{log.product.stockQuantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
