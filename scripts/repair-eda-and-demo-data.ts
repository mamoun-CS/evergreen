import { PrismaClient } from '@prisma/client';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();
const demoSlugs = ['stone-fountain', 'modern-cascade-fountain', 'garden-statue', 'stone-lion-sculpture', 'ceramic-planter', 'tall-fiber-planter', 'solar-lantern', 'pathway-light-set', 'outdoor-wall-decor', 'garden-accessory-set', 'decorative-garden-birdbath'];

async function main() {
  const eda = await prisma.product.findMany({ where: { categories: { some: { slug: 'awany-eda' } } }, select: { id: true, images: true } });
  const restored: string[] = [];
  for (const product of eda) for (const image of product.images) {
    const filename = path.posix.basename(image.split('?')[0]);
    if (!/^evg-product-[a-z0-9]+_\d+\.(webp|png|jpe?g)$/.test(filename)) continue;
    const target = path.resolve('public/products', filename);
    if (existsSync(target)) continue;
    const source = path.resolve('../archive-evergreen/unused-product-images-2026-10-10', filename);
    if (!existsSync(source)) throw new Error(`Missing archive image: ${filename}`);
    copyFileSync(source, target);
    restored.push(filename);
  }
  const demo = await prisma.product.findMany({
    where: { OR: demoSlugs.map(slug => ({ id: `product-${slug}`, slug, images: { equals: ['/images/background.png'] } })) },
    include: { categories: true, variants: true, productImages: true, _count: { select: { orderItems: true, quoteItems: true, cartItems: true, inventoryAuditLogs: true, reviews: true, accessoryFor: true, accessories: true } } },
  });
  mkdirSync('artifacts/catalog', { recursive: true });
  const backup = `artifacts/catalog/demo-backup-${Date.now()}.json`;
  writeFileSync(backup, JSON.stringify(demo, null, 2));
  const removed: string[] = [], archived: string[] = [];
  for (const product of demo) {
    const referenced = Object.values(product._count).some(count => count > 0);
    if (referenced) {
      await prisma.product.update({ where: { id: product.id }, data: { isAvailable: false, isFeatured: false, categories: { set: [] } } });
      archived.push(product.slug);
    } else {
      await prisma.product.delete({ where: { id: product.id } });
      removed.push(product.slug);
    }
  }
  console.log(JSON.stringify({ restored: restored.length, removed, archived, backup }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
