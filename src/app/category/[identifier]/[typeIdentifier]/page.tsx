import { notFound } from 'next/navigation';
import CategoryTypePageClient from './CategoryTypePageClient';
import { prisma } from '@/lib/prisma';
import { productCardSelect, serializeCard } from '@/lib/storefront';

export default async function CategoryTypePage({ params }: { params: { identifier: string; typeIdentifier: string } }) {
  const parent = await prisma.category.findFirst({
    where: { OR: [{ slug: params.identifier }, { id: params.identifier }] },
    select: { id: true, slug: true, nameAr: true, nameEn: true },
  });
  if (!parent) notFound();

  const isDirectProducts = params.typeIdentifier === '__direct__';
  const type = isDirectProducts
    ? { id: parent.id, slug: '__direct__', nameAr: `منتجات أخرى من ${parent.nameAr}`, nameEn: `Other ${parent.nameEn} products` }
    : await prisma.category.findFirst({
      where: { parentId: parent.id, OR: [{ slug: params.typeIdentifier }, { id: params.typeIdentifier }] },
      select: { id: true, slug: true, nameAr: true, nameEn: true },
    });
  if (!type) notFound();

  const products = await prisma.product.findMany({
    where: { isAvailable: true, categories: { some: { id: type.id } } },
    select: productCardSelect,
    orderBy: [{ isFeatured: 'desc' }, { updatedAt: 'desc' }],
  });

  return <CategoryTypePageClient parent={parent} type={type} products={products.map(serializeCard)} />;
}
