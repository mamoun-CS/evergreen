import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkCategoryAssets, prepareBuild } from '../scripts/prepare-build.mjs';

test('build validates assets before deploying migrations and generating the client', () => {
  const calls = [];
  prepareBuild({ check: () => calls.push('assets'), run: args => calls.push(args.join(' ')) });
  assert.deepEqual(calls, ['assets', 'migrate deploy', 'generate']);
});

test('migration failure prevents client generation and the subsequent build', () => {
  const calls = [];
  assert.throws(() => prepareBuild({ check: () => {}, run: args => {
    calls.push(args.join(' ')); throw new Error('database unavailable');
  } }), /database unavailable/);
  assert.deepEqual(calls, ['migrate deploy']);
});

test('missing assets stop preparation before database changes', () => {
  let called = false;
  assert.throws(() => prepareBuild({ check: () => { throw new Error('missing image'); }, run: () => { called = true; } }), /missing image/);
  assert.equal(called, false);
});

test('all reviewed category images are included in the deployment', () => {
  assert.doesNotThrow(() => checkCategoryAssets());
});

test('catalog migration includes all reviewed assets and preserves existing category IDs', () => {
  const sql = readFileSync('prisma/migrations/20261015120000_restore_source_category_catalog/migration.sql', 'utf8');
  const assets = JSON.parse(readFileSync('data/catalog-category-assets.json', 'utf8'));
  for (const asset of assets) assert.ok(sql.includes(`'${asset.localImage}'`), asset.slug);
  assert.doesNotMatch(sql, /\b(?:DELETE\s+FROM|DROP\s+TABLE|TRUNCATE)\b/i);
  const updates = [...sql.matchAll(/ON CONFLICT \("slug"\) DO UPDATE SET ([^;]+);/g)];
  assert.ok(updates.length >= assets.length);
  for (const update of updates) assert.doesNotMatch(update[1], /"id"\s*=/);
  assert.match(sql, /BEGIN;/);
  assert.match(sql, /COMMIT;/);
});
