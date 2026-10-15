/** Refresh the reviewed supplier artwork without changing product data.
 * Usage: npx tsx scripts/download-source-category-assets.ts
 * Then: npm run catalog:organize-categories
 */
import { readFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

async function main() {
  const assets: { slug: string; image: string; localImage: string }[] = JSON.parse(readFileSync('data/catalog-category-assets.json', 'utf8'));
  mkdirSync('public/categories', { recursive: true });
  for (const asset of assets) {
    const source = new URL(asset.image);
    if (source.hostname !== 'as-titanum.com' || !/^\/categories\/[a-z0-9-]+\.webp$/.test(asset.localImage)) throw new Error(`Invalid asset: ${asset.slug}`);
    const response = await fetch(source, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`${asset.slug}: HTTP ${response.status}`);
    await sharp(Buffer.from(await response.arrayBuffer())).resize(800, 800, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toFile(`public${asset.localImage}`);
    console.log(`Updated ${asset.slug}`);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
