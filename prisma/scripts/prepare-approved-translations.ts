import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type Issue = { id: string; slug: string; entity: string; field: string; currentText: string; reason: string };
type Translation = { id: string; entity: 'Product' | 'Category'; field: 'nameAr' | 'nameEn' | 'descriptionAr' | 'descriptionEn'; value: string };

const reportPath = path.resolve(process.argv[2] ?? 'prisma/catalog-translation-output/translation-review-2026-10-03T13-55-54-895Z.json');
const outputDir = path.resolve('prisma/catalog-translation-output');
const hebrew = /[\u0590-\u05FF]/;
const arabic = /[\u0600-\u06FF]/;
const latin = /[A-Za-z]/;
const url = /https?:\/\//i;
const modelCode = /\b(?=[A-Za-z0-9-]*\d)[A-Za-z0-9-]+\b/g;

function targetFor(field: string) { return field.endsWith('Ar') ? 'ar' : 'en'; }
function validate(value: string, target: 'ar' | 'en') {
  if (!value.trim()) return 'empty translation';
  if (url.test(value)) return 'contains URL';
  if (hebrew.test(value)) return 'contains Hebrew';
  if (target === 'en' && arabic.test(value)) return 'English value contains Arabic';
  if (target === 'ar' && latin.test(value)) return 'Arabic value contains Latin';
  return null;
}
function hasUntranslatableModelCode(value: string) {
  const tokens = value.match(modelCode) ?? [];
  return tokens.some(token => {
    const normalized = token.toLowerCase();
    // Measurements can safely be translated (e.g. 40 cm -> 40 سم); opaque
    // alphanumeric codes such as 125-109C must be preserved by a reviewer.
    return !/^\d+(?:[x×]\d+)+(?:cm|mm)?$/.test(normalized) && !/^\d+(?:\.\d+)?(?:cm|mm|m|l|ltr|ml|kg|g|w|v)$/.test(normalized);
  });
}
function outputFromGoogle(payload: unknown) {
  const segments = (payload as Array<Array<Array<string>>>)[0] ?? [];
  return segments.map(segment => segment[0] ?? '').join('');
}
async function translateBatch(texts: string[], target: 'ar' | 'en') {
  const separator = '\n[[[EVERGREEN_TRANSLATION_BOUNDARY]]]\n';
  const query = new URLSearchParams({ client: 'gtx', sl: 'auto', tl: target, dt: 't', q: texts.join(separator) });
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`https://translate.googleapis.com/translate_a/single?${query}`);
      if (!response.ok) throw new Error(`Translation API returned ${response.status}`);
      const translated = outputFromGoogle(await response.json());
      const values = translated.split(separator).map(value => value.trim());
      if (values.length !== texts.length) throw new Error(`Batch boundary mismatch: expected ${texts.length}, got ${values.length}`);
      return values;
    } catch (error) { lastError = error; await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1))); }
  }
  throw lastError;
}
async function pool<T>(items: T[], limit: number, work: (item: T) => Promise<void>) {
  let index = 0;
  await Promise.all(Array.from({ length: limit }, async () => { while (index < items.length) await work(items[index++]); }));
}
function csvCell(value: string) { return `"${value.replace(/"/g, '""')}"`; }

async function main() {
  const report = JSON.parse(await readFile(reportPath, 'utf8')) as { changes: Issue[] };
  const supported = report.changes.filter((issue): issue is Issue & { entity: 'Product' | 'Category'; field: Translation['field'] } =>
    (issue.entity === 'Product' || issue.entity === 'Category') && ['nameAr', 'nameEn', 'descriptionAr', 'descriptionEn'].includes(issue.field));
  const excluded = report.changes.filter(issue =>
    !((issue.entity === 'Product' || issue.entity === 'Category') && ['nameAr', 'nameEn', 'descriptionAr', 'descriptionEn'].includes(issue.field)));
  const unique = new Map<string, { text: string; target: 'ar' | 'en' }>();
  const blocked: Array<Issue & { validation: string }> = [];
  for (const issue of supported) {
    if (url.test(issue.currentText)) blocked.push({ ...issue, validation: 'source URL was not sent to translation service' });
    else if (issue.field.startsWith('description') && hasUntranslatableModelCode(issue.currentText)) blocked.push({ ...issue, validation: 'contains opaque model/SKU-like code; requires manual preservation' });
    else unique.set(`${targetFor(issue.field)}\u0000${issue.currentText}`, { text: issue.currentText, target: targetFor(issue.field) });
  }
  const translated = new Map<string, string>();
  const batches: Array<{ target: 'ar' | 'en'; entries: Array<[string, { text: string; target: 'ar' | 'en' }]> }> = [];
  for (const target of ['ar', 'en'] as const) {
    let entries: Array<[string, { text: string; target: 'ar' | 'en' }]> = [], chars = 0;
    for (const entry of unique.entries()) {
      if (entry[1].target !== target) continue;
      if (entries.length === 30 || chars + entry[1].text.length > 6000) { batches.push({ target, entries }); entries = []; chars = 0; }
      entries.push(entry); chars += entry[1].text.length;
    }
    if (entries.length) batches.push({ target, entries });
  }
  console.log(`Sending ${unique.size} unique text values in ${batches.length} text-only batches.`);
  await pool(batches, 8, async batch => {
    const values = await translateBatch(batch.entries.map(([, entry]) => entry.text), batch.target);
    batch.entries.forEach(([key], index) => translated.set(key, values[index]));
  });
  const translations: Translation[] = [];
  for (const issue of supported) {
    if (url.test(issue.currentText) || (issue.field.startsWith('description') && hasUntranslatableModelCode(issue.currentText))) continue;
    const target = targetFor(issue.field);
    const value = translated.get(`${target}\u0000${issue.currentText}`) ?? '';
    const validation = validate(value, target);
    if (validation) blocked.push({ ...issue, validation });
    else translations.push({ id: issue.id, entity: issue.entity, field: issue.field, value });
  }
  await mkdir(outputDir, { recursive: true });
  const approvedPath = path.join(outputDir, 'approved-translations.json');
  const reviewPath = path.join(outputDir, 'translation-manual-review.json');
  const csvPath = path.join(outputDir, 'translation-manual-review.csv');
  await Promise.all([
    writeFile(approvedPath, JSON.stringify(translations, null, 2)),
    writeFile(reviewPath, JSON.stringify({ excluded, blocked }, null, 2)),
    writeFile(csvPath, ['id,slug,entity,field,currentText,validation', ...blocked.map(row => [row.id, row.slug, row.entity, row.field, row.currentText, row.validation].map(csvCell).join(','))].join('\r\n')),
  ]);
  const summary = translations.reduce((counts, item) => ({ ...counts, [`${item.entity}.${item.field}`]: (counts[`${item.entity}.${item.field}`] ?? 0) + 1 }), {} as Record<string, number>);
  console.log(JSON.stringify({ status: 'PREPARED_FOR_REVIEW_ONLY', approvedPath, generated: summary, manualReview: { excluded: excluded.length, blocked: blocked.length, reportPath: reviewPath } }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
