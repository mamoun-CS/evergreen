import { loadEnvConfig } from '@next/env';
import { PrismaClient } from '@prisma/client';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

loadEnvConfig(process.cwd());

const execute = process.argv.slice(2).includes('--execute');
const reportPath = path.join(process.cwd(), 'artifacts', 'as-titanium-import', 'arabic-translation-report.json');
const sourcePath = path.join(process.cwd(), 'artifacts', 'as-titanium-import', 'translation-template-filled.csv');
const arabic = /[\u0600-\u06FF]/;
const hebrew = /[\u0590-\u05FF]/;

type RecordToTranslate = { id: string; slug: string; source: string; current: string; type: 'category' | 'product' };

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function translate(source: string) {
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'he');
  url.searchParams.set('tl', 'ar');
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', source);

  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error(`Translation service returned ${response.status}.`);
      const data = await response.json() as Array<Array<[string]>>;
      const result = data[0]?.map(([part]) => part).join('').replace(/\s+/g, ' ').trim();
      if (!result) throw new Error('Translation service returned an empty translation.');
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < 4) await sleep(500 * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const sourceBySlug = new Map<string, string>();
    const csv = await readFile(sourcePath, 'utf8');
    for (const line of csv.split(/\r?\n/).slice(1)) {
      const fields = [...line.matchAll(/(?:^|,)(?:"((?:"")*[^"]*)"|([^,]*))/g)].map((match) => (match[1] ?? match[2] ?? '').replace(/""/g, '"'));
      if (fields[1] && fields[3]) sourceBySlug.set(fields[1], fields[3]);
    }
    const [categories, products] = await Promise.all([
      prisma.category.findMany({ where: { slug: { startsWith: 'as-titanium-category-' } }, select: { id: true, slug: true, nameAr: true, nameEn: true } }),
      prisma.product.findMany({ where: { slug: { startsWith: 'as-titanium-product-' } }, select: { id: true, slug: true, nameAr: true, nameEn: true } }),
    ]);
    const records: RecordToTranslate[] = [
      ...categories.filter((item) => sourceBySlug.has(item.slug)).map((item) => ({ id: item.id, slug: item.slug, source: sourceBySlug.get(item.slug)!, current: item.nameAr, type: 'category' as const })),
      ...products.filter((item) => sourceBySlug.has(item.slug)).map((item) => ({ id: item.id, slug: item.slug, source: sourceBySlug.get(item.slug)!, current: item.nameAr, type: 'product' as const })),
    ];
    if (records.some((record) => !record.source.trim())) throw new Error('A source name is empty; refusing to translate incomplete data.');

    console.log(JSON.stringify({ mode: execute ? 'execute' : 'dry-run', categories: records.filter((record) => record.type === 'category').length, products: records.filter((record) => record.type === 'product').length }, null, 2));
    if (!execute) return;

    const report: Array<RecordToTranslate & { translated: string }> = [];
    const failures: Array<{ slug: string; type: string; error: string }> = [];
    for (let index = 0; index < records.length; index++) {
      const record = records[index];
      try {
        const translated = await translate(record.source);
        if (hebrew.test(translated)) throw new Error(`Translation still contains Hebrew text: ${translated}`);
        if (record.type === 'category') await prisma.category.update({ where: { id: record.id }, data: { nameAr: translated } });
        else await prisma.product.update({ where: { id: record.id }, data: { nameAr: translated } });
        report.push({ ...record, translated });
      } catch (error) {
        failures.push({ slug: record.slug, type: record.type, error: error instanceof Error ? error.message : String(error) });
      }
      if ((index + 1) % 25 === 0 || index + 1 === records.length) {
        await mkdir(path.dirname(reportPath), { recursive: true });
        await writeFile(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), translated: report, failures }, null, 2), 'utf8');
        console.log(`[${index + 1}/${records.length}] translated=${report.length} failed=${failures.length}`);
      }
      await sleep(150);
    }
    if (failures.length) throw new Error(`${failures.length} records could not be translated; details are in ${reportPath}.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
