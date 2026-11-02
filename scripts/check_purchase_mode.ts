import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const byMode = await prisma.product.groupBy({
    by: ['purchaseMode'],
    _count: true,
  });
  const zeroPrice = await prisma.product.count({
    where: {
      OR: [
        { basePrice: null },
        { basePrice: 0 }
      ]
    }
  });
  console.log('Purchase mode counts:', byMode);
  console.log('Zero or null price products:', zeroPrice);

  const sample = await prisma.product.findMany({
    take: 5,
    select: { id: true, nameAr: true, purchaseMode: true, basePrice: true, stockQuantity: true, isAvailable: true }
  });
  console.log('Sample products:', sample);
}

main().finally(() => prisma.$disconnect());
