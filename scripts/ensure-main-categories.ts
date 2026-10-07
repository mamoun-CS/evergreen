import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { slug: 'planters', nameAr: 'أواني الزرع', nameEn: 'Planters' },
  { slug: 'decoration', nameAr: 'الديكور', nameEn: 'Decoration' },
  { slug: 'alashb-alsnaay', nameAr: 'العشب الصناعي', nameEn: 'Synthetic Grass' },
  { slug: 'aladwat-almhnya', nameAr: 'أدوات احترافية', nameEn: 'Professional Tools' },
  { slug: 'hsa-alnhr', nameAr: 'حصى الأنهار', nameEn: 'River Pebbles' },
  { slug: 'khltat-alzra', nameAr: 'خلطات الزراعة', nameEn: 'Planting Mixes' },
  { slug: 'aswar-alkhyzran', nameAr: 'أسوار البامبو', nameEn: 'Bamboo Fences' },
  { slug: 'terrace-it', nameAr: 'بلاط الشرفات', nameEn: 'TERRACE-IT' },
];

async function main() {
  console.log('Ensuring 8 main categories...');
  for (const c of categories) {
    const r = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { nameAr: c.nameAr, nameEn: c.nameEn },
      create: { slug: c.slug, nameAr: c.nameAr, nameEn: c.nameEn },
    });
    console.log(`ok ${c.slug} -> ${r.id}`);
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
