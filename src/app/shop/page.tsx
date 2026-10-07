import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { productCardSelect, serializeCard } from '@/lib/storefront';
import { prisma } from '@/lib/prisma';
import ShopContent from './ShopContent';

export const metadata: Metadata = {
  title: 'المتجر — كتالوج المنتجات | Ever Green',
  description: 'تصفّح كتالوج Ever Green الكامل: أواني الزرع، الديكور، العشب الصناعي، أدوات احترافية، حصى الأنهار، خلطات الزراعة والمزيد — مع فلترة وبحث متقدم.',
  alternates: { canonical: '/shop' },
};

/**
 * Server Component - queries Prisma directly at request-time so the
 * first page of products is already embedded in the HTML (no client
 * fetch needed for the initial render). ShopContent (client) then
 * handles all filtering / pagination updates via SWR + fallbackData.
 */
export default async function ShopPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await (searchParams ?? Promise.resolve({}))) as Record<string, string | string[] | undefined>;

  const page       = Math.max(1, parseInt((sp.page       as string) || '1', 10));
  const limit      = 30;
  const search     = (sp.search      as string) || '';
  const catSlug    = (sp.category    as string) || '';
  const brandId    = (sp.brand       as string) || '';
  const appSlug    = (sp.application as string) || '';
  const sort       = (sp.sort        as string) || 'newest';
  const discounted = sp.discounted === 'true';

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { nameEn:        { contains: search, mode: 'insensitive' } },
      { nameAr:        { contains: search, mode: 'insensitive' } },
      { sku:           { contains: search, mode: 'insensitive' } },
      { descriptionEn: { contains: search, mode: 'insensitive' } },
      { descriptionAr: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (catSlug)    where.categories   = { some: { OR: [{ slug: catSlug }, { id: catSlug }, { parent: { is: { slug: catSlug } } }] } };
  if (brandId)    where.brandId      = brandId;
  if (appSlug)    where.applications = { some: { OR: [{ slug: appSlug }, { id: appSlug }] } };
  if (discounted) where.discountPrice = { not: null };

  const orderBy =
    sort === 'rating'     ? [{ ratingAvg: 'desc' as const }, { ratingCount: 'desc' as const }]
    : sort === 'price-asc'  ? { basePrice: 'asc'  as const }
    : sort === 'price-desc' ? { basePrice: 'desc' as const }
    : sort === 'featured'   ? [{ isFeatured: 'desc' as const }, { createdAt: 'desc' as const }]
    :                          { createdAt: 'desc' as const };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      select: productCardSelect,
      orderBy,
    }),
  ]);

  const initialData = {
    products:   products.map(serializeCard),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };

  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Loading shop...</div>}>
      <ShopContent initialData={initialData} />
    </Suspense>
  );
}
