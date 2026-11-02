import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
      slug: true,
      categories: { select: { nameAr: true, nameEn: true } }
    }
  });

  const englishInAr: any[] = [];
  for (const p of products) {
    const hasArabic = /[\u0600-\u06FF]/.test(p.nameAr);
    if (!hasArabic) {
      englishInAr.push({
        id: p.id,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        category: p.categories[0]?.nameAr || 'غير مصنف'
      });
    }
  }

  console.log(`Found ${englishInAr.length} products where nameAr has no Arabic characters.`);
  fs.writeFileSync('products_missing_arabic.json', JSON.stringify(englishInAr, null, 2), 'utf-8');
}

main().finally(() => prisma.$disconnect());
