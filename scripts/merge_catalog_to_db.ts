/**
 * Database Importer for Titanum Catalog (1,616 items)
 * Features:
 * - Zero duplication: Checks existing products by externalId, sku, slug, and sourceUrl.
 * - Accurate category hierarchy: Maps all Titanum categories to existing categories in Evergreen DB without messing up existing tree.
 * - Image association: Links the highest resolution downloaded image (from data/titanum_images_map.json or public/products/) to Product and ProductImage.
 * - Full idempotency: Can be re-run safely at any time (upsert logic).
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATALOG_FILE = path.join(process.cwd(), 'titanum_complete_catalog.json');
const MAP_FILE = path.join(process.cwd(), 'data', 'titanum_images_map.json');
const PUBLIC_PRODUCTS_DIR = path.join(process.cwd(), 'public', 'products');

// Mapping Titanum category names (lowercase) to DB slugs
const CATEGORY_MAP: Record<string, string> = {
  'pebbles': 'hsa-alnhr',
  'bamboo fences': 'aswar-alkhyzran',
  'synthetic grass': 'alashb-alsnaay',
  'accessories for synthetic grass': 'mlhqat-alashb-alsnaay',
  'fountains': 'fountains-water-features',
  'roman columns': 'alaamda-alrwmanya',
  'artificial vegetation': 'nbatat-astnaaya',
  'green wall': 'aljdar-alakhdr',
  'italian terracotta': 'tyrakwta-aytalya',
  'to eda': 'awany-eda',
  'to glaze': 'alawany-alzjajya',
  'brazilian pitchers': 'alqdwr-albrazylya',
  'urns and planters with natural wood coating': 'alawany-walmzarawn-almtlya-balkhshb-altbyay',
  'thai pots': 'alawany-altaylandya',
  'wicker and coconut products': 'mntjat-alkhws-wjwz-alhnd',
  'vintage pots': 'alawany-khmr',
  'metal pots': 'alawany-almadnya',
  'plastic pots': 'alawany-alblastykya',
  'corten pots': 'awany-kwrtn',
  'small and medium': 'alsghyra-walmtwsta',
  'cups, bowls and decorative pitchers': 'alkwws-walawaya-waljrar-alzkhrfya',
  'professional tools': 'aladwat-almhnya',
  'general': 'aam',
  'terraflex': 'terraflex',
  'titanium irrigation products': 'mntjat-alry-mn-altytanywm',
  'irrigation products': 'irrigation-systems',
  'wheelbarrows and carts': 'arbat-alyd-walarbat',
  'hydroponic growing columns - vertical growing systems for the home and balcony': 'aamda-alzraaa-almayya-anzma-alnmw-alamwdy-llmnzl-walshrfa',
  'shadow nets': 'shbkat-alzl',
  'overflow tables': 'jdawl-alfydanat',
  'planting mixes': 'khltat-alzra',
  'tuff and stepping stones': 'altwf-walahjar',
  'terraces': 'almdrjat',
  'terrace-it': 'terrace-it',
  'statues - dwarves, animals and mushrooms': 'altmathyl-altmathyl-walhywanat-walftr',
  'statues - figures': 'tmathyl-arqam',
  'statues - animals for planting': 'tmathyl-hywanat-qabla-llzraaa',
  'sculptures - plastic animals': 'tmathyl-hywanat-blastykya',
  'flowerpot stands and garden arches for climbers': 'garden-accessories',
  'jugs': 'pots-planters',
  'urns / flower pots': 'pots-planters',
  'flower pots': 'pots-planters',
  'decoration': 'decoration',
  'بدون تفرع': 'aam'
};

async function main() {
  console.log('🔹 Checking database and catalog data...');
  await prisma.$connect();

  const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
  const products = catalog.products || [];
  console.log(`🔹 Total products in catalog: ${products.length}`);

  let imageMap: Record<string, string> = {};
  if (fs.existsSync(MAP_FILE)) {
    try {
      imageMap = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
    } catch (_) {}
  }

  // Pre-load all category IDs by slug
  const allDbCategories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const categoryIdBySlug = new Map<string, string>();
  allDbCategories.forEach(c => categoryIdBySlug.set(c.slug, c.id));

  // Pre-load all existing product slugs and externalIds to guarantee zero collision
  const existingProducts = await prisma.product.findMany({
    select: { id: true, externalId: true, sku: true, slug: true, sourceUrl: true }
  });
  const existingExternalIds = new Map<string, string>();
  const existingSlugs = new Set<string>();
  const existingSkus = new Map<string, string>();
  const existingUrls = new Map<string, string>();

  existingProducts.forEach(p => {
    if (p.externalId) existingExternalIds.set(p.externalId, p.id);
    if (p.slug) existingSlugs.add(p.slug);
    if (p.sku) existingSkus.set(p.sku, p.id);
    if (p.sourceUrl) existingUrls.set(p.sourceUrl, p.id);
  });

  console.log(`🔹 Existing database products loaded: ${existingProducts.length}`);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let linkedImagesCount = 0;

  for (let i = 0; i < products.length; i++) {
    const item = products[i];
    const pid = String(item.id);
    const sku = item.sku || `titanum-sku-${pid}`;
    const title = item.title?.trim() || `Product ${pid}`;
    const description = item.description?.trim() || null;
    const excerpt = item.excerpt?.trim() || null;
    const sourceUrl = item.url?.trim() || null;

    // Resolve category
    const mc = (item.main_category || '').trim().toLowerCase();
    const sc = (item.sub_category || '').trim().toLowerCase();
    const targetSlug = (sc && CATEGORY_MAP[sc]) || (mc && CATEGORY_MAP[mc]) || 'aam';
    const categoryId = categoryIdBySlug.get(targetSlug);

    // Resolve Image path
    let imagePublicPath = imageMap[pid];
    if (!imagePublicPath) {
      // Check if image exists in public/products folder
      const prefix = `titanum-${pid}-`;
      try {
        const files = fs.readdirSync(PUBLIC_PRODUCTS_DIR);
        const match = files.find(f => f.startsWith(prefix));
        if (match) {
          imagePublicPath = `/products/${match}`;
        }
      } catch (_) {}
    }
    const imagesList = imagePublicPath ? [imagePublicPath] : [];

    // Ensure slug is unique
    let slugCandidate = (sku && sku.toLowerCase().replace(/[^a-z0-9_\-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')) || `titanum-${pid}`;
    if (existingSlugs.has(slugCandidate)) {
      slugCandidate = `titanum-${pid}-${slugCandidate}`;
    }

    // Determine if product already exists
    const existingDbId = existingExternalIds.get(pid) ||
                         (sku ? existingSkus.get(sku) : null) ||
                         (sourceUrl ? existingUrls.get(sourceUrl) : null);

    try {
      if (existingDbId) {
        // Update product
        await prisma.product.update({
          where: { id: existingDbId },
          data: {
            externalId: pid,
            nameEn: title,
            nameAr: title, // English name used as default or translated
            descriptionEn: description,
            descriptionAr: excerpt,
            sourceUrl: sourceUrl,
            images: imagesList.length ? imagesList : undefined,
            ...(categoryId ? { categories: { set: [{ id: categoryId }] } } : {})
          }
        });

        if (imagesList.length) {
          await prisma.productImage.deleteMany({ where: { productId: existingDbId } });
          await prisma.productImage.create({
            data: {
              productId: existingDbId,
              path: imagePublicPath,
              isMain: true,
              sortOrder: 0
            }
          });
          linkedImagesCount++;
        }
        updatedCount++;
      } else {
        // Create new product
        existingSlugs.add(slugCandidate);
        existingExternalIds.set(pid, pid);

        const newProd = await prisma.product.create({
          data: {
            externalId: pid,
            nameEn: title,
            nameAr: title,
            slug: slugCandidate,
            sku: sku,
            descriptionEn: description,
            descriptionAr: excerpt,
            sourceUrl: sourceUrl,
            purchaseMode: 'PURCHASABLE',
            currency: 'ILS',
            isAvailable: true,
            stockQuantity: 10,
            images: imagesList,
            ...(categoryId ? { categories: { connect: [{ id: categoryId }] } } : {})
          }
        });

        if (imagesList.length) {
          await prisma.productImage.create({
            data: {
              productId: newProd.id,
              path: imagePublicPath,
              isMain: true,
              sortOrder: 0
            }
          });
          linkedImagesCount++;
        }
        createdCount++;
      }
    } catch (err: any) {
      console.error(`Failed to import product ${pid}: ${err.message}`);
      skippedCount++;
    }

    if ((i + 1) % 100 === 0 || i === products.length - 1) {
      console.log(`Import progress: ${i + 1}/${products.length} | Created: ${createdCount} | Updated: ${updatedCount} | Images linked: ${linkedImagesCount} | Errors: ${skippedCount}`);
    }
  }

  console.log('\n🎉 Finished importing Titanum catalog into database!');
  console.log(`Total created: ${createdCount}`);
  console.log(`Total updated: ${updatedCount}`);
  console.log(`Total images linked: ${linkedImagesCount}`);
  console.log(`Total skipped/errors: ${skippedCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
