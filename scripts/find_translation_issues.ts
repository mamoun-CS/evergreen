import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany({
    include: {
      parent: true,
      children: true,
      _count: { select: { products: true } }
    }
  });

  const issues: any[] = [];

  for (const cat of categories) {
    // 1. Check if nameEn contains Arabic characters
    const hasArabicInEn = /[\u0600-\u06FF]/.test(cat.nameEn);
    // 2. Check if nameAr has no Arabic or is English
    const hasNoArabicInAr = !/[\u0600-\u06FF]/.test(cat.nameAr);
    // 3. Check if nameEn equals nameAr
    const identical = cat.nameEn.trim() === cat.nameAr.trim();
    // 4. Check for literal translation issues like "الري بالبندقية" or "General"
    const isGeneral = cat.nameEn.toLowerCase() === 'general' || cat.nameAr === 'عام' || cat.nameAr === 'العام';

    if (hasArabicInEn || hasNoArabicInAr || identical || isGeneral) {
      issues.push({
        id: cat.id,
        nameAr: cat.nameAr,
        nameEn: cat.nameEn,
        slug: cat.slug,
        parent: cat.parent ? { nameAr: cat.parent.nameAr, nameEn: cat.parent.nameEn } : null,
        productsCount: cat._count.products,
        reasons: {
          hasArabicInEn,
          hasNoArabicInAr,
          identical,
          isGeneral
        }
      });
    }
  }

  // Also sample some product name translation anomalies
  const productsWithArabicInEn = await prisma.product.count({
    where: {
      nameEn: {
        // We will sample 100 products and check with regex
      }
    }
  });

  // Let's sample products where nameEn has Arabic
  const allProducts = await prisma.product.findMany({
    select: {
      id: true,
      nameEn: true,
      nameAr: true,
      slug: true,
      categories: { select: { nameAr: true, nameEn: true } }
    }
  });

  const productIssues: any[] = [];
  for (const p of allProducts) {
    const arabicInEn = /[\u0600-\u06FF]/.test(p.nameEn);
    const identical = p.nameEn.trim() === p.nameAr.trim();
    // Check weird literal words
    const weirdWords = /(بندقية الري|زارع الخوص|زارع الطين|على الساقين)/.test(p.nameAr);

    if (arabicInEn || identical || weirdWords) {
      productIssues.push({
        id: p.id,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        reasons: { arabicInEn, identical, weirdWords },
        category: p.categories[0]?.nameAr
      });
    }
  }

  console.log(`Found ${issues.length} category issues.`);
  console.log(`Found ${productIssues.length} products with translation anomalies.`);

  fs.writeFileSync('audit_issues_summary.json', JSON.stringify({
    categoryIssues: issues,
    sampleProductIssues: productIssues.slice(0, 50),
    totalProductIssues: productIssues.length
  }, null, 2), 'utf-8');
}

main().finally(() => prisma.$disconnect());
