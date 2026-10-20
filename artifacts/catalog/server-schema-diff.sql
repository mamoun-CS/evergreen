-- DropIndex
DROP INDEX "Category_nameAr_trgm_idx";

-- DropIndex
DROP INDEX "Category_nameEn_trgm_idx";

-- DropIndex
DROP INDEX "Product_descriptionAr_trgm_idx";

-- DropIndex
DROP INDEX "Product_descriptionEn_trgm_idx";

-- DropIndex
DROP INDEX "Product_nameAr_trgm_idx";

-- DropIndex
DROP INDEX "Product_nameEn_trgm_idx";

-- DropIndex
DROP INDEX "Product_sku_trgm_idx";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "metaDescAr" TEXT,
ADD COLUMN     "metaDescEn" TEXT,
ADD COLUMN     "metaTitleAr" TEXT,
ADD COLUMN     "metaTitleEn" TEXT,
ADD COLUMN     "ogImage" TEXT;

-- AlterTable
ALTER TABLE "PageContent" ADD COLUMN     "metaDescAr" TEXT,
ADD COLUMN     "metaDescEn" TEXT,
ADD COLUMN     "metaTitleAr" TEXT,
ADD COLUMN     "metaTitleEn" TEXT,
ADD COLUMN     "ogImage" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "metaDescAr" TEXT,
ADD COLUMN     "metaDescEn" TEXT,
ADD COLUMN     "metaTitleAr" TEXT,
ADD COLUMN     "metaTitleEn" TEXT,
ADD COLUMN     "ogImage" TEXT;

-- AlterTable
ALTER TABLE "SocialLink" ADD COLUMN     "labelAr" TEXT NOT NULL,
ADD COLUMN     "labelEn" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "AnnouncementBar" (
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
