import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'node:fs';
import { sourceCategoryLabels } from '../src/lib/catalog-taxonomy';

const prisma = new PrismaClient();

type CategoryGroup = {
  parent: { slug: string; nameAr: string; nameEn: string };
  children: string[];
};

/**
 * Curated browse taxonomy for catalogue imports.  Only categories with a clear
 * customer-facing relationship are included; supplier and catch-all buckets
 * deliberately stay untouched until their products receive individual review.
 */
const groups: CategoryGroup[] = [
  {
    parent: { slug: 'decoration', nameAr: 'الديكور', nameEn: 'Decoration' },
    children: ['statues-ornaments', 'fountains-water-features', 'outdoor-decor', 'garden-lighting', 'garden-accessories'],
  },
  {
    parent: { slug: 'alawany', nameAr: 'الأواني', nameEn: 'Pots' },
    children: [
      'alawany-alblastykya', 'alawany-altaylandya', 'alawany-alzjajya', 'alawany-almadnya',
      'alawany-khmr', 'alawany-walmzarawn-almtlya-balkhshb-altbyay', 'alsghyra-walmtwsta',
      'alqdwr-albrazylya', 'alkwws-walawaya-waljrar-alzkhrfya', 'awany-eda', 'awany-kwrtn',
      'tyrakwta-aytalya', 'pots-planters', 'floor-planters', 'mntjat-alkhws-wjwz-alhnd',
      'planters',
    ],
  },
  {
    parent: { slug: 'statues-ornaments', nameAr: 'تماثيل وتحف خارجية', nameEn: 'Statues & Outdoor Ornaments' },
    children: ['animal-sculptures', 'altmathyl-altmathyl-walhywanat-walftr', 'tmathyl-arqam', 'tmathyl-hywanat-blastykya', 'tmathyl-hywanat-qabla-llzraaa'],
  },
  {
    parent: { slug: 'fountains-water-features', nameAr: 'نوافير وشلالات', nameEn: 'Fountains & Water Features' },
    children: ['stone-fountains', 'modern-fountains', 'nwafyr', 'imported-category-e670faeacba28f3a', 'imported-category-7d0ba1c3ad4e041e'],
  },
  {
    parent: { slug: 'artificial-greenery', nameAr: 'النباتات والعشب الصناعي', nameEn: 'Artificial Greenery & Turf' },
    children: ['alashb-alsnaay', 'mlhqat-alashb-alsnaay', 'aljdar-alakhdr', 'nbatat-astnaaya'],
  },
  {
    parent: { slug: 'irrigation-systems', nameAr: 'أنظمة ومستلزمات الري', nameEn: 'Irrigation Systems & Supplies' },
    children: ['terraflex', 'mntjat-alry-mn-altytanywm'],
  },
  {
    parent: { slug: 'gardening-supplies', nameAr: 'مستلزمات الزراعة', nameEn: 'Gardening Supplies' },
    children: ['aamda-alzraaa-almayya-anzma-alnmw-alamwdy-llmnzl-walshrfa', 'jdawl-alfydanat', 'khltat-alzra', 'shbkat-alzl'],
  },
  {
    parent: { slug: 'outdoor-surfaces', nameAr: 'الأرضيات وتنسيق الحدائق', nameEn: 'Outdoor Surfaces & Landscaping' },
    children: ['terrace-it', 'almdrjat', 'altwf-walahjar', 'hsa-alnhr', 'aswar-alkhyzran'],
  },
  {
    parent: { slug: 'aladwat-almhnya', nameAr: 'أدوات احترافية', nameEn: 'Professional Tools' },
    children: ['arbat-alyd-walarbat'],
  },
  {
    parent: { slug: 'outdoor-decor', nameAr: 'ديكورات خارجية', nameEn: 'Outdoor Decor' },
    children: ['alaamda-alrwmanya'],
  },
];

// Correct only labels whose meaning is unambiguous from the imported English
// category name and the products currently assigned to it.
const labelCorrections = [
  { slug: 'alawany-alzjajya', nameAr: 'أواني مزجّجة', nameEn: 'Glazed Pots' },
  { slug: 'alawany-khmr', nameAr: 'أواني فينتج', nameEn: 'Vintage Pots' },
  { slug: 'altmathyl-altmathyl-walhywanat-walftr', nameAr: 'تماثيل وأشكال حيوانات وفطر', nameEn: 'Statues – Gnomes, Animals and Mushrooms' },
  { slug: 'tmathyl-arqam', nameAr: 'تماثيل شخصيات', nameEn: 'Statues – Figures' },
  { slug: 'jdawl-alfydanat', nameAr: 'طاولات المدّ والجزر', nameEn: 'Flood Tables' },
  { slug: 'almdrjat', nameAr: 'تراسات', nameEn: 'Terraces' },
  { slug: 'imported-category-7d0ba1c3ad4e041e', nameAr: 'نوافير جدارية حجرية', nameEn: 'Stone Wall Fountains' },
];

async function main() {
  for (const group of groups) {
    const parent = await prisma.category.upsert({
      where: { slug: group.parent.slug },
      update: { nameAr: group.parent.nameAr, nameEn: group.parent.nameEn },
      create: group.parent,
      select: { id: true, slug: true },
    });

    const result = await prisma.category.updateMany({
      where: { slug: { in: group.children }, id: { not: parent.id } },
      data: { parentId: parent.id },
    });
    console.log(`${parent.slug}: ${result.count} categories organized`);
  }

  for (const correction of labelCorrections) {
    await prisma.category.updateMany({
      where: { slug: correction.slug },
      data: { nameAr: correction.nameAr, nameEn: correction.nameEn },
    });
  }

  // Supplier card images and direct navigation match the verified source.
  // Existing secondary groups and product relations remain intact.
  const manifestPath = 'data/catalog-category-assets.json';
  if (existsSync(manifestPath)) {
    const assets: { slug: string; localImage: string; parent: string | null }[] = JSON.parse(readFileSync(manifestPath, 'utf8'));
    for (const asset of assets) {
      const labels = sourceCategoryLabels[asset.slug];
      if (!labels || !existsSync(`public${asset.localImage}`)) throw new Error(`Missing category asset: ${asset.slug}`);
      const parent = asset.parent ? await prisma.category.findUniqueOrThrow({ where: { slug: asset.parent } }) : null;
      await prisma.category.upsert({
        where: { slug: asset.slug },
        create: { slug: asset.slug, nameAr: labels[0], nameEn: labels[1], imageUrl: asset.localImage, parentId: parent?.id ?? null },
        update: { nameAr: labels[0], nameEn: labels[1], imageUrl: asset.localImage, parentId: parent?.id ?? null },
      });
    }
    console.log(`Restored ${assets.length} verified source category cards`);
  }

}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
