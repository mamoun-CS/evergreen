import { loadEnvConfig } from '@next/env';
import { PrismaClient } from '@prisma/client';
import { mkdir, readFile, copyFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

loadEnvConfig(process.cwd());

type SourceProduct = {
  id: string;
  name?: string;
  description?: string;
  meta_description?: string;
  price?: string;
  currency?: string;
  sku?: string;
  brand?: string;
  categories?: string[];
  specifications?: Record<string, string>;
  source_url?: string;
  local_images?: string[];
};

const root = process.cwd();
const sourceDirectory = path.join(root, 'scratch', 'itaytrade-scraper', 'scraped_itaytrade');
const catalogPath = path.join(sourceDirectory, 'products.json');
const destinationDirectory = path.join(root, 'public', 'products', 'itaytrade');
const mode = process.argv[2];

if (mode !== '--dry-run' && mode !== '--execute') {
  console.error('Usage: npx tsx scripts/import_itaytrade.ts --dry-run|--execute');
  process.exitCode = 1;
} else {
  void run(mode === '--execute');
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function sourceSlug(id: string) {
  return `itaytrade-${id.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}`;
}

function safeRelativePath(value: string) {
  const relative = value.replace(/\\/g, '/').replace(/^scraped_itaytrade\//, '');
  const resolved = path.resolve(sourceDirectory, relative);
  if (!resolved.startsWith(`${sourceDirectory}${path.sep}`)) return null;
  return resolved;
}

function parsePrice(value: string) {
  const number = Number.parseFloat(value.replace(/[^0-9.,]/g, '').replace(',', '.'));
  return Number.isFinite(number) && number >= 0 ? number : null;
}

async function eligibleImages(product: SourceProduct) {
  const candidates: Array<{ source: string; name: string; pixels: number }> = [];
  const seen = new Set<string>();
  for (const localImage of product.local_images ?? []) {
    const source = safeRelativePath(localImage);
    if (!source || seen.has(source)) continue;
    seen.add(source);
    const basename = path.basename(source).toLowerCase();
    if (/logo|account|shopping|submit|thanks|icon|whatsapp|facebook|instagram|youtube|arrow|cart|search/.test(basename)) continue;
    try {
      const metadata = await sharp(source).metadata();
      const width = metadata.width ?? 0;
      const height = metadata.height ?? 0;
      if (width < 250 || height < 250) continue;
      candidates.push({ source, name: basename, pixels: width * height });
    } catch {
      // Ignore SVGs and corrupted/non-image source assets.
    }
  }

  // The page contains several generated WordPress sizes of the same image.
  // Retain the largest form of each image, then keep up to four gallery images.
  const largestByOriginal = new Map<string, (typeof candidates)[number]>();
  for (const candidate of candidates) {
    const originalKey = candidate.name.replace(/-\d{2,4}x\d{2,4}(?=\.[^.]+$)/, '');
    const previous = largestByOriginal.get(originalKey);
    if (!previous || candidate.pixels > previous.pixels) largestByOriginal.set(originalKey, candidate);
  }
  return [...largestByOriginal.values()].sort((a, b) => b.pixels - a.pixels).slice(0, 4);
}

async function copyProductImages(product: SourceProduct) {
  const images = await eligibleImages(product);
  const urls: string[] = [];
  await mkdir(destinationDirectory, { recursive: true });
  for (let index = 0; index < images.length; index++) {
    const filename = `${sourceSlug(product.id)}-${index + 1}${path.extname(images[index].source).toLowerCase() || '.jpg'}`;
    const destination = path.join(destinationDirectory, filename);
    try {
      await copyFile(images[index].source, destination, fsConstants.COPYFILE_EXCL);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
    urls.push(`/products/itaytrade/${filename}`);
  }
  return urls;
}

async function run(execute: boolean) {
  const products = JSON.parse(await readFile(catalogPath, 'utf8')) as SourceProduct[];
  if (!Array.isArray(products) || !products.length) throw new Error('products.json is empty or invalid.');

  const prisma = new PrismaClient();
  const report = { mode: execute ? 'execute' : 'dry-run', sourceProducts: products.length, imported: 0, existing: 0, skippedInvalid: 0, withoutUsableImages: 0, failed: [] as string[] };

  try {
    const category = execute
      ? await prisma.category.upsert({
          where: { slug: 'itaytrade-import' },
          update: {},
          create: { slug: 'itaytrade-import', nameAr: 'منتجات Itay Trade', nameEn: 'Itay Trade Products' },
        })
      : await prisma.category.findUnique({ where: { slug: 'itaytrade-import' }, select: { id: true } });
    const brand = execute
      ? await prisma.brand.upsert({
          where: { name: 'Itay Trade' },
          update: {},
          create: { name: 'Itay Trade' },
        })
      : await prisma.brand.findUnique({ where: { name: 'Itay Trade' }, select: { id: true } });

    for (const product of products) {
      const name = clean(product.name);
      if (!product.id || !name) { report.skippedInvalid++; continue; }
      const slug = sourceSlug(product.id);
      const existing = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
      if (existing) { report.existing++; continue; }

      const sourceImages = await eligibleImages(product);
      if (!sourceImages.length) report.withoutUsableImages++;
      if (!execute) { report.imported++; continue; }
      if (!category || !brand) throw new Error('Import category or brand could not be prepared.');

      try {
        const images = await copyProductImages(product);
        const description = clean(product.description) || clean(product.meta_description) || null;
        const price = parsePrice(clean(product.price));
        const details = Object.entries(product.specifications ?? {}).map(([key, value]) => `${clean(key)}: ${clean(value)}`).filter(Boolean).join('\n');
        await prisma.product.create({
          data: {
            slug,
            nameAr: name,
            nameEn: name,
            sku: null,
            descriptionAr: description || details || null,
            descriptionEn: description || details || null,
            basePrice: price,
            currency: clean(product.currency) || 'ILS',
            purchaseMode: price === null ? 'CONTACT_FOR_PRICE' : 'PURCHASABLE',
            isAvailable: true,
            stockQuantity: 0,
            images,
            brand: { connect: { id: brand.id } },
            categories: { connect: { id: category.id } },
            seriesModel: `Imported from ${clean(product.source_url)}`.slice(0, 500),
          },
        });
        report.imported++;
      } catch (error) {
        report.failed.push(`${product.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(JSON.stringify(report, null, 2));
  if (report.failed.length) process.exitCode = 1;
}
