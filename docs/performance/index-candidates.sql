-- REVIEW CANDIDATES ONLY. Not in prisma/migrations; never applied by builds.
-- Apply and benchmark ONLY in an isolated test database first. Confirm existing
-- indexes with pg_indexes and run EXPLAIN (ANALYZE, BUFFERS) on representative
-- reads before deciding which indexes warrant production deployment approval.
-- CREATE INDEX CONCURRENTLY must run outside a transaction.
-- PostgreSQL does not automatically index the referencing side of foreign keys.

-- Product details read both relations by productId; neither has an existing
-- productId-leading index in the committed schema.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ProductVariant_productId_idx"
  ON "ProductVariant" ("productId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Specification_productId_idx"
  ON "Specification" ("productId");

-- Order details and admin order item counts join by orderId.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "OrderItem_orderId_idx"
  ON "OrderItem" ("orderId");

-- Global inventory audit page requests newest 100 records. The current
-- (productId, createdAt) index cannot supply the global createdAt ordering.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "InventoryAuditLog_createdAt_idx"
  ON "InventoryAuditLog" ("createdAt");

-- Search indexes already exist in migration 20261005133000_catalogue_search_indexes.
-- Phase 2's local pg_indexes inspection found that migration's GIN indexes
-- absent from this development database. Do not duplicate their definitions here.
-- Reconcile migration history separately; no migration was applied by this audit.
-- Measured variant/specification scans were below 0.03 ms locally, so the above
-- candidates remain deferred rather than being turned into automatic migrations.
