/**
 * Imports the scraped local catalogue without touching manually-created products.
 * Usage: npx tsx scripts/import-products.ts [--dry-run]
 */
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

type ImportedProduct = {
  id: string | number;
  url?: string;
  name: string;
  category?: string;
  price?: number;
  currency?: string;
  availability?: string;
  size?: string;
  short_description?: string;
  details?: string;
  local_images?: string[];
};

const root = process.cwd();
const inputFile = path.join(root, 'scrath', 'products_local.json');
const sourceDir = path.join(root, 'scrath', 'product');
const publicDir = path.join(root, 'public', 'products');
const dryRun = process.argv.includes('--dry-run');
const prisma = new PrismaClient();
const report = { created: 0, updated: 0, failed: 0, images: 0, missing: [] as string[] };

function categorySlug(name: string) {
  return `imported-category-${createHash('sha1').update(name).digest('hex').slice(0, 16)}`;
}

function isAvailable(value?: string) {
  return !/out\s*of\s*stock|unavailable|غير متوفر|نفد/i.test(value || '');
}

function imageNames(product: ImportedProduct) {
  return [...new Set((product.local_images || []).map((value) => path.basename(value.replace(/\\/g, '/'))).filter(Boolean))];
}

async function exists(file: string) {
  try { return (await stat(file)).isFile(); } catch { return false; }
}

async function prepareImages(product: ImportedProduct) {
  const paths: string[] = [];
  for (const filename of imageNames(product)) {
    const source = path.join(sourceDir, filename);
    const destination = path.join(publicDir, filename);
    const publicPath = `/products/${filename}`;
    const alreadyPublic = await exists(destination);
    const sourceExists = await exists(source);
    if (!alreadyPublic && !sourceExists) {
      report.missing.push(publicPath);
      console.warn(`Missing image for ${product.id}: ${destination}`);
      continue;
    }
    if (!dryRun && !alreadyPublic) await copyFile(source, destination);
    paths.push(publicPath);
  }
  return paths;
}

async function main() {
  const raw = await readFile(inputFile, 'utf8');
  const products: ImportedProduct[] = JSON.parse(raw);
  if (!Array.isArray(products)) throw new Error('products_local.json must contain an array');
  if (!dryRun) await mkdir(publicDir, { recursive: true });
  // Fail once with a useful connection error instead of emitting the same error
  // for every product when the database is offline.
  await prisma.$connect();

  for (const item of products) {
    const externalId = String(item.id);
    try {
      if (!item.name?.trim()) throw new Error('Product has no name');
      const images = await prepareImages(item);
      report.images += images.length;
      const categoryName = item.category?.trim();
      const existing = dryRun ? await prisma.product.findUnique({ where: { externalId }, select: { id: true } }) : null;
      if (dryRun) {
        existing ? report.updated++ : report.created++;
        console.log(`[dry-run] ${existing ? 'update' : 'create'} product ${externalId} (${images.length} images)`);
        continue;
      }

      await prisma.$transaction(async (tx) => {
        const categoryId = categoryName
          ? (await tx.category.upsert({
              where: { slug: categorySlug(categoryName) },
              create: { slug: categorySlug(categoryName), nameAr: categoryName, nameEn: categoryName },
              update: { nameAr: categoryName, nameEn: categoryName },
              select: { id: true },
            })).id
          : undefined;
        const data = {
          nameAr: item.name.trim(), nameEn: item.name.trim(), slug: `imported-${externalId}`,
          basePrice: Number.isFinite(Number(item.price)) ? Number(item.price) : null,
          currency: item.currency?.trim() || 'ILS', isAvailable: isAvailable(item.availability),
          stockQuantity: isAvailable(item.availability) ? 1 : 0,
          descriptionAr: item.short_description?.trim() || null,
          descriptionEn: item.short_description?.trim() || null,
          importDetails: item.details?.trim() || null, externalSize: item.size?.trim() || null,
          sourceUrl: item.url?.trim() || null, images,
        };
        const before = await tx.product.findUnique({ where: { externalId }, select: { id: true } });
        const product = before
          ? await tx.product.update({ where: { id: before.id }, data: { ...data, ...(categoryId ? { categories: { set: [{ id: categoryId }] } } : {}) }, select: { id: true } })
          : await tx.product.create({ data: { externalId, ...data, ...(categoryId ? { categories: { connect: [{ id: categoryId }] } } : {}) }, select: { id: true } });
        // Only image rows owned by this imported product are replaced, making re-runs idempotent.
        await tx.productImage.deleteMany({ where: { productId: product.id } });
        if (images.length) await tx.productImage.createMany({ data: images.map((path, index) => ({ productId: product.id, path, isMain: index === 0, sortOrder: index })) });
        before ? report.updated++ : report.created++;
      });
    } catch (error) {
      report.failed++;
      console.error(`Failed product ${externalId}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log('\nImport report');
  console.log(`Products: ${report.created} created, ${report.updated} updated, ${report.failed} failed`);
  console.log(`Images registered: ${report.images}`);
  console.log(`Missing images (${report.missing.length}): ${report.missing.join(', ') || 'none'}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
