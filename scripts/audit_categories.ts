import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      nameEn: true,
      nameAr: true,
      slug: true,
      parentId: true,
      _count: {
        select: { products: true, children: true },
      },
    },
    orderBy: { nameEn: 'asc' },
  });

  console.log(`TOTAL CATEGORIES: ${categories.length}`);
  console.log(JSON.stringify(categories, null, 2));

  // Check products sample or counts
  const totalProducts = await prisma.product.count();
  console.log(`TOTAL PRODUCTS: ${totalProducts}`);

  // Check some products with Arabic / English names
  const sampleProducts = await prisma.product.findMany({
    take: 20,
    select: {
      id: true,
      nameEn: true,
      nameAr: true,
      slug: true,
      categories: {
        select: { nameEn: true, nameAr: true },
      },
    },
  });
  console.log('SAMPLE PRODUCTS:');
  console.log(JSON.stringify(sampleProducts, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
