import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany({
    include: {
      parent: true,
      children: true,
      _count: {
        select: { products: true }
      }
    },
    orderBy: [
      { parentId: 'asc' },
      { nameEn: 'asc' }
    ]
  });

  const report = categories.map(c => ({
    id: c.id,
    nameAr: c.nameAr,
    nameEn: c.nameEn,
    slug: c.slug,
    parentNameAr: c.parent?.nameAr || null,
    parentNameEn: c.parent?.nameEn || null,
    productsCount: c._count.products,
    childrenCount: c.children.length
  }));

  fs.writeFileSync('category_audit_output.json', JSON.stringify(report, null, 2), 'utf-8');
  console.log(`Exported ${report.length} categories to category_audit_output.json`);
}

main().finally(() => prisma.$disconnect());
