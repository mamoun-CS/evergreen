-- Storefront filters and sorts. These match the product list, featured, and
-- category-image queries. No existing columns or rows are changed.
CREATE INDEX IF NOT EXISTS "Product_createdAt_idx" ON "Product"("createdAt");
CREATE INDEX IF NOT EXISTS "Product_updatedAt_idx" ON "Product"("updatedAt");
CREATE INDEX IF NOT EXISTS "Product_isFeatured_createdAt_idx" ON "Product"("isFeatured", "createdAt");
CREATE INDEX IF NOT EXISTS "Product_brandId_idx" ON "Product"("brandId");
CREATE INDEX IF NOT EXISTS "Product_isAvailable_stockQuantity_idx" ON "Product"("isAvailable", "stockQuantity");
CREATE INDEX IF NOT EXISTS "Product_discountPrice_idx" ON "Product"("discountPrice");
CREATE INDEX IF NOT EXISTS "Category_parentId_idx" ON "Category"("parentId");
CREATE INDEX IF NOT EXISTS "HomepageSection_isActive_idx" ON "HomepageSection"("isActive");

-- Order table indexes (Phase 2 performance audit additions).
-- Order.userId: account order history queries (WHERE userId = ?)
-- Order.status: admin dashboard pending count and filters (WHERE status = 'PENDING')
-- Order.createdAt: default sort on all admin and account order listings (ORDER BY createdAt DESC)
-- Order(userId, createdAt): composite covers account order history sorted by date
CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order"("userId");
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");
CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX IF NOT EXISTS "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

-- QuoteRequest indexes (missing, used for admin listing sorts)
CREATE INDEX IF NOT EXISTS "QuoteRequest_createdAt_idx" ON "QuoteRequest"("createdAt");
CREATE INDEX IF NOT EXISTS "QuoteRequest_status_idx" ON "QuoteRequest"("status");
