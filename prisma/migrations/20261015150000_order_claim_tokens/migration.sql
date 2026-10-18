-- CreateTable
CREATE TABLE "OrderClaimToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'ORDER_CLAIM',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderClaimToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderClaimToken_tokenHash_key" ON "OrderClaimToken"("tokenHash");

-- CreateIndex
CREATE INDEX "OrderClaimToken_orderId_userId_idx" ON "OrderClaimToken"("orderId", "userId");

-- CreateIndex
CREATE INDEX "OrderClaimToken_expiresAt_idx" ON "OrderClaimToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "OrderClaimToken" ADD CONSTRAINT "OrderClaimToken_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderClaimToken" ADD CONSTRAINT "OrderClaimToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
