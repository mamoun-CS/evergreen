import assert from 'node:assert/strict';
import test from 'node:test';
import { route, storefront, evaluate } from './performance-harness.mjs';

test('autocomplete preserves catalog search predicates/order while removing count and card-only fields', async () => {
  const normal = route();
  const suggestions = route();
  const query = 'search=garden&category=planters&sort=rating&limit=6';
  const full = await normal.get(query);
  const small = await suggestions.get(`${query}&view=suggestions`);
  assert.equal(full.body.total, 10);
  assert.equal(small.status, 200);
  assert.equal(small.headers['Cache-Control'], 'no-store');
  assert.equal(suggestions.calls.length, 1);
  const ordinaryArgs = normal.calls.find(([operation]) => operation === 'findMany')[1];
  const suggestionArgs = suggestions.calls[0][1];
  assert.equal(JSON.stringify(suggestionArgs.where), JSON.stringify(ordinaryArgs.where));
  assert.equal(JSON.stringify(suggestionArgs.orderBy), JSON.stringify(ordinaryArgs.orderBy));
  assert.equal(suggestionArgs.take, 6);
  assert.equal(suggestionArgs.select.basePrice, undefined);
  assert.equal(suggestionArgs.select.brand, undefined);
  assert.equal(JSON.stringify(small.body.products[0].images), JSON.stringify(full.body.products[0].images));
});

test('suggestions stay bounded and preserve rate limiting and query validation', async () => {
  const denied = route(false);
  assert.equal((await denied.get('search=test&view=suggestions')).status, 429);
  assert.equal(denied.calls.length, 0);
  const long = route();
  assert.equal((await long.get(`search=${'a'.repeat(121)}&view=suggestions`)).status, 400);
  assert.equal(long.calls.length, 0);
  const bounded = route();
  await bounded.get('search=test&limit=10000&view=suggestions');
  assert.equal(bounded.calls[0][1].take, 6);
});

test('card serialization preserves main image ordering, prices, fallback and input immutability', () => {
  const { serializeCard } = storefront();
  const product = { id: 'p', basePrice: '12.50', discountPrice: '0', images: ['/legacy.jpg'], productImages: [
    { path: '/second.jpg', isMain: false, sortOrder: 0 },
    { path: '/main.jpg', isMain: true, sortOrder: 2 },
  ] };
  const before = JSON.stringify(product);
  const card = serializeCard(product);
  assert.equal(card.images[0], '/main.jpg');
  assert.equal(card.images.length, 1);
  assert.equal(card.basePrice, 12.5);
  assert.equal(card.discountPrice, 0);
  assert.equal('productImages' in card, false);
  assert.equal(JSON.stringify(product), before);
  assert.equal(serializeCard({ images: ['/legacy.jpg'] }).images[0], '/legacy.jpg');
  assert.equal(serializeCard({ images: ['/products/missing.jpg'] }).images[0], '/products/missing.jpg');
});


test('autocomplete cleanup aborts immediately, and a late old response cannot replace suggestions', async () => {
  const effects = [];
  const updates = [];
  let request;
  let timer;
  const react = {
    useState: value => [typeof value === 'string' ? 'garden' : value, next => updates.push(next)],
    useRef: () => ({ current: null }), useId: () => 'test',
    useEffect: effect => effects.push(effect), createElement: () => null,
  };
  const exports = evaluate('src/components/layout/SearchAutocomplete.tsx', {
    react, 'next/link': {}, 'next/image': {}, 'next/navigation': { useRouter: () => ({ push() {} }) },
    './LanguageContext': { useLanguage: () => ({ lang: 'en' }) },
  }, undefined, {
    AbortController,
    setTimeout: callback => { timer = callback; return 1; }, clearTimeout: () => {},
    fetch: (_url, options) => new Promise(resolve => { request = { ...options, resolve }; }),
  });
  exports.default({});
  const cleanup = effects[0]();
  timer();
  assert.equal(request.signal.aborted, false);
  cleanup();
  assert.equal(request.signal.aborted, true);
  request.resolve({ ok: true, json: async () => ({ products: [{ id: 'stale' }] }) });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(updates.length, 0);
});


test('brand/application mutations invalidate public catalog data only after authorized successful writes', async () => {
  for (const resource of ['brand', 'application']) {
    for (const operation of ['create', 'update', 'delete']) {
      for (const scenario of ['success', 'unauthorized', 'database-error']) {
        const calls = [];
        const actionName = operation + resource[0].toUpperCase() + resource.slice(1);
        const actions = evaluate(`src/app/admin/actions/${resource}-actions.ts`, {
          '@/lib/admin-validation': { validate: async (_schema, value) => value },
          '@/lib/validation': {},
          '@/lib/auth': { assertAdmin: async () => { if (scenario === 'unauthorized') throw new Error('Unauthorized'); } },
          '@/lib/admin-prisma': { prisma: { [resource]: {
            count: async () => 0,
            [operation]: async () => { calls.push('write'); if (scenario === 'database-error') throw new Error('database'); },
          }, product: { count: async () => 0 } } },
          'next/cache': { revalidatePath: () => calls.push('path'), revalidateTag: tag => calls.push(tag) },
        });
        const invoke = () => operation === 'create' ? actions[actionName]({ name: 'Test' }) : actions[actionName]('id', { name: 'Test' });
        if (scenario === 'success') {
          await invoke();
          assert.deepEqual(calls, ['write', 'path', 'products']);
        } else {
          await assert.rejects(invoke);
          assert.equal(calls.includes('products'), false);
          if (scenario === 'unauthorized') assert.equal(calls.length, 0);
        }
      }
    }
  }
});
