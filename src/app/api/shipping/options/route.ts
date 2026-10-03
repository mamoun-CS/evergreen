import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const options = await prisma.shippingOption.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { code: true, nameAr: true, nameEn: true, price: true } });
  return NextResponse.json({ options });
}
+