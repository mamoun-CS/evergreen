import { Prisma, PrismaClient } from '@prisma/client';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Safe Ever Green catalog repair.
 *
 * Default: dry run. It only reads the database and writes JSON reports.
 * Execute: npx tsx prisma/scripts/fix-evergreen-catalog.ts --execute
 *
 * The execute mode changes only the 15 explicitly approved titles and deletes
 * only the three explicitly approved records, after re-validating every guard.
 */

const prisma = new PrismaClient();
const execute = process.argv.includes('--execute');
const outputDir = path.resolve('prisma/catalog-audit-output');

const malformed = [
  { slug: '0-vt3jy1-9r3jhq1x4auiyo5m-6kaqizvda6h-ighomg9jjan-yl-i-27fe-v-5tzu4iscu-fyk9mo9f', id: 'cmuo3r5pr0050vj0gu09x1kny' },
  { slug: 'dtm2bn51bmso3p9awm28fredftimq63kwd1z-inslszul6xp-9gmiwsl8ysqkdshog28-0qywsikktin', id: 'cmuo3r5eu004zvj0gvp8gyrd0' },
  { slug: 'uiano2mb9j-tw-y6liq362q1b-ndnd11sc3lyg7xtcxp-snhhvr-rfizegynzw-5ozr40q-gfzhwq-c1', id: 'cmuo3r51w004yvj0gyj40cwfa' },
] as const;

const corrections = [
  ['qma-10-ltr', 'إبريق ري 10 لتر', '10 L Watering Can'],
  ['qma-5-ltr', 'إبريق ري 5 لتر', '5 L Watering Can'],
  ['alwqwf-lwaa', 'حامل للأوعية', 'Planter Stand'],
  ['almqsat', 'مقصات تقليم', 'Pruning Shears'],
  ['zara-ilk-qaa-85-sm', 'حوض إيلك مع قاعدة – 85 سم', 'Ilk Planter with Base – 85 cm'],
  ['zara-ilk-qaa-60-sm', 'حوض إيلك مع قاعدة – 60 سم', 'Ilk Planter with Base – 60 cm'],
  ['zara-ilk-qaa-40-sm', 'حوض إيلك مع قاعدة – 40 سم', 'Ilk Planter with Base – 40 cm'],
  ['jwla-mtfya-wasaa-shn-balwan-mkhtlfa', 'وعاء دائري مطفي عريض مع صحن – ألوان متنوعة', 'Wide Matte Round Planter with Saucer – Assorted Colors'],
  ['dykwr-abyd-dayry-azrq-shn', 'وعاء ديكور دائري أبيض وأزرق مع صحن', 'White and Blue Round Decorative Planter with Saucer'],
  ['nwlyna-rqaqat-snaaya-ma-waa', 'نبات نولينا صناعي بأوراق رفيعة مع أصيص', 'Artificial Nolina Plant with Pot'],
  ['zraaa-trba-mkhtlta-mstwrda-mn-klasman-klasman-ma-albyrlayt-50-ltr', 'تربة زراعية مخلوطة مستوردة من كلاسمان مع بيرلايت – 50 لتر', 'Imported Klasmann Potting Mix with Perlite – 50 L'],
  ['zraaa-trba-mkhtlta-mstwrda-mn-klasman-klasman-ma-albyrlayt-30-ltr', 'تربة زراعية مخلوطة مستوردة من كلاسمان مع بيرلايت – 30 لتر', 'Imported Klasmann Potting Mix with Perlite – 30 L'],
  ['mjmwaa-mn-3-khws', 'طقم 3 أواني خوص', 'Set of 3 Wicker Planters'],
  ['mjmwaa-mn-3-khws-mkhrwty-barjl-wwjh-waa', 'طقم أواني خوص مخروطية بأرجل وتصميم وجه', 'Set of Cone Wicker Planters with Legs and Face Design'],
  ['mjmwaa-mn-3-astwanat', 'طقم 3 أواني أسطوانية', 'Set of 3 Cylindrical Planters'],
] as const;

type Product = Prisma.ProductGetPayload<{ select: typeof productSelect }>;
const productSelect = {
  id: true, slug: true, nameAr: true, nameEn: true, descriptionEn: true, seriesModel: true, color: true,
  lengthCm: true, widthCm: true, heightCm: true, images: true,
  datasheetUrl: true, manualUrl: true, updatedAt: true,
} satisfies Prisma.ProductSelect;

const json = (value: unknown) => JSON.stringify(value, null, 2);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const sourceUrl = (p: Product) => p.datasheetUrl ?? p.manualUrl ?? p.seriesModel?.match(/https?:\/\/\S+/)?.[0] ?? p.descriptionEn?.match(/https?:\/\/\S+/)?.[0] ?? null;
const dimensions = (p: Product) => ({ lengthCm: p.lengthCm?.toString() ?? null, widthCm: p.widthCm?.toString() ?? null, heightCm: p.heightCm?.toString() ?? null });

function urlSize(url?: string | null) {
  if (!url) return null;
  const match = decodeURIComponent(url).match(/(?:^|[^0-9])(\d{1,3}(?:[x×]\d{1,3})?|\d{1,3})(?:[-_\s])*(?:cm|sm|س(?:م)?|ס["״']?מ|см)(?:[^a-z0-9]|$)/i);
  return match?.[1] ?? null;
}

function visibleSize(p: Product) {
  const title = `${p.slug} ${p.nameAr} ${p.nameEn}`;
  const match = title.match(/(\d{1,3}(?:[x×]\d{1,3})?)(?:[-_\s])*(?:cm|sm|س(?:م)?|ס["״']?מ|см|لتر|ltr|l\b)/i);
  return match?.[1] ?? null;
}

function reportProduct(p: Product) {
  return { id: p.id, slug: p.slug, nameAr: p.nameAr, nameEn: p.nameEn, color: p.color, dimensions: dimensions(p), imageCount: p.images.length, sourceUrl: sourceUrl(p) };
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const expectedSlugs = [...malformed.map(x => x.slug), ...corrections.map(x => x[0])];
  const affected = await prisma.product.findMany({ where: { slug: { in: expectedSlugs } }, select: productSelect });
  // Kept separately from the reporting selection so an execute-mode backup
  // contains every scalar field exactly as it existed before the transaction.
  const fullAffectedBefore = execute
    ? await prisma.product.findMany({ where: { slug: { in: expectedSlugs } } })
    : [];
  const bySlug = new Map(affected.map(p => [p.slug, p]));
  const missing = expectedSlugs.filter(slug => !bySlug.has(slug));
  const malformedRecords = malformed.map(target => ({ target, product: bySlug.get(target.slug) })).filter((x): x is { target: typeof malformed[number]; product: Product } => Boolean(x.product));
  const malformedFailures = malformedRecords.filter(({ target, product }) => product.id !== target.id || product.images.length !== 0);
  const nameChanges = corrections.map(([slug, nameAr, nameEn]) => {
    const product = bySlug.get(slug);
    return product && { slug, currentNameAr: product.nameAr, currentNameEn: product.nameEn, newNameAr: nameAr, newNameEn: nameEn, action: 'UPDATE_NAME' };
  }).filter(Boolean);

  const all = await prisma.product.findMany({ select: productSelect, orderBy: { slug: 'asc' } });
  const duplicateGroups = [...all.reduce((map, product) => {
    const key = product.nameAr.trim().replace(/\s+/g, ' ');
    const group = map.get(key) ?? [];
    group.push(product); map.set(key, group); return map;
  }, new Map<string, Product[]>()).entries()]
    .filter(([, products]) => products.length > 1)
    .map(([nameAr, products]) => ({
      nameAr,
      count: products.length,
      action: 'MANUAL_REVIEW_ONLY',
      reason: 'Same title can represent a size/color variant. No product is changed automatically.',
      products: products.map(p => ({ ...reportProduct(p), visibleSize: visibleSize(p) })),
    }));
  const sizeMismatches = all.map(p => ({ p, source: sourceUrl(p), visible: visibleSize(p) }))
    .filter(({ source, visible }) => Boolean(source && visible && urlSize(source) && urlSize(source) !== visible))
    .map(({ p, source, visible }) => ({ slug: p.slug, currentName: p.nameAr, sourceUrl: source, visibleSize: visible, sourceUrlSize: urlSize(source), action: 'MANUAL_REVIEW_ONLY' }));

  const plan = {
    generatedAt: new Date().toISOString(), mode: execute ? 'EXECUTE' : 'DRY_RUN',
    safeguards: { missingSlugs: missing, malformedGuardFailures: malformedFailures.map(({ target, product }) => ({ slug: target.slug, actualId: product.id, imageCount: product.images.length })) },
    proposedDeletes: malformedRecords.map(({ product }) => ({ ...reportProduct(product), action: 'DELETE_AFTER_GUARDS' })),
    proposedNameUpdates: nameChanges,
    unchangedFields: ['images', 'basePrice', 'discountPrice', 'categories', 'slug', 'stockQuantity', 'datasheetUrl', 'manualUrl'],
  };
  await Promise.all([
    writeFile(path.join(outputDir, `proposed-changes-${stamp}.json`), json(plan)),
    writeFile(path.join(outputDir, `duplicate-name-review-${stamp}.json`), json({ generatedAt: new Date().toISOString(), count: duplicateGroups.length, groups: duplicateGroups })),
    writeFile(path.join(outputDir, `source-size-mismatch-review-${stamp}.json`), json({ generatedAt: new Date().toISOString(), count: sizeMismatches.length, records: sizeMismatches })),
  ]);

  const preview = (value: string, limit = 100) => value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
  console.table([...plan.proposedDeletes.map(p => ({ slug: p.slug, currentName: preview(p.nameAr), newName: '—', action: 'DELETE' })), ...nameChanges.map(p => ({ slug: p!.slug, currentName: preview(p!.currentNameAr), newName: p!.newNameAr, action: 'UPDATE_NAME' }))]);
  console.log(`Reports: ${outputDir}`);
  console.log(`Duplicate-name groups for manual review: ${duplicateGroups.length}; source-size mismatches: ${sizeMismatches.length}.`);
  if (!execute) { console.log('DRY RUN complete. No database data was changed. Re-run with --execute to apply the approved plan.'); return; }
  if (missing.length || malformedFailures.length || nameChanges.length !== corrections.length) throw new Error(`Refusing to execute: missing=${missing.length}, malformed guard failures=${malformedFailures.length}, name updates found=${nameChanges.length}/${corrections.length}.`);

  const fullBeforeBySlug = new Map(fullAffectedBefore.map(product => [product.slug, product]));
  const backup = {
    createdAt: new Date().toISOString(),
    records: malformed.map(({ slug }) => ({ action: 'DELETE', before: fullBeforeBySlug.get(slug) })),
    recordsToUpdate: corrections.map(([slug]) => ({ action: 'UPDATE_NAME', before: fullBeforeBySlug.get(slug) })),
  };
  const backupPath = path.join(outputDir, `backup-before-execute-${stamp}.json`);
  await writeFile(backupPath, json(backup));

  await prisma.$transaction(async tx => {
    for (const { target, product } of malformedRecords) {
      const result = await tx.product.deleteMany({ where: { id: target.id, slug: target.slug, images: { isEmpty: true } } });
      if (result.count !== 1) throw new Error(`Delete guard failed for ${target.slug}.`);
    }
    for (const change of nameChanges) await tx.product.update({ where: { slug: change!.slug }, data: { nameAr: change!.newNameAr, nameEn: change!.newNameEn } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  const remainingBad = await prisma.product.findMany({ where: { slug: { in: malformed.map(x => x.slug) } }, select: { slug: true } });
  const verified = await prisma.product.findMany({ where: { slug: { in: corrections.map(x => x[0]) } }, select: { slug: true, nameAr: true, nameEn: true } });
  const wrongNames = corrections.filter(([slug, nameAr, nameEn]) => !verified.some(p => p.slug === slug && p.nameAr === nameAr && p.nameEn === nameEn));
  if (remainingBad.length || wrongNames.length) throw new Error(`Post-execution verification failed: remaining deleted products=${remainingBad.length}, incorrect names=${wrongNames.length}. Backup: ${backupPath}`);
  console.log(json({ status: 'SUCCESS', deleted: malformed.length, updated: corrections.length, duplicateGroupsLeftForReview: duplicateGroups.length, sourceSizeMismatchesLeftForReview: sizeMismatches.length, errors: [] }));
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
