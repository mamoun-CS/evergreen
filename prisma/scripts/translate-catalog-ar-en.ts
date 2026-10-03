import { PrismaClient } from '@prisma/client';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Catalog language audit and reviewed-translation applier.
 *
 * Default: read-only dry run. It creates JSON + CSV review reports.
 * Execute only with a human-reviewed JSON file:
 *   npx tsx prisma/scripts/translate-catalog-ar-en.ts --execute --translations path/to/reviewed.json
 *
 * A translation is never guessed by this script. This prevents accidental
 * nonsense product names and makes the reviewer the source of truth.
 */
const prisma = new PrismaClient();
const execute = process.argv.includes('--execute');
const translationFileIndex = process.argv.indexOf('--translations');
const translationFile = translationFileIndex >= 0 ? process.argv[translationFileIndex + 1] : undefined;
const outputDir = path.resolve('prisma/catalog-translation-output');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

const hebrew = /[\u0590-\u05FF]/;
const arabic = /[\u0600-\u06FF]/;
const latin = /[A-Za-z]/;
const importedSource = /(?:^|\s)Imported\s+from\s+https?:\/\//i;
const visibleProductFields = ['nameAr', 'nameEn', 'descriptionAr', 'descriptionEn'] as const;
type ProductField = typeof visibleProductFields[number];
type Issue = { id: string; slug: string; entity: 'Product' | 'Category' | 'Brand' | 'SeriesModel' | 'ProductVariant' | 'Specification'; field: string; currentText: string; translationArabic: string; translationEnglish: string; reason: string; };
type Translation = { id: string; entity: 'Product' | 'Category'; field: ProductField | 'nameAr' | 'nameEn'; value: string; };

function reasonFor(text: string, target: 'ar' | 'en') {
  const problems: string[] = [];
  if (importedSource.test(text) || /https?:\/\//i.test(text)) problems.push('contains import/source URL');
  if (hebrew.test(text)) problems.push('contains Hebrew');
  if (target === 'ar' && latin.test(text)) problems.push('contains Latin text in Arabic field');
  if (target === 'en' && arabic.test(text)) problems.push('contains Arabic text in English field');
  return problems.join('; ');
}

function csvCell(value: string) { return `"${value.replace(/"/g, '""')}"`; }
function toCsv(rows: Issue[]) {
  const header = ['id', 'slug', 'entity', 'field', 'currentText', 'translationArabic', 'translationEnglish', 'reason'];
  return [header.join(','), ...rows.map(row => [row.id, row.slug, row.entity, row.field, row.currentText, row.translationArabic, row.translationEnglish, row.reason].map(csvCell).join(','))].join('\r\n');
}

async function dryRun() {
  const [products, categories, brands, variants, specifications] = await Promise.all([
    prisma.product.findMany({ select: { id: true, slug: true, nameAr: true, nameEn: true, descriptionAr: true, descriptionEn: true, seriesModel: true } }),
    prisma.category.findMany({ select: { id: true, slug: true, nameAr: true, nameEn: true } }),
    prisma.brand.findMany({ select: { id: true, name: true, description: true } }),
    prisma.productVariant.findMany({ select: { id: true, product: { select: { slug: true } }, titleAr: true, titleEn: true } }),
    prisma.specification.findMany({ select: { id: true, product: { select: { slug: true } }, keyAr: true, keyEn: true, valueAr: true, valueEn: true } }),
  ]);
  const issues: Issue[] = [];
  for (const p of products) {
    for (const field of visibleProductFields) {
      const text = p[field];
      if (!text) continue;
      const reason = reasonFor(text, field.endsWith('Ar') ? 'ar' : 'en');
      if (reason) issues.push({ id: p.id, slug: p.slug, entity: 'Product', field, currentText: text, translationArabic: '', translationEnglish: '', reason });
    }
    if (p.seriesModel && (hebrew.test(p.seriesModel) || importedSource.test(p.seriesModel) || /https?:\/\//.test(p.seriesModel))) {
      issues.push({ id: p.id, slug: p.slug, entity: 'SeriesModel', field: 'seriesModel', currentText: p.seriesModel, translationArabic: '', translationEnglish: '', reason: 'visible single-language field; requires schema migration to seriesModelAr/seriesModelEn, or must be hidden' });
    }
  }
  for (const c of categories) for (const field of ['nameAr', 'nameEn'] as const) {
    const reason = reasonFor(c[field], field.endsWith('Ar') ? 'ar' : 'en');
    if (reason) issues.push({ id: c.id, slug: c.slug, entity: 'Category', field, currentText: c[field], translationArabic: '', translationEnglish: '', reason });
  }
  for (const b of brands) {
    for (const [field, text] of [['name', b.name], ['description', b.description]] as const) if (text && (hebrew.test(text) || arabic.test(text))) {
      issues.push({ id: b.id, slug: b.id, entity: 'Brand', field, currentText: text, translationArabic: '', translationEnglish: '', reason: 'visible single-language field; requires schema migration to nameAr/nameEn (and descriptionAr/descriptionEn)' });
    }
  }
  for (const v of variants) for (const [field, text, target] of [['titleAr', v.titleAr, 'ar'], ['titleEn', v.titleEn, 'en']] as const) {
    const reason = reasonFor(text, target);
    if (reason) issues.push({ id: v.id, slug: v.product.slug, entity: 'ProductVariant', field, currentText: text, translationArabic: '', translationEnglish: '', reason });
  }
  for (const s of specifications) for (const [field, text, target] of [['keyAr', s.keyAr, 'ar'], ['keyEn', s.keyEn, 'en'], ['valueAr', s.valueAr, 'ar'], ['valueEn', s.valueEn, 'en']] as const) {
    const reason = reasonFor(text, target);
    if (reason) issues.push({ id: s.id, slug: s.product.slug, entity: 'Specification', field, currentText: text, translationArabic: '', translationEnglish: '', reason });
  }
  return { products: products.length, categories: categories.length, issues };
}

function validateTranslation(change: Translation) {
  if (!change.value.trim()) throw new Error(`Empty translation for ${change.entity}:${change.id}:${change.field}`);
  const target = change.field.endsWith('Ar') ? 'ar' : 'en';
  const reason = reasonFor(change.value, target);
  if (reason) throw new Error(`Invalid ${target} translation for ${change.entity}:${change.id}:${change.field}: ${reason}`);
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const audit = await dryRun();
  const report = { generatedAt: new Date().toISOString(), mode: execute ? 'EXECUTE' : 'DRY_RUN', productCount: audit.products, categoryCount: audit.categories, changeCount: audit.issues.length, changes: audit.issues };
  const jsonPath = path.join(outputDir, `translation-review-${stamp}.json`);
  const csvPath = path.join(outputDir, `translation-review-${stamp}.csv`);
  await Promise.all([writeFile(jsonPath, JSON.stringify(report, null, 2)), writeFile(csvPath, toCsv(audit.issues))]);
  console.table(audit.issues.reduce((counts, issue) => ({ ...counts, [`${issue.entity}.${issue.field}`]: (counts[`${issue.entity}.${issue.field}`] ?? 0) + 1 }), {} as Record<string, number>));
  console.log(`Dry-run reports: ${jsonPath} and ${csvPath}`);
  if (!execute) { console.log('DRY RUN complete. No database data was changed.'); return; }
  if (!translationFile) throw new Error('Execution requires --translations <reviewed JSON file>.');
  const translations = JSON.parse(await readFile(path.resolve(translationFile), 'utf8')) as Translation[];
  translations.forEach(validateTranslation);
  const allowed = new Set(audit.issues.filter(x => x.entity === 'Product' || x.entity === 'Category').map(x => `${x.entity}:${x.id}:${x.field}`));
  for (const change of translations) if (!allowed.has(`${change.entity}:${change.id}:${change.field}`)) throw new Error(`Refusing unreviewed or non-report change: ${change.entity}:${change.id}:${change.field}`);
  const before = await Promise.all(translations.map(change => change.entity === 'Product' ? prisma.product.findUniqueOrThrow({ where: { id: change.id }, select: { id: true, slug: true, nameAr: true, nameEn: true, descriptionAr: true, descriptionEn: true } }) : prisma.category.findUniqueOrThrow({ where: { id: change.id }, select: { id: true, slug: true, nameAr: true, nameEn: true } })));
  const backupPath = path.join(outputDir, `backup-before-translation-${stamp}.json`);
  await writeFile(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), translations, before }, null, 2));
  await prisma.$transaction(async tx => {
    for (const change of translations) {
      if (change.entity === 'Product') await tx.product.update({ where: { id: change.id }, data: { [change.field]: change.value } });
      else await tx.category.update({ where: { id: change.id }, data: { [change.field]: change.value } });
    }
  });
  console.log(JSON.stringify({ status: 'SUCCESS', modified: translations.length, backupPath }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
