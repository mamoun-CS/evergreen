import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Prisma, PrismaClient } from '@prisma/client';

type ReviewProduct = {
  id: string; slug: string; sku?: string | null;
  nameAr: string; nameEn: string; descriptionAr?: string | null; descriptionEn?: string | null;
  importDetails?: string | null; warrantyInfoAr?: string | null; warrantyInfoEn?: string | null;
  material?: string | null; color?: string | null; style?: string | null; countryOfOrigin?: string | null; externalSize?: string | null;
  categories: Array<{ id: string; nameAr: string; nameEn: string }>;
  applications: Array<{ id: string; nameAr: string; nameEn: string }>;
  variants: Array<{ id: string; titleAr: string; titleEn: string }>;
  specifications: Array<{ id: string; groupAr?: string | null; groupEn?: string | null; keyAr: string; keyEn: string; valueAr: string; valueEn: string }>;
};

type ReviewDocument = { products: ReviewProduct[] };
const prisma = new PrismaClient();
const inputPath = path.join(process.cwd(), 'scrath', 'product-texts-review.json');
const apply = process.argv.includes('--apply');
const productFields = ['nameAr', 'nameEn', 'descriptionAr', 'descriptionEn', 'importDetails', 'warrantyInfoAr', 'warrantyInfoEn', 'material', 'color', 'style', 'countryOfOrigin', 'externalSize'] as const;

function assertText(value: unknown, label: string, required = false): asserts value is string | null {
  if (required && (typeof value !== 'string' || !value.trim())) throw new Error(`${label} must be a non-empty string.`);
  if (!required && value !== null && value !== undefined && typeof value !== 'string') throw new Error(`${label} must be a string or null.`);
}
function changed(current: Record<string, unknown>, incoming: Record<string, unknown>, fields: readonly string[]) {
  return fields.some((field) => (current[field] ?? null) !== (incoming[field] ?? null));
}
function addConsistent(map: Map<string, { nameAr: string; nameEn: string }>, value: { id: string; nameAr: string; nameEn: string }, label: string) {
  const prior = map.get(value.id);
  if (prior && (prior.nameAr !== value.nameAr || prior.nameEn !== value.nameEn)) throw new Error(`${label} ${value.id} has conflicting text across products.`);
  map.set(value.id, { nameAr: value.nameAr, nameEn: value.nameEn });
}

async function main() {
  const document = JSON.parse(await readFile(inputPath, 'utf8')) as ReviewDocument;
  if (!Array.isArray(document.products) || !document.products.length) throw new Error('Review file has no products.');
  const ids = document.products.map((product) => product.id);
  if (new Set(ids).size !== ids.length || ids.some((id) => typeof id !== 'string' || !id)) throw new Error('Product IDs must be present and unique.');

  for (const product of document.products) {
    assertText(product.nameAr, `${product.id}.nameAr`, true); assertText(product.nameEn, `${product.id}.nameEn`, true);
    for (const field of productFields.slice(2)) assertText(product[field], `${product.id}.${field}`);
    for (const variant of product.variants || []) { assertText(variant.titleAr, `${variant.id}.titleAr`, true); assertText(variant.titleEn, `${variant.id}.titleEn`, true); }
    for (const spec of product.specifications || []) { assertText(spec.keyAr, `${spec.id}.keyAr`, true); assertText(spec.keyEn, `${spec.id}.keyEn`, true); assertText(spec.valueAr, `${spec.id}.valueAr`, true); assertText(spec.valueEn, `${spec.id}.valueEn`, true); assertText(spec.groupAr, `${spec.id}.groupAr`); assertText(spec.groupEn, `${spec.id}.groupEn`); }
  }

  const current = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true, sku: true, nameAr: true, nameEn: true, descriptionAr: true, descriptionEn: true, importDetails: true, warrantyInfoAr: true, warrantyInfoEn: true, material: true, color: true, style: true, countryOfOrigin: true, externalSize: true, variants: { select: { id: true, productId: true, titleAr: true, titleEn: true } }, specifications: { select: { id: true, productId: true, groupAr: true, groupEn: true, keyAr: true, keyEn: true, valueAr: true, valueEn: true } } } });
  if (current.length !== ids.length) throw new Error(`Review file includes ${ids.length - current.length} product IDs that no longer exist.`);
  const byId = new Map(current.map((product) => [product.id, product]));
  const categoryUpdates = new Map<string, { nameAr: string; nameEn: string }>();
  const applicationUpdates = new Map<string, { nameAr: string; nameEn: string }>();
  const operations: Prisma.PrismaPromise<unknown>[] = [];
  const summary = { products: 0, variants: 0, specifications: 0, categories: 0, applications: 0 };

  for (const incoming of document.products) {
    const existing = byId.get(incoming.id)!;
    if (existing.slug !== incoming.slug || (incoming.sku ?? null) !== (existing.sku ?? null)) throw new Error(`Stable identifier changed for product ${incoming.id}.`);
    if (changed(existing, incoming, productFields)) {
      operations.push(prisma.product.update({ where: { id: incoming.id }, data: Object.fromEntries(productFields.map((field) => [field, incoming[field] ?? null])) }));
      summary.products++;
    }
    const variants = new Map(existing.variants.map((variant) => [variant.id, variant]));
    for (const variant of incoming.variants || []) {
      const old = variants.get(variant.id); if (!old || old.productId !== incoming.id) throw new Error(`Variant ${variant.id} does not belong to product ${incoming.id}.`);
      if (old.titleAr !== variant.titleAr || old.titleEn !== variant.titleEn) { operations.push(prisma.productVariant.update({ where: { id: variant.id }, data: { titleAr: variant.titleAr, titleEn: variant.titleEn } })); summary.variants++; }
    }
    const specifications = new Map(existing.specifications.map((specification) => [specification.id, specification]));
    for (const spec of incoming.specifications || []) {
      const old = specifications.get(spec.id); if (!old || old.productId !== incoming.id) throw new Error(`Specification ${spec.id} does not belong to product ${incoming.id}.`);
      if (changed(old, spec, ['groupAr', 'groupEn', 'keyAr', 'keyEn', 'valueAr', 'valueEn'])) { operations.push(prisma.specification.update({ where: { id: spec.id }, data: { groupAr: spec.groupAr ?? null, groupEn: spec.groupEn ?? null, keyAr: spec.keyAr, keyEn: spec.keyEn, valueAr: spec.valueAr, valueEn: spec.valueEn } })); summary.specifications++; }
    }
    for (const category of incoming.categories || []) addConsistent(categoryUpdates, category, 'Category');
    for (const application of incoming.applications || []) addConsistent(applicationUpdates, application, 'Application');
  }

  const categoryIds = [...categoryUpdates.keys()]; const applicationIds = [...applicationUpdates.keys()];
  const [categories, applications] = await Promise.all([prisma.category.findMany({ where: { id: { in: categoryIds } } }), prisma.application.findMany({ where: { id: { in: applicationIds } } })]);
  if (categories.length !== categoryIds.length || applications.length !== applicationIds.length) throw new Error('A referenced category or application no longer exists.');
  for (const category of categories) { const update = categoryUpdates.get(category.id)!; if (category.nameAr !== update.nameAr || category.nameEn !== update.nameEn) { operations.push(prisma.category.update({ where: { id: category.id }, data: update })); summary.categories++; } }
  for (const application of applications) { const update = applicationUpdates.get(application.id)!; if (application.nameAr !== update.nameAr || application.nameEn !== update.nameEn) { operations.push(prisma.application.update({ where: { id: application.id }, data: update })); summary.applications++; } }

  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', reviewProducts: document.products.length, operations: summary, totalOperations: operations.length }, null, 2));
  if (!apply || !operations.length) return;
  for (let index = 0; index < operations.length; index += 100) await prisma.$transaction(operations.slice(index, index + 100));
  console.log('Import completed successfully.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
