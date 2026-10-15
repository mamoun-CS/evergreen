-- Add fields used by the application but missing from older migration histories.
-- IF NOT EXISTS also supports databases that received these fields via db push.
-- Must run before 20261015120000_restore_source_category_catalog.
BEGIN;

ALTER TABLE "Category"
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "metaDescAr" TEXT,
  ADD COLUMN IF NOT EXISTS "metaDescEn" TEXT,
  ADD COLUMN IF NOT EXISTS "metaTitleAr" TEXT,
  ADD COLUMN IF NOT EXISTS "metaTitleEn" TEXT,
  ADD COLUMN IF NOT EXISTS "ogImage" TEXT;

ALTER TABLE "PageContent"
  ADD COLUMN IF NOT EXISTS "metaDescAr" TEXT,
  ADD COLUMN IF NOT EXISTS "metaDescEn" TEXT,
  ADD COLUMN IF NOT EXISTS "metaTitleAr" TEXT,
  ADD COLUMN IF NOT EXISTS "metaTitleEn" TEXT,
  ADD COLUMN IF NOT EXISTS "ogImage" TEXT;

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "metaDescAr" TEXT,
  ADD COLUMN IF NOT EXISTS "metaDescEn" TEXT,
  ADD COLUMN IF NOT EXISTS "metaTitleAr" TEXT,
  ADD COLUMN IF NOT EXISTS "metaTitleEn" TEXT,
  ADD COLUMN IF NOT EXISTS "ogImage" TEXT;

ALTER TABLE "SocialLink"
  ADD COLUMN IF NOT EXISTS "labelAr" TEXT,
  ADD COLUMN IF NOT EXISTS "labelEn" TEXT;
UPDATE "SocialLink" SET "labelAr" = "platform" WHERE "labelAr" IS NULL;
UPDATE "SocialLink" SET "labelEn" = "platform" WHERE "labelEn" IS NULL;
ALTER TABLE "SocialLink" ALTER COLUMN "labelAr" SET NOT NULL;
ALTER TABLE "SocialLink" ALTER COLUMN "labelEn" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "AnnouncementBar" (
  "id" TEXT NOT NULL,
  "textAr" TEXT NOT NULL,
  "textEn" TEXT NOT NULL,
  "linkUrl" TEXT,
  "linkTextAr" TEXT,
  "linkTextEn" TEXT,
  "backgroundColor" TEXT DEFAULT '#0f5132',
  "textColor" TEXT DEFAULT '#ffffff',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AnnouncementBar_pkey" PRIMARY KEY ("id")
);

COMMIT;
