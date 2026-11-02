import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cat = await prisma.category.findUnique({
    where: { slug: 'aljdar-alakhdr' },
    include: {
      products: {
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
          slug: true,
        }
      }
    }
  });

  console.log('Category:', cat?.nameAr, cat?.nameEn);
  console.log('Products in aljdar-alakhdr:');
  for (const p of cat?.products || []) {
    console.log(`[ID: ${p.id}]`);
    console.log(`   AR: ${p.nameAr}`);
    console.log(`   EN: ${p.nameEn}`);
  }
}

main().finally(() => prisma.$disconnect());
