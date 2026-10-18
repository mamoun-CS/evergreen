import { categoryChildren, orderCategories } from '@/lib/catalog-taxonomy';
import { Metadata } from 'next';
import { cache } from 'react';
import { descendantCategoryIds, summarizeChildren } from '@/lib/category-summaries';
import { CATEGORY_PAGE_SIZE, categoryPage } from '@/lib/category-pagination';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { bilingualMetadata } from '@/lib/seo';
import { getCategoryMetadata, optimizeProductImagePath, productCardSelect, serializeCard } from '@/lib/storefront';
import CategoryHierarchyPage from './CategoryHierarchyPage';

type TrailCategory = { id: string; slug: string; nameAr: string; nameEn: string; parentId: string | null };

const findTrail = cache(async (pathKey: string): Promise<TrailCategory[] | null> => {
  const path = JSON.parse(pathKey) as string[];
  // Keep links created by older menus working. They used /category/<leaf-slug>
  // even when that leaf has a parent. Resolve it and reconstruct its full
  // breadcrumb instead of returning a misleading 404.
  if (path.length === 1) {
    let current: TrailCategory | null = await prisma.category.findFirst({
      where: { OR: [{ slug: path[0] }, { id: path[0] }] },
      select: { id: true, slug: true, nameAr: true, nameEn: true, parentId: true },
    });
    if (!current) return null;
    const reverseTrail = [current];
    while (current.parentId) {
      current = await prisma.category.findUnique({
        where: { id: current.parentId },
        select: { id: true, slug: true, nameAr: true, nameEn: true, parentId: true },
      });
      if (!current) return null;
      reverseTrail.push(current);
    }
    return reverseTrail.reverse();
  }

  const trail: TrailCategory[] = [];
  let parentId: string | null = null;

  for (const identifier of path) {
    const category: TrailCategory | null = await prisma.category.findFirst({
      where: { parentId, OR: [{ slug: identifier }, { id: identifier }] },
      select: { id: true, slug: true, nameAr: true, nameEn: true, parentId: true },
    });
    if (!category) return null;
    trail.push(category);
    parentId = category.id;
  }
  return trail;
});

export async function generateMetadata({ params }: { params: { path: string[] } }): Promise<Metadata> {
  const trail = await findTrail(JSON.stringify(params.path));
  const category = trail?.at(-1);
  if (!category) return {};
  const details = await getCategoryMetadata(category.id);
  return bilingualMetadata({
    path: `/category/${params.path.map(encodeURIComponent).join('/')}`,
    titleEn: details?.metaTitleEn || `${category.nameEn} | Ever Green`,
    titleAr: details?.metaTitleAr || `${category.nameAr} | Ever Green`,
    descriptionEn: details?.metaDescEn || `Explore ${category.nameEn} products at Ever Green`,
    descriptionAr: details?.metaDescAr || `اكتشف منتجات ${category.nameAr} في Ever Green`,
    image: details?.ogImage || details?.imageUrl,
  });
}

export default async function CategoryPage({ params, searchParams }: { params: { path: string[] }; searchParams?: { page?: string | string[] } }) {
  const trail = await findTrail(JSON.stringify(params.path));
  const category = trail?.at(-1);
  if (!category) notFound();

  const where = { isAvailable: true, categories: { some: { id: category.id } } };
  const [children, total, hierarchy] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: category.id }, orderBy: { nameAr: 'asc' },
      select: {
        id: true, slug: true, nameAr: true, nameEn: true, imageUrl: true,
      },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ select: { id: true, parentId: true } }),
  ]);

  // One batched product read replaces two reads per immediate child.
  const subtreeIds = [...new Set(children.flatMap(child => [...descendantCategoryIds(child.id, hierarchy)]))];
  const pagination = categoryPage(searchParams?.page, total);
  const [products, previews] = await Promise.all([
    prisma.product.findMany({
      where, select: productCardSelect,
      orderBy: [{ isFeatured: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }],
      skip: pagination.skip, take: CATEGORY_PAGE_SIZE,
    }),
    subtreeIds.length ? prisma.product.findMany({
      where: { isAvailable: true, categories: { some: { id: { in: subtreeIds } } } },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, images: true, categories: { select: { id: true } } },
    }) : Promise.resolve([]),
  ]);
  const childSummaries = summarizeChildren(children, hierarchy, previews);

  return <CategoryHierarchyPage
    trail={trail!}
    subcategories={orderCategories(childSummaries, categoryChildren[category.slug] || []).map(({ products: childProducts, imageUrl, ...child }) => ({
      ...child,
      image: imageUrl ? optimizeProductImagePath(imageUrl) : (childProducts[0]?.images[0] ? optimizeProductImagePath(childProducts[0].images[0]) : null),
    }))}
    products={products.map(serializeCard)}
    pagination={pagination}
  />;
}
