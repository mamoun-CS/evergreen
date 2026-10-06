-- Preserve the existing Product model and add only import provenance/metadata.
ALTER TABLE "Product" ADD COLUMN "externalId" TEXT;
ALTER TABLE "Product" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "Product" ADD COLUMN "externalSize" TEXT;
ALTER TABLE "Product" ADD COLUMN "importDetails" TEXT;

CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Product_externalId_key" ON "Product"("externalId");
CREATE UNIQUE INDEX "ProductImage_productId_path_key" ON "ProductImage"("productId", "path");
CREATE INDEX "ProductImage_productId_isMain_sortOrder_idx" ON "ProductImage"("productId", "isMain", "sortOrder");

ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
