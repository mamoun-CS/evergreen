/**
 * Creates WebP copies of legacy catalogue images without modifying originals
 * or database URLs. Run this before migrating product image paths in a planned
 * batch: `npx tsx scripts/optimize-product-images.ts`.
 */
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const sourceDirectory = path.join(process.cwd(), 'public', 'products');
const maxDimension = 1600;
let converted = 0;
let skipped = 0;

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  }));
  return nested.flat();
}

async function main() {
  for (const file of await walk(sourceDirectory)) {
    if (!/\.(png|jpe?g)$/i.test(file)) continue;
    const output = file.replace(/\.(png|jpe?g)$/i, '.webp');
    try {
      const sourceInfo = await stat(file);
      const outputInfo = await stat(output).catch(() => null);
      if (outputInfo && outputInfo.mtimeMs >= sourceInfo.mtimeMs) {
        skipped++;
        continue;
      }
      await sharp(file, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90, effort: 4 })
        .toFile(output);
      converted++;
    } catch (error) {
      console.warn(`Skipped unreadable image: ${file}`, error instanceof Error ? error.message : error);
    }
  }
  console.log(`Created ${converted} WebP files; ${skipped} already up to date.`);
}

void main();
