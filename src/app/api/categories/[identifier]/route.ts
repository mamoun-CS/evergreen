import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_request: NextRequest, { params }: { params: { identifier: string } }) {
  try {
    const category = await prisma.category.findFirst({
      where: { OR: [{ slug: params.identifier }, { id: params.identifier }] },
      select: {
        id: true,
        slug: true,
        nameAr: true,
        nameEn: true,
        _count: { select: { products: true } },
        children: {
          orderBy: { nameAr: 'asc' },
          select: {
            id: true,
            slug: true,
            nameAr: true,
            nameEn: true,
            _count: { select: { products: true } },
            products: {
              where: { isAvailable: true },
              orderBy: { updatedAt: 'desc' },
              take: 1,
              select: { images: true },
            },
          },
        },
      },
    });

    if (!category) return NextResponse.json({ error: 'Category not found.' }, { status: 404 });

    const isLeaf = category.children.length === 0;

    return NextResponse.json({
      category: { id: category.id, slug: category.slug, nameAr: category.nameAr, nameEn: category.nameEn },
      isLeaf,
      productCount: category._count.products,
      subcategories: category.children.map(({ products, ...child }) => ({
        ...child,
        image: products[0]?.images?.[0] || null,
      })),
    });
  } catch (error) {
    console.error('Unable to load category:', error);
    return NextResponse.json({ error: 'Unable to load category.' }, { status: 500 });
  }
}
