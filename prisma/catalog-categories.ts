import { PrismaClient } from '@prisma/client';
import { catalogCategories } from '../src/lib/catalog-taxonomy';

export async function applyCatalogCategories(prisma: PrismaClient) {
  await prisma.$transaction(async tx => {
    // Create all nodes first so parent references never depend on list order.
    for (const { parentSlug, ...category } of catalogCategories) {
      await tx.category.upsert({ where: { slug: category.slug }, create: category, update: category });
    }
    for (const { slug, parentSlug } of catalogCategories) {
      const parent = parentSlug ? await tx.category.findUniqueOrThrow({ where: { slug: parentSlug } }) : null;
      await tx.category.update({ where: { slug }, data: { parentId: parent?.id ?? null } });
    }
    // Retain legacy category IDs and links; consolidate their product membership.
    for (const [alias, target] of Object.entries(legacyCategoryTargets)) {
      const old = await tx.category.findUnique({ where: { slug: alias }, include: { products: { select: { id: true } } } });
      if (!old) continue;
      const destination = await tx.category.findUniqueOrThrow({ where: { slug: target } });
      await tx.category.update({ where: { id: destination.id }, data: { products: { connect: old.products } } });
      await tx.category.update({ where: { id: old.id }, data: { parentId: destination.id } });
    }
  }, { timeout: 120000 });
}

export const legacyCategoryTargets: Record<string, string> = {
  aam: 'general',
  'itaytrade-import': 'general',
  'awany-eda': 'alawany-alblastykya',
  planters: 'alawany',
  'pots-planters': 'alawany',
  'garden-accessories': 'outdoor-decor',
  'imported-category-e670faeacba28f3a': 'nwafyr',
  // Mixed imported sculptures require individual review before separating types.
  'altmathyl-altmathyl-walhywanat-walftr': 'statues-ornaments',
};
