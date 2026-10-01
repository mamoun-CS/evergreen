import { loadEnvConfig } from '@next/env';
import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

loadEnvConfig(process.cwd());

type TranslationRow = {
  type: 'category' | 'product_name';
  database_slug: string;
  source_id: string;
  hebrew_source: string;
  english_translation: string;
};

const inputPath = path.join(process.cwd(), 'artifacts', 'as-titanium-import', 'translation-template-filled.csv');
const execute = process.argv.slice(2).includes('--execute');

function parseCsv(text: string): TranslationRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') { field += '"'; index++; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (!quoted && char === ',') { row.push(field); field = ''; continue; }
    if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && text[index + 1] === '\n') index++;
      row.push(field); field = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
      continue;
    }
    field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...data] = rows;
  const required = ['type', 'database_slug', 'source_id', 'hebrew_source', 'english_translation'];
  if (!header || required.some((name, index) => header[index] !== name)) throw new Error('Translation CSV header is invalid.');
  return data.map((columns) => Object.fromEntries(header.map((name, index) => [name, columns[index] ?? ''])) as TranslationRow);
}

async function main() {
  const rows = parseCsv((await readFile(inputPath, 'utf8')).replace(/^\uFEFF/, ''));
  if (rows.length !== 1793) throw new Error(`Expected 1793 translation rows, received ${rows.length}.`);
  const seen = new Set<string>();
  for (const row of rows) {
    if (!['category', 'product_name'].includes(row.type)) throw new Error(`Unsupported row type: ${row.type}`);
    if (!row.database_slug || !row.hebrew_source || !row.english_translation.trim()) throw new Error(`Incomplete translation for ${row.database_slug}.`);
    const key = `${row.type}:${row.database_slug}`;
    if (seen.has(key)) throw new Error(`Duplicate CSV row: ${key}`);
    seen.add(key);
  }

  const prisma = new PrismaClient();
  try {
    const categories = rows.filter((row) => row.type === 'category');
    const products = rows.filter((row) => row.type === 'product_name');
    const [databaseCategories, databaseProducts] = await Promise.all([
      prisma.category.findMany({ where: { slug: { in: categories.map((row) => row.database_slug) } }, select: { id: true, slug: true, nameAr: true } }),
      prisma.product.findMany({ where: { slug: { in: products.map((row) => row.database_slug) } }, select: { id: true, slug: true, nameAr: true } }),
    ]);
    const categoryBySlug = new Map(databaseCategories.map((item) => [item.slug, item]));
    const productBySlug = new Map(databaseProducts.map((item) => [item.slug, item]));
    const mismatches = rows.filter((row) => {
      const record = row.type === 'category' ? categoryBySlug.get(row.database_slug) : productBySlug.get(row.database_slug);
      return !record || record.nameAr !== row.hebrew_source;
    });
    if (mismatches.length) throw new Error(`Refusing to update ${mismatches.length} mismatched or missing database records.`);

    console.log(JSON.stringify({ mode: execute ? 'execute' : 'dry-run', categories: categories.length, products: products.length, mismatches: 0 }, null, 2));
    if (!execute) return;

    for (let offset = 0; offset < rows.length; offset += 100) {
      const batch = rows.slice(offset, offset + 100);
      await prisma.$transaction(batch.map((row) => row.type === 'category'
        ? prisma.category.update({ where: { slug: row.database_slug }, data: { nameEn: row.english_translation.trim() } })
        : prisma.product.update({ where: { slug: row.database_slug }, data: { nameEn: row.english_translation.trim() } }),
      ));
      console.log(`[${Math.min(offset + batch.length, rows.length)}/${rows.length}] translated`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
