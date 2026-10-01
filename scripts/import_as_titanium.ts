import { loadEnvConfig } from '@next/env';
import { PrismaClient } from '@prisma/client';
import { copyFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';

loadEnvConfig(process.cwd());

type SourceImage = { url?: string; alt?: string; title?: string };
type SourceCategory = { id: string; name: string; slug?: string };
type SourceProduct = {
  id: string;
  external_id?: string | null;
  name: string;
  category_id?: string;
  category_name?: string;
  images?: SourceImage[];
  details?: string[];
  source?: { product_url?: string; page_url?: string };
};
type Catalog = { categories: SourceCategory[]; products: SourceProduct[] };

const root = process.cwd();
const sourceDirectory = path.join(root, 'scratch', 'scratch', 'scratch');
const catalogPath = path.join(sourceDirectory, 'catalog_import.json');
const imagesDirectory = path.join(sourceDirectory, 'product_images');
const reportDirectory = path.join(root, 'artifacts', 'as-titanium-import');
const mode = process.argv.slice(2).find((argument) => argument === '--dry-run' || argument === '--execute');

if (!mode || process.argv.length !== 3) {
  console.error('Usage: npx tsx scripts/import_as_titanium.ts --dry-run|--execute');
  process.exitCode = 1;
} else {
  void run(mode === '--execute');
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function sourceSlug(kind: 'category' | 'product', id: string) {
  return `as-titanium-${kind}-${id.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()}`.slice(0, 100);
}

function uploadDirectory() {
  if (process.env.NODE_ENV !== 'production') return path.resolve(process.env.UPLOAD_DIR_DEV?.trim() || '.uploads');
  return path.resolve(process.env.UPLOAD_DIR?.trim() || '/var/www/evergreen/uploads');
}

async function readCatalog(): Promise<Catalog> {
  const data = JSON.parse(await (await import('node:fs/promises')).readFile(catalogPath, 'utf8')) as Catalog;
  if (!Array.isArray(data.categories) || !Array.isArray(data.products)) throw new Error('catalog_import.json must contain categories and products arrays.');
  return data;
}

async function localImagesByProduct() {
  const filenames = await readdir(imagesDirectory);
  const images = new Map<string, string[]>();
  for (const filename of filenames) {
    const match = /^(product-[a-f0-9]+)_\d+\.(jpe?g|png|webp)$/i.exec(filename);
    if (!match) continue;
    const list = images.get(match[1]) ?? [];
    list.push(filename);
    images.set(match[1], list);
  }
  for (const list of images.values()) list.sort();
  return images;
}

async function copyProductImages(product: SourceProduct, filenames: string[]) {
  const targetDirectory = path.join(uploadDirectory(), 'products');
  await mkdir(targetDirectory, { recursive: true, mode: 0o750 });
  const urls: string[] = [];
  for (const filename of filenames) {
    // Prefixing makes filenames stable, avoids collisions, and permits safe reruns.
    const targetName = `as-titanium-${filename}`;
    const source = path.join(imagesDirectory, filename);
    const target = path.join(targetDirectory, targetName);
    try {
      await copyFile(source, target, fsConstants.COPYFILE_EXCL);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
    urls.push(`/uploads/products/${targetName}`);
  }
  return urls;
}

async function run(execute: boolean) {
  const catalog = await readCatalog();
  const localImages = await localImagesByProduct();
  const prisma = new PrismaClient();
  const sourceSkuCounts = new Map<string, number>();
  for (const product of catalog.products) {
    const sku = clean(product.external_id);
    if (sku) sourceSkuCounts.set(sku, (sourceSkuCounts.get(sku) ?? 0) + 1);
  }

  const report = {
    mode: execute ? 'execute' : 'dry-run',
    generatedAt: new Date().toISOString(),
    categories: { created: 0, reused: 0, invalid: [] as string[] },
    products: { imported: 0, skippedExisting: 0, failed: [] as Array<{ id: string; name: string; error: string }> },
    images: { local: 0, missingLocal: [] as Array<{ id: string; name: string; sourceUrl: string }> },
    duplicateSkus: [] as Array<{ sku: string; products: Array<{ id: string; name: string }> }>,
    possibleDuplicates: [] as Array<{ id: string; name: string; sku: string; reason: string }>,
    references: [] as Array<{ id: string; sourceUrl: string; originalSku: string; localImageFiles: string[] }>,
  };

  try {
    const existingCategories = await prisma.category.findMany({ select: { id: true, nameEn: true, nameAr: true, slug: true } });
    const categoryIds = new Map<string, string>();
    for (const category of catalog.categories) {
      const name = clean(category.name);
      if (!name || !category.id) { report.categories.invalid.push(category.id || '(missing id)'); continue; }
      const slug = sourceSlug('category', category.id);
      const existing = existingCategories.find((item) => item.nameEn === name || item.nameAr === name || item.slug === slug);
      if (existing) {
        categoryIds.set(category.id, existing.id);
        report.categories.reused++;
      } else if (execute) {
        const created = await prisma.category.create({ data: { nameEn: name, nameAr: name, slug } });
        categoryIds.set(category.id, created.id);
        report.categories.created++;
      } else {
        categoryIds.set(category.id, `dry-run:${category.id}`);
        report.categories.created++;
      }
    }

    const duplicateSkuProducts = new Map<string, Array<{ id: string; name: string }>>();
    for (const product of catalog.products) {
      const sku = clean(product.external_id);
      if (sku && (sourceSkuCounts.get(sku) ?? 0) > 1) {
        const list = duplicateSkuProducts.get(sku) ?? [];
        list.push({ id: product.id, name: clean(product.name) });
        duplicateSkuProducts.set(sku, list);
      }
    }
    report.duplicateSkus = [...duplicateSkuProducts].map(([sku, products]) => ({ sku, products }));

    const existingProducts = await prisma.product.findMany({ select: { id: true, slug: true, sku: true } });
    const bySlug = new Map(existingProducts.map((product) => [product.slug, product]));
    const bySku = new Map(existingProducts.filter((product) => product.sku).map((product) => [product.sku!, product]));

    for (let index = 0; index < catalog.products.length; index++) {
      const product = catalog.products[index];
      const name = clean(product.name);
      const slug = sourceSlug('product', product.id);
      const originalSku = clean(product.external_id);
      const isDuplicateSourceSku = Boolean(originalSku && (sourceSkuCounts.get(originalSku) ?? 0) > 1);
      const localFiles = localImages.get(product.id) ?? [];
      const sourceUrl = clean(product.source?.product_url || product.source?.page_url);
      report.references.push({ id: product.id, sourceUrl, originalSku, localImageFiles: localFiles });

      if (!localFiles.length) report.images.missingLocal.push({ id: product.id, name, sourceUrl });
      else report.images.local += localFiles.length;
      if (!name || !product.id || !product.category_id || !categoryIds.has(product.category_id)) {
        report.products.failed.push({ id: product.id || '(missing)', name, error: 'Missing required source name, id, or category.' });
        continue;
      }

      const slugMatch = bySlug.get(slug);
      const skuMatch = originalSku && !isDuplicateSourceSku ? bySku.get(originalSku) : undefined;
      if (slugMatch || skuMatch) {
        report.products.skippedExisting++;
        if (skuMatch && !slugMatch) report.possibleDuplicates.push({ id: product.id, name, sku: originalSku, reason: `Existing database product ${skuMatch.id} has the same unique SKU.` });
        continue;
      }
      if (isDuplicateSourceSku) {
        report.possibleDuplicates.push({ id: product.id, name, sku: originalSku, reason: 'SKU occurs more than once in source; stored as null to honor Product.sku unique constraint. Original value remains in the reference report.' });
      }

      if (!execute) { report.products.imported++; continue; }
      try {
        const imageUrls = await copyProductImages(product, localFiles);
        const created = await prisma.product.create({
          data: {
            nameEn: name,
            nameAr: name,
            slug,
            sku: isDuplicateSourceSku ? null : (originalSku || null),
            // The catalogue has no description field; details are only copied when present.
            descriptionEn: product.details?.length ? product.details.join('\n') : null,
            descriptionAr: product.details?.length ? product.details.join('\n') : null,
            purchaseMode: 'CONTACT_FOR_PRICE',
            isAvailable: true,
            stockQuantity: 0,
            images: imageUrls,
            categories: { connect: [{ id: categoryIds.get(product.category_id)! }] },
          },
        });
        bySlug.set(slug, created);
        if (created.sku) bySku.set(created.sku, created);
        report.products.imported++;
      } catch (error) {
        report.products.failed.push({ id: product.id, name, error: error instanceof Error ? error.message : String(error) });
      }
      if ((index + 1) % 50 === 0 || index + 1 === catalog.products.length) console.log(`[${index + 1}/${catalog.products.length}] processed`);
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(JSON.stringify({
    mode: report.mode,
    categories: report.categories,
    products: { imported: report.products.imported, skippedExisting: report.products.skippedExisting, failed: report.products.failed.length },
    images: { localFiles: report.images.local, missingLocalProducts: report.images.missingLocal.length },
    duplicateSkuGroups: report.duplicateSkus.length,
    possibleDuplicates: report.possibleDuplicates.length,
  }, null, 2));

  if (execute) {
    await mkdir(reportDirectory, { recursive: true });
    await writeFile(path.join(reportDirectory, 'import-report.json'), JSON.stringify(report, null, 2), 'utf8');
    await writeFile(path.join(reportDirectory, 'possible_duplicates.json'), JSON.stringify(report.possibleDuplicates, null, 2), 'utf8');
    await writeFile(path.join(reportDirectory, 'missing_local_images.json'), JSON.stringify(report.images.missingLocal, null, 2), 'utf8');
    await writeFile(path.join(reportDirectory, 'source-reference.json'), JSON.stringify(report.references, null, 2), 'utf8');
  }
}
