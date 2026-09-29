import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseCompareSlugs } from '@/lib/compare';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const slugs = parseCompareSlugs(request.nextUrl.searchParams.get('slugs'));
  if (!slugs) {
    return NextResponse.json({ error: 'Choose between one and four unique product slugs. / اختر منتجاً إلى أربعة منتجات مختلفة.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  const products = await prisma.product.findMany({ where: { slug: { in: slugs }, isAvailable: true }, select: { id: true, slug: true, nameAr: true, nameEn: true, images: true, basePrice: true, discountPrice: true, currency: true, purchaseMode: true, stockQuantity: true, brand: { select: { name: true } }, categories: { select: { nameAr: true, nameEn: true } }, specifications: { select: { keyAr: true, keyEn: true, valueAr: true, valueEn: true } } } });
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  return NextResponse.json({ products: slugs.flatMap((slug) => { const product = bySlug.get(slug); return product ? [product] : []; }) }, { headers: { 'Cache-Control': 'no-store' } });
}
