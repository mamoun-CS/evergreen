CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
ALTER TABLE "Product" ADD COLUMN "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "Review" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orderId" TEXT,
  "rating" INTEGER NOT NULL,
  "title" TEXT,
  "body" TEXT NOT NULL,
  "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Review_productId_userId_key" ON "Review"("productId", "userId");
CREATE INDEX "Review_productId_status_createdAt_idx" ON "Review"("productId", "status", "createdAt");
CREATE INDEX "Review_userId_createdAt_idx" ON "Review"("userId", "createdAt");
CREATE INDEX "Review_orderId_idx" ON "Review"("orderId");
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
