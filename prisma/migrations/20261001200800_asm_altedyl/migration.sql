-- DropIndex
DROP INDEX "Order_fulfillmentNeedsReview_idx";

-- DropIndex
DROP INDEX "Order_inventoryReserved_reservationExpiresAt_idx";

-- DropIndex
DROP INDEX "OrderItem_variantId_idx";

-- DropIndex
DROP INDEX "Product_isAvailable_basePrice_idx";

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "shippingMethod" DROP DEFAULT;

-- CreateTable
CREATE TABLE "AbandonedCart" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "recoveryEmailSentAt" TIMESTAMP(3),
    "recoveryEmail2SentAt" TIMESTAMP(3),
    "recoveredAt" TIMESTAMP(3),
    "abandonedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbandonedCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAuditLog" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityChange" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "orderId" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAlert" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "currentStock" INTEGER NOT NULL,
    "threshold" INTEGER NOT NULL,
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AbandonedCart_email_abandonedAt_idx" ON "AbandonedCart"("email", "abandonedAt");

-- CreateIndex
CREATE INDEX "AbandonedCart_recoveryEmailSentAt_idx" ON "AbandonedCart"("recoveryEmailSentAt");

-- CreateIndex
CREATE INDEX "InventoryAuditLog_productId_createdAt_idx" ON "InventoryAuditLog"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAlert_type_dismissedAt_createdAt_idx" ON "AdminAlert"("type", "dismissedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Product_basePrice_idx" ON "Product"("basePrice");

-- CreateIndex
CREATE INDEX "Product_purchaseMode_idx" ON "Product"("purchaseMode");

-- AddForeignKey
ALTER TABLE "InventoryAuditLog" ADD CONSTRAINT "InventoryAuditLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAlert" ADD CONSTRAINT "AdminAlert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
