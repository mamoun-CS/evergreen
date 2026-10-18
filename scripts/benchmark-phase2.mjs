import nextEnv from '@next/env';
import { PrismaClient, Prisma } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

nextEnv.loadEnvConfig(process.cwd());
const target = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) || !process.argv.includes('--development')) {
  throw new Error('Explicit --development and a local database are required.');
}
target.searchParams.set('connection_limit', '1');
target.searchParams.set('pool_timeout', '10');
const db = new PrismaClient({ datasources: { db: { url: target.toString() } }, log: [{ emit: 'event', level: 'query' }] });
let statements = 0;
db.$on('query', event => { if (/^SELECT/i.test(event.query)) statements++; });
try {
  const result = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '5s'");
    const indexes = await tx.$queryRaw`SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = current_schema() AND tablename IN ('Product','Category','ProductVariant','Specification','ProductImage','Review','_ProductCategories') ORDER BY tablename,indexname`;
    const connections = await tx.$queryRaw`SELECT current_setting('max_connections') AS maximum, count(*)::int AS active_total, count(*) FILTER (WHERE wait_event_type = 'Lock')::int AS waiting_for_lock FROM pg_stat_activity`;
    const total = await tx.product.count();
    const plans = {};
    const selects = {
      fullArabicSearch: Prisma.sql`SELECT p.id FROM "Product" p WHERE p."nameEn" ILIKE ${'%حد%'} OR p."nameAr" ILIKE ${'%حد%'} OR p.sku ILIKE ${'%حد%'} OR p."descriptionEn" ILIKE ${'%حد%'} OR p."descriptionAr" ILIKE ${'%حد%'} OR EXISTS (SELECT 1 FROM "_ProductCategories" pc JOIN "Category" c ON c.id=pc."A" WHERE pc."B"=p.id AND (c."nameEn" ILIKE ${'%حد%'} OR c."nameAr" ILIKE ${'%حد%'})) ORDER BY p."createdAt" DESC, p.id ASC LIMIT 30`,
      searchWithCategoryAndPrice: Prisma.sql`SELECT p.id FROM "Product" p WHERE (p."nameEn" ILIKE ${'%garden%'} OR p."nameAr" ILIKE ${'%garden%'} OR p.sku ILIKE ${'%garden%'} OR p."descriptionEn" ILIKE ${'%garden%'} OR p."descriptionAr" ILIKE ${'%garden%'} OR EXISTS (SELECT 1 FROM "_ProductCategories" pc JOIN "Category" c ON c.id=pc."A" WHERE pc."B"=p.id AND (c."nameEn" ILIKE ${'%garden%'} OR c."nameAr" ILIKE ${'%garden%'}))) AND EXISTS (SELECT 1 FROM "_ProductCategories" pc WHERE pc."B"=p.id AND pc."A"=(SELECT id FROM "Category" ORDER BY id LIMIT 1)) ORDER BY p."basePrice" ASC, p.id ASC LIMIT 30`,
      shortArabic: Prisma.sql`SELECT id FROM "Product" WHERE "nameAr" ILIKE ${'%حد%'} ORDER BY "createdAt" DESC LIMIT 30`,
      english: Prisma.sql`SELECT id FROM "Product" WHERE "nameEn" ILIKE ${'%garden%'} ORDER BY "createdAt" DESC LIMIT 30`,
      multiWord: Prisma.sql`SELECT id FROM "Product" WHERE "descriptionEn" ILIKE ${'%garden decor%'} LIMIT 30`,
      catalogCount: Prisma.sql`SELECT count(*) FROM "Product"`,
      category: Prisma.sql`SELECT p.id FROM "Product" p WHERE EXISTS (SELECT 1 FROM "_ProductCategories" pc WHERE pc."B"=p.id AND pc."A"=(SELECT id FROM "Category" ORDER BY id LIMIT 1)) ORDER BY p."createdAt" DESC LIMIT 30`,
      variants: Prisma.sql`SELECT * FROM "ProductVariant" WHERE "productId"=(SELECT id FROM "Product" ORDER BY id LIMIT 1)`,
      specifications: Prisma.sql`SELECT * FROM "Specification" WHERE "productId"=(SELECT id FROM "Product" ORDER BY id LIMIT 1)`,
      reviews: Prisma.sql`SELECT id FROM "Review" WHERE "productId"=(SELECT id FROM "Product" ORDER BY id LIMIT 1) AND status='APPROVED' ORDER BY "createdAt" DESC LIMIT 5`,
    };
    for (const [name, sql] of Object.entries(selects)) {
      const rows = await tx.$queryRaw(Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`);
      plans[name] = rows[0]['QUERY PLAN'][0];
    }
    const samples = [];
    for (let run = 0; run < 5; run++) {
      const args = { take: 30, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], select: { id: true, slug: true, nameAr: true, nameEn: true, basePrice: true, discountPrice: true, stockQuantity: true, images: true, productImages: { take: 1, orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }], select: { path: true, isMain: true, sortOrder: true } }, brand: { select: { name: true } } } };
      statements = 0;
      let started = performance.now();
      await tx.product.count({ where: {} });
      const products = await tx.product.findMany(args);
      const baseline = { ms: performance.now() - started, sqlSelects: statements };
      statements = 0;
      started = performance.now();
      await tx.product.findMany(args);
      samples.push({ baseline, modeledWarmCountCache: { ms: performance.now() - started, sqlSelects: statements }, rawSelectedBytes: Buffer.byteLength(JSON.stringify(products)) });
    }
    return { localOnly: true, readOnly: true, total, indexes, connections, plans, samples, note: 'Sequential local SELECTs in one read-only transaction. Modeled warm count cache, not HTTP or Next cache latency; not a production benchmark.' };
  }, { timeout: 60000 });
  const directory = path.resolve('artifacts/performance-phase2');
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, 'development-db.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ total: result.total, indexCount: result.indexes.length, connections: result.connections, samples: result.samples, plans: Object.fromEntries(Object.entries(result.plans).map(([key, value]) => [key, { executionMs: value['Execution Time'], node: value.Plan['Node Type'] }])) }, null, 2));
} finally { await db.$disconnect(); }
