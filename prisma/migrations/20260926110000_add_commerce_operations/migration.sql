CREATE TYPE "CouponType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

ALTER TABLE "Order" ADD COLUMN "shippingMethod" TEXT NOT NULL DEFAULT 'store-pickup';
ALTER TABLE "Order" ADD COLUMN "shippingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "couponCode" TEXT;

CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ShippingOption" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShippingOption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ShippingOption_code_key" ON "ShippingOption"("code");

CREATE TABLE "Coupon" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "type" "CouponType" NOT NULL,
  "value" DECIMAL(12,2) NOT NULL,
  "minimumAmount" DECIMAL(12,2),
  "maximumUses" INTEGER,
  "usesCount" INTEGER NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

INSERT INTO "ShippingOption" ("id", "code", "nameAr", "nameEn", "price", "sortOrder", "updatedAt") VALUES
  ('shipping-west-bank', 'west-bank', 'التوصيل داخل الضفة الغربية', 'West Bank delivery', 0, 1, CURRENT_TIMESTAMP),
  ('shipping-inside', 'inside', 'التوصيل إلى الداخل', 'Delivery to the interior', 0, 2, CURRENT_TIMESTAMP),
  ('shipping-store-pickup', 'store-pickup', 'استلام من المحل', 'Store pickup', 0, 3, CURRENT_TIMESTAMP);
