-- Add optional catalogue metadata without changing or removing existing products.
ALTER TABLE "Product" ADD COLUMN "discountPrice" DECIMAL(12,2);
ALTER TABLE "Product" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN "material" TEXT;
ALTER TABLE "Product" ADD COLUMN "color" TEXT;
ALTER TABLE "Product" ADD COLUMN "style" TEXT;
ALTER TABLE "Product" ADD COLUMN "lengthCm" DECIMAL(10,2);
ALTER TABLE "Product" ADD COLUMN "widthCm" DECIMAL(10,2);
ALTER TABLE "Product" ADD COLUMN "heightCm" DECIMAL(10,2);
ALTER TABLE "Product" ADD COLUMN "weightKg" DECIMAL(10,2);

CREATE INDEX "Product_isFeatured_createdAt_idx" ON "Product"("isFeatured", "createdAt");
CREATE INDEX "Product_isAvailable_basePrice_idx" ON "Product"("isAvailable", "basePrice");
