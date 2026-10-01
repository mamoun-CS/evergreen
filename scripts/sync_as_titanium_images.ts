import { loadEnvConfig } from '@next/env';
import { PrismaClient } from '@prisma/client';
import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';

loadEnvConfig(process.cwd());
const execute = process.argv.slice(2).includes('--execute');
const root = process.cwd();
const sourceDirectory = path.join(root, 'scratch', 'scratch', 'scratch', 'product_images');

function uploadDirectory() {
  if (process.env.NODE_ENV !== 'production') return path.resolve(process.env.UPLOAD_DIR_DEV?.trim() || '.uploads');
  return path.resolve(process.env.UPLOAD_DIR?.trim() || '/var/www/evergreen/uploads');
}

async function main() {
  const filenames = await readdir(sourceDirectory);
  const byProductId = new Map<string, string[]>();
  for (const filename of filenames) {
    const match = /^(product-[a-f0-9]+)_\d+\.(jpe?g|png|webp)$/i.exec(filename);
    if (!match) continue;
    const files = byProductId.get(match[1]) ?? [];
    files.push(filename);
    byProductId.set(match[1], files);
  }
  for (const files of byProductId.values()) files.sort();
  const prisma = new PrismaClient();
  try {
    const products = await prisma.product.findMany({ where: { slug: { startsWith: 'as-titanium-product-' }, images: { isEmpty: true } }, select: { id: true, slug: true } });
    const candidates = products.map((product) => ({ product, files: byProductId.get(product.slug.replace('as-titanium-product-', '')) ?? [] })).filter(({ files }) => files.length);
    console.log(JSON.stringify({ mode: execute ? 'execute' : 'dry-run', productsWithoutImages: products.length, productsToAttach: candidates.length, localFilesToAttach: candidates.reduce((count, entry) => count + entry.files.length, 0) }, null, 2));
    if (!execute) return;
    const targetDirectory = path.join(uploadDirectory(), 'products');
    await mkdir(targetDirectory, { recursive: true, mode: 0o750 });
    for (const { product, files } of candidates) {
      const urls: string[] = [];
      for (const filename of files) {
        const targetName = `as-titanium-${filename}`;
        try { await copyFile(path.join(sourceDirectory, filename), path.join(targetDirectory, targetName), fsConstants.COPYFILE_EXCL); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
        urls.push(`/uploads/products/${targetName}`);
      }
      await prisma.product.update({ where: { id: product.id }, data: { images: urls } });
    }
  } finally { await prisma.$disconnect(); }
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
