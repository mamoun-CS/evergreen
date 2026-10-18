import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';
import { buildProductQuery, type ProductParams, type ProductQuery } from './product-query';
import { productCardSelect, serializeCard } from './storefront';

const COUNT_MAX_AGE_MS = 60_000;
// Exactly one persistent key. Arbitrary searches/filter combinations never
// create entries. Prices, inventory and product membership stay live reads.
const readCatalogCount = unstable_cache(async () => ({
  total: await prisma.product.count({ where: {} }), measuredAt: Date.now(),
}), ['public-catalog-count-v1'], { revalidate: 60, tags: ['products', 'categories'] });

async function countProducts(query: ProductQuery) {
  if (Object.keys(query.where).length) return prisma.product.count({ where: query.where });
  const snapshot = await readCatalogCount();
  // Next time-based revalidation can return a stale entry while refreshing.
  // Enforce our own age ceiling, including when background refresh fails.
  return Date.now() - snapshot.measuredAt < COUNT_MAX_AGE_MS
    ? snapshot.total : prisma.product.count({ where: query.where });
}

const readListing = cache(async (key: string) => {
  const query: ProductQuery = JSON.parse(key);
  const [total, products] = await Promise.all([
    countProducts(query),
    prisma.product.findMany({
      where: query.where, orderBy: query.orderBy,
      skip: (query.page - 1) * query.limit, take: query.limit, select: productCardSelect,
    }),
  ]);
  return { products: products.map(serializeCard), total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) || 1 };
});

export function loadProductListing(params: ProductParams, fixedLimit?: number) {
  return readListing(JSON.stringify(buildProductQuery(params, fixedLimit)));
}

export async function loadProductSuggestions(params: ProductParams) {
  const query = buildProductQuery(params);
  const products = await prisma.product.findMany({
    where: query.where, orderBy: query.orderBy, take: Math.min(query.limit, 6),
    select: { id: true, slug: true, sku: true, nameEn: true, nameAr: true, images: true, productImages: productCardSelect.productImages },
  });
  return { products: products.map(serializeCard) };
}
