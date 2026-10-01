import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

export default async function RecoveryCampaignsPage() {
 await requirePermission('read', 'recoveryCampaign');

  const abandonedCarts = await prisma.abandonedCart.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  const totalCarts = await prisma.abandonedCart.count();
  const recoveredCarts = await prisma.abandonedCart.count({ where: { recoveredAt: { not: null } } });
  const emailsSent = await prisma.abandonedCart.count({ where: { recoveryEmailSentAt: { not: null } } });

  const recoveryRate = totalCarts > 0 ? ((recoveredCarts / totalCarts) * 100).toFixed(1) : 0;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Recovery Campaigns</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded shadow border">
          <h3 className="text-gray-500">Total Abandoned</h3>
          <p className="text-2xl font-bold">{totalCarts}</p>
        </div>
        <div className="bg-white p-4 rounded shadow border">
          <h3 className="text-gray-500">Emails Sent</h3>
          <p className="text-2xl font-bold">{emailsSent}</p>
        </div>
        <div className="bg-white p-4 rounded shadow border">
          <h3 className="text-gray-500">Recovered</h3>
          <p className="text-2xl font-bold">{recoveredCarts}</p>
        </div>
        <div className="bg-white p-4 rounded shadow border">
          <h3 className="text-gray-500">Recovery Rate</h3>
          <p className="text-2xl font-bold">{recoveryRate}%</p>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-hidden mt-8">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Abandoned At</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email 1 Sent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {abandonedCarts.map(cart => (
              <tr key={cart.id}>
                <td className="px-6 py-4 whitespace-nowrap">{cart.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">{cart.abandonedAt.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">{String(cart.subtotal)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{cart.recoveryEmailSentAt ? cart.recoveryEmailSentAt.toLocaleString() : 'No'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {cart.recoveredAt ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Recovered</span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
