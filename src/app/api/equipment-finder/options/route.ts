import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      select: { id: true, nameEn: true, nameAr: true, slug: true, parentId: true },
      orderBy: { nameEn: 'asc' },
    });

    const brands = await prisma.brand.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const applications = await prisma.application.findMany({
      select: { id: true, nameEn: true, nameAr: true, slug: true },
      orderBy: { nameEn: 'asc' },
    });

    return NextResponse.json({
      categories,
      brands: brands.map((b) => ({ id: b.id, nameEn: b.name, nameAr: b.name, slug: b.id })),
      applications,
    });
  } catch (error) {
    console.error('API Error in equipment-finder options:', error);
    return NextResponse.json({ categories: [], brands: [], applications: [] }, { status: 500 });
  }
}
