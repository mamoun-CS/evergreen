import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getClientIp } from '@/lib/auth-middleware';
import { consumeRateLimit, rateLimitConfig, rateLimitResponseHeaders } from '@/lib/rate-limit';
import { productCardSelect, serializeCard } from '@/lib/storefront';

export async function GET(req: NextRequest) {
  const rateLimit = await consumeRateLimit(`products:${getClientIp(req.headers)}`, rateLimitConfig.browse.maximum, rateLimitConfig.browse.windowMs);
  if (!rateLimit.allowed) return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429, headers: rateLimitResponseHeaders(rateLimit) });
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('search') || '';
  const productSlug = searchParams.get('slug') || '';
  if (query.length > 120) return NextResponse.json({ error:'Search query is too long.' }, { status:400 });
  const categorySlug = searchParams.get('category') || '';
  const brandId = searchParams.get('brand') || '';
  const applicationSlug = searchParams.get('application') || '';
  const purchaseMode = searchParams.get('purchaseMode') || '';
  const sort = searchParams.get('sort') || 'newest';
  const availability = searchParams.get('availability') || '';
  const featured = searchParams.get('featured') === 'true';
  const discounted = searchParams.get('discounted') === 'true';
  const minPriceParam = searchParams.get('minPrice');
  const maxPriceParam = searchParams.get('maxPrice');
  const minPrice = minPriceParam === null || minPriceParam === '' ? undefined : Number(minPriceParam);
  const maxPrice = maxPriceParam === null || maxPriceParam === '' ? undefined : Number(maxPriceParam);
  const requestedPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const requestedLimit = Number.parseInt(searchParams.get('limit') || '30', 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const limit = Number.isFinite(requestedLimit) ? Math.min(60, Math.max(1, requestedLimit)) : 30;

  try {
    const where: any = {};
    if (productSlug) where.slug = productSlug;

    if (query) {
      where.OR = [
        { nameEn: { contains: query, mode: 'insensitive' } },
        { nameAr: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
        { seriesModel: { contains: query, mode: 'insensitive' } },
        { descriptionEn: { contains: query, mode: 'insensitive' } },
        { descriptionAr: { contains: query, mode: 'insensitive' } },
        { categories: { some: { OR: [
          { nameEn: { contains: query, mode: 'insensitive' } },
          { nameAr: { contains: query, mode: 'insensitive' } },
        ] } } },
      ];
    }

    if (categorySlug) {
      where.categories = {
        some: {
          OR: [
            { slug: categorySlug },
            { id: categorySlug },
            { parent: { is: { slug: categorySlug } } },
          ],
        },
      };
    }

    if (brandId) {
      where.brandId = brandId;
    }

    if (applicationSlug) {
      where.applications = {
        some: {
          OR: [
            { slug: applicationSlug },
            { id: applicationSlug },
          ],
        },
      };
    }

    if (purchaseMode) {
      if (['PURCHASABLE', 'CONTACT_FOR_PRICE'].includes(purchaseMode)) {
        where.purchaseMode = purchaseMode;
      }
    }

    if (availability === 'in-stock') {
      where.isAvailable = true;
      where.stockQuantity = { gt: 0 };
    } else if (availability === 'available') {
      where.isAvailable = true;
    }

    if (featured) where.isFeatured = true;
    if (discounted) where.discountPrice = { not: null };

    if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
      where.basePrice = {
        ...(Number.isFinite(minPrice) ? { gte: minPrice } : {}),
        ...(Number.isFinite(maxPrice) ? { lte: maxPrice } : {}),
      };
    }

    const orderBy = sort === 'rating'
      ? [{ ratingAvg: 'desc' as const }, { ratingCount: 'desc' as const }]
      : sort === 'price-asc'
      ? { basePrice: 'asc' as const }
      : sort === 'price-desc'
        ? { basePrice: 'desc' as const }
        : sort === 'featured'
          ? [{ isFeatured: 'desc' as const }, { createdAt: 'desc' as const }]
          : { createdAt: 'desc' as const };

    const load = async () => {
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
      return {
        products: products.map((product) => serializeCard(product)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    };

    // Search is high-cardinality and stays uncached. Browse listings are public
    // and shared, so a short cache removes repeated counts and joins.
    const payload = query
      ? await load()
      : await unstable_cache(load, ['product-list', JSON.stringify({ where, orderBy, page, limit })], { revalidate: 60, tags: ['products'] })();

    return NextResponse.json(payload, {
      headers: query ? { 'Cache-Control': 'no-store' } : { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error('API Error fetching products:', error);
    return NextResponse.json({ products: [], total: 0, page: 1, limit: 30, totalPages: 1 }, { status: 500 });
  }
}
