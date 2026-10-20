import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { route, storefront } from '../tests/performance-harness.mjs';

// Structural measurements using the real route/serializer with synthetic data.
// These are not database latency, browser transfer, or Core Web Vitals results.
const baselineRef = readFileSync('artifacts/performance/baseline-ref.txt', 'utf8').trim();
const original = file => execFileSync('git', ['show', `${baselineRef}:${file}`], { encoding: 'utf8' });
const baseline = route(true, original('src/app/api/products/route.ts'));
const optimized = route();
await baseline.get('search=garden&limit=6');
await optimized.get('search=garden&limit=6&view=suggestions');
const product = {
  id: 'sample', nameEn: 'Sample', nameAr: 'عينة', basePrice: '20', discountPrice: null,
  images: ['/legacy.jpg'], productImages: Array.from({ length: 4 }, (_, i) => ({
    path: `/sample-${i}.jpg`, isMain: i === 0, sortOrder: i,
  })),
};
const before = storefront(original('src/lib/storefront.ts')).serializeCard(product);
const after = storefront().serializeCard(product);
const result = {
  scenario: 'Synthetic fixture; actual source execution; no database/network',
  autocomplete: {
    before: { productOperations: baseline.calls.length, selectedFields: Object.keys(baseline.calls.find(([op]) => op === 'findMany')[1].select) },
    after: { productOperations: optimized.calls.length, selectedFields: Object.keys(optimized.calls[0][1].select) },
    note: 'Rate-limit database work is unchanged and excluded. Prisma relation queries may add SQL statements.',
  },
  serializedCard: {
    fixtureImageCount: 4,
    beforeJsonBytes: Buffer.byteLength(JSON.stringify(before)),
    afterJsonBytes: Buffer.byteLength(JSON.stringify(after)),
    displayedImageUnchanged: before.images[0] === after.images[0],
    note: 'Raw fixture JSON bytes, not compressed or measured production transfer sizes.',
  },
};
writeFileSync('artifacts/performance/structural-measurements.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
