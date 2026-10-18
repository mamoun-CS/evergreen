import type { Prisma } from '@prisma/client';

export type ProductParams = { get: (key: string) => string | null };

/** Shared public matching rules. No availability restriction is implicit:
 * the storefront has always displayed unavailable/contact-for-price products. */
export function buildProductQuery(params: ProductParams, fixedLimit?: number) {
  const search = params.get('search') || '';
  if (search.length > 120) throw new RangeError('Search query is too long.');
  const requestedPage = Number.parseInt(params.get('page') || '1', 10);
  const requestedLimit = fixedLimit ?? Number.parseInt(params.get('limit') || '30', 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(60, Math.max(1, requestedLimit)) : 30;
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= Math.floor(Number.MAX_SAFE_INTEGER / limit) ? requestedPage : 1;
  const where: Prisma.ProductWhereInput = {};
  const slug = params.get('slug');
  if (slug) where.slug = slug;
  if (search) where.OR = [
    { nameEn: { contains: search, mode: 'insensitive' } },
    { nameAr: { contains: search, mode: 'insensitive' } },
    { sku: { contains: search, mode: 'insensitive' } },
    { descriptionEn: { contains: search, mode: 'insensitive' } },
    { descriptionAr: { contains: search, mode: 'insensitive' } },
    { categories: { some: { OR: [
      { nameEn: { contains: search, mode: 'insensitive' } },
      { nameAr: { contains: search, mode: 'insensitive' } },
    ] } } },
  ];
  const category = params.get('category');
  if (category) where.categories = { some: { OR: [{ slug: category }, { id: category }, { parent: { is: { slug: category } } }] } };
  const brand = params.get('brand');
  if (brand) where.brandId = brand;
  const application = params.get('application');
  if (application) where.applications = { some: { OR: [{ slug: application }, { id: application }] } };
  const purchaseMode = params.get('purchaseMode');
  if (purchaseMode === 'PURCHASABLE' || purchaseMode === 'CONTACT_FOR_PRICE') where.purchaseMode = purchaseMode;
  const availability = params.get('availability');
  if (availability === 'in-stock' || availability === 'available') where.isAvailable = true;
  if (availability === 'in-stock') where.stockQuantity = { gt: 0 };
  if (params.get('featured') === 'true') where.isFeatured = true;
  if (params.get('discounted') === 'true') where.discountPrice = { not: null };
  const price = (key: string) => {
    const raw = params.get(key);
    return raw === null || raw === '' || !Number.isFinite(Number(raw)) ? undefined : Number(raw);
  };
  const minPrice = price('minPrice');
  const maxPrice = price('maxPrice');
  if (minPrice !== undefined || maxPrice !== undefined) where.basePrice = {
    ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
  };
  const sort = params.get('sort');
  const orderBy: Prisma.ProductOrderByWithRelationInput[] = sort === 'rating'
    ? [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }]
    : sort === 'price-asc' ? [{ basePrice: 'asc' }]
    : sort === 'price-desc' ? [{ basePrice: 'desc' }]
    : sort === 'featured' ? [{ isFeatured: 'desc' }, { createdAt: 'desc' }]
    : [{ createdAt: 'desc' }];
  orderBy.push({ id: 'asc' });
  return { where, orderBy, page, limit };
}

export type ProductQuery = ReturnType<typeof buildProductQuery>;
