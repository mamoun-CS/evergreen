-- Preserve existing product availability by translating legacy quote-only rows.
UPDATE "Product"
SET "purchaseMode" = 'CONTACT_FOR_PRICE'
WHERE "purchaseMode"::text = 'QUOTE_ONLY';

-- PostgreSQL enums cannot remove a single value in place; recreate the type.
ALTER TABLE "Product" ALTER COLUMN "purchaseMode" DROP DEFAULT;
ALTER TYPE "PurchaseMode" RENAME TO "PurchaseMode_old";
CREATE TYPE "PurchaseMode" AS ENUM ('PURCHASABLE', 'CONTACT_FOR_PRICE');
ALTER TABLE "Product"
  ALTER COLUMN "purchaseMode" TYPE "PurchaseMode"
  USING ("purchaseMode"::text::"PurchaseMode");
DROP TYPE "PurchaseMode_old";
ALTER TABLE "Product" ALTER COLUMN "purchaseMode" SET DEFAULT 'PURCHASABLE';
