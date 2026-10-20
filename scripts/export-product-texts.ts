import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const outputPath = process.env.PRODUCT_TEXTS_OUTPUT
  ? path.resolve(process.cwd(), process.env.PRODUCT_TEXTS_OUTPUT)
  : path.join(process.cwd(), 'scrath', 'product-texts-review.json');

async function main() {
  const products = await prisma.product.findMany({
    orderBy: [{ nameAr: 'asc' }, { nameEn: 'asc' }],
    select: {
      id: true,
      slug: true,
      sku: true,
      nameAr: true,
      nameEn: true,
      descriptionAr: true,
      descriptionEn: true,
      importDetails: true,
      warrantyInfoAr: true,
      warrantyInfoEn: true,
      material: true,
      color: true,
      style: true,
      countryOfOrigin: true,
      externalSize: true,
      categories: { select: { id: true, slug: true, nameAr: true, nameEn: true } },
      applications: { select: { id: true, slug: true, nameAr: true, nameEn: true } },
      variants: { orderBy: { titleAr: 'asc' }, select: { id: true, sku: true, titleAr: true, titleEn: true } },
      specifications: { orderBy: [{ groupAr: 'asc' }, { keyAr: 'asc' }], select: { id: true, groupAr: true, groupEn: true, keyAr: true, keyEn: true, valueAr: true, valueEn: true } },
    },
  });

  const document = {
    generatedAt: new Date().toISOString(),
    productCount: products.length,
    instructions: {
      ar: 'عدّل القيم النصية فقط. لا تغيّر id أو slug أو معرفات المواصفات والخيارات والتصنيفات، لأنها تُستخدم لمطابقة السجلات عند الاستيراد.',
      en: 'Edit text values only. Do not change id, slug, or specification, variant, and category IDs; they are used to match records during import.',
    },
    products,
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  console.log(`Exported ${products.length} products to ${outputPath}`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
