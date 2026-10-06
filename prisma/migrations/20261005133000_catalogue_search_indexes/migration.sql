-- Fast substring search for the public product catalogue. Prisma's
-- `contains` + `mode: insensitive` produces ILIKE predicates, which PostgreSQL
-- can accelerate with these trigram indexes without changing product data.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Product_nameEn_trgm_idx"
  ON "Product" USING GIN ("nameEn" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Product_nameAr_trgm_idx"
  ON "Product" USING GIN ("nameAr" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Product_sku_trgm_idx"
  ON "Product" USING GIN ("sku" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Product_descriptionEn_trgm_idx"
  ON "Product" USING GIN ("descriptionEn" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Product_descriptionAr_trgm_idx"
  ON "Product" USING GIN ("descriptionAr" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Category_nameEn_trgm_idx"
  ON "Category" USING GIN ("nameEn" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Category_nameAr_trgm_idx"
  ON "Category" USING GIN ("nameAr" gin_trgm_ops);
