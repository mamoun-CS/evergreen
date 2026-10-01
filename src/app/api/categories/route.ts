import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      orderBy: { nameAr: 'asc' },
      select: {
        id: true,
        slug: true,
        nameAr: true,
        nameEn: true,
        products: {
          where: { isAvailable: true },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: { images: true },
        },
        children: {
          orderBy: { nameAr: 'asc' },
          select: {
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

    return NextResponse.json({
      categories: categories.map(({ products, children, ...category }) => ({
        ...category,
        image: products[0]?.images?.[0] || children.flatMap((child) => child.products)[0]?.images?.[0] || null,
      })),
    });
  } catch (error) {
    console.error('Unable to load root categories:', error);
    return NextResponse.json({ error: 'Unable to load categories.' }, { status: 500 });
  }
}
