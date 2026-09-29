import { prisma } from './prisma';

export async function logInventoryChange(
  productId: string,
  quantityChange: number,
  reason: 'ORDER_CREATED' | 'ORDER_CANCELLED' | 'PAYMENT_SUCCESS' | 'ADMIN_ADJUSTMENT',
  orderId?: string,
  changedBy?: string
) {
  await prisma.inventoryAuditLog.create({
    data: {
      productId,
      quantityChange,
      reason,
      orderId,
      changedBy
    }
  });

  // Check low stock threshold after update
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (product && product.stockQuantity <= 5 && product.isAvailable) {
    // Generate low stock alert
    const existingAlert = await prisma.adminAlert.findFirst({
      where: {
        productId,
        type: 'LOW_STOCK',
        dismissedAt: null,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // don't spam if alerted in last 24h
      }
    });

    if (!existingAlert) {
      await prisma.adminAlert.create({
        data: {
          type: 'LOW_STOCK',
          productId,
          currentStock: product.stockQuantity,
          threshold: 5
        }
      });
      // Optionally trigger email to admin
    }
  }

  // If stock is 0, optionally auto-hide product
  if (product && product.stockQuantity === 0 && product.isAvailable) {
    await prisma.product.update({
      where: { id: productId },
      data: { isAvailable: false }
    });
  }
}
