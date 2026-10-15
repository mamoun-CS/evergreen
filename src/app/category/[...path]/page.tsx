import { decorationCategorySlugs, orderCategories } from '@/lib/catalog-taxonomy';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { bilingualMetadata } from '@/lib/seo';
import { optimizeProductImagePath, productCardSelect, serializeCard } from '@/lib/storefront';
import CategoryHierarchyPage from './CategoryHierarchyPage';

type TrailCategory = { id: string; slug: string; nameAr: string; nameEn: string; parentId: string | null };

async function findTrail(path: string[]): Promise<TrailCategory[] | null> {
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
}

export async function generateMetadata({ params }: { params: { path: string[] } }): Promise<Metadata> {
  const trail = await findTrail(params.path);
  const category = trail?.at(-1);
  if (!category) return {};
  const details = await prisma.category.findUnique({
    where: { id: category.id },
    select: { metaTitleAr: true, metaTitleEn: true, metaDescAr: true, metaDescEn: true, ogImage: true, imageUrl: true },
  });
  return bilingualMetadata({
    path: `/category/${params.path.map(encodeURIComponent).join('/')}`,
    titleEn: details?.metaTitleEn || `${category.nameEn} | Ever Green`,
    titleAr: details?.metaTitleAr || `${category.nameAr} | Ever Green`,
    descriptionEn: details?.metaDescEn || `Explore ${category.nameEn} products at Ever Green`,
    descriptionAr: details?.metaDescAr || `اكتشف منتجات ${category.nameAr} في Ever Green`,
    image: details?.ogImage || details?.imageUrl,
  });
}

export default async function CategoryPage({ params }: { params: { path: string[] } }) {
  const trail = await findTrail(params.path);
  const category = trail?.at(-1);
  if (!category) notFound();

  const [children, products] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: category.id }, orderBy: { nameAr: 'asc' },
      select: {
        id: true, slug: true, nameAr: true, nameEn: true, imageUrl: true,
        _count: { select: { products: { where: { isAvailable: true } } } },
        products: { where: { isAvailable: true }, orderBy: { updatedAt: 'desc' }, take: 1, select: { images: true } },
      },
    }),
    prisma.product.findMany({
      where: { isAvailable: true, categories: { some: { id: category.id } } },
      select: productCardSelect, orderBy: [{ isFeatured: 'desc' }, { updatedAt: 'desc' }],
    }),
  ]);

  // Counts and preview images must include nested types, not only products
  // assigned directly to the immediate child.
  const hierarchy = await prisma.category.findMany({ select: { id: true, parentId: true } });
  const descendantIds = (id: string): string[] => {
    const ids = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const item of hierarchy) if (item.parentId && ids.has(item.parentId) && !ids.has(item.id)) { ids.add(item.id); changed = true; }
    }
    return [...ids];
  };
  const childSummaries = await Promise.all(children.map(async child => {
    const where = { isAvailable: true, categories: { some: { id: { in: descendantIds(child.id) } } } };
    const [count, preview] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findFirst({ where, orderBy: { updatedAt: 'desc' }, select: { images: true } }),
    ]);
    return { ...child, _count: { products: count }, products: preview ? [preview] : [] };
  }));

  return <CategoryHierarchyPage
    trail={trail!}
    subcategories={orderCategories(childSummaries, category.slug === 'decoration' ? decorationCategorySlugs : []).map(({ products: childProducts, imageUrl, ...child }) => ({
      ...child,
      image: imageUrl ? optimizeProductImagePath(imageUrl) : (childProducts[0]?.images[0] ? optimizeProductImagePath(childProducts[0].images[0]) : null),
    }))}
    products={products.map(serializeCard)}
  />;
}
