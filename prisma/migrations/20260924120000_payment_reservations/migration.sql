-- Lahza orders reserve stock briefly while the hosted checkout is active.
ALTER TABLE "Order" ADD COLUMN "inventoryReserved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "reservationExpiresAt" TIMESTAMP(3);
CREATE INDEX "Order_inventoryReserved_reservationExpiresAt_idx" ON "Order"("inventoryReserved", "reservationExpiresAt");
