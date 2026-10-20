import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluate, storefront, route } from './performance-harness.mjs';

const query = evaluate('src/lib/product-query.ts', {});
const params = value => new URLSearchParams(value);

test('canonical query retains Arabic/English substring matching including categories and all API filters', () => {
  for (const search of ['حديقة', 'garden', 'garden decor', 'AB-12', 'حد']) {
    const built = query.buildProductQuery(params({ search, category: 'pots', brand: 'brand', application: 'outdoor', purchaseMode: 'CONTACT_FOR_PRICE', minPrice: '0', maxPrice: '120', availability: 'in-stock', featured: 'true', discounted: 'true', sort: 'rating', page: '2' }));
    assert.equal(built.where.OR.length, 6);
    assert.equal(built.where.OR[0].nameEn.contains, search);
    assert.equal(built.where.OR[1].nameAr.mode, 'insensitive');
    assert.equal(built.where.OR[5].categories.some.OR[0].nameEn.contains, search);
    assert.equal(built.where.categories.some.OR[2].parent.is.slug, 'pots');
    assert.equal(built.where.brandId, 'brand');
    assert.equal(built.where.basePrice.gte, 0);
    assert.equal(built.where.basePrice.lte, 120);
    assert.equal(built.where.stockQuantity.gt, 0);
    assert.equal(built.where.isAvailable, true);
    assert.equal(built.where.isFeatured, true);
    assert.equal(built.where.discountPrice.not, null);
    assert.equal(built.where.purchaseMode, 'CONTACT_FOR_PRICE');
    assert.equal(built.page, 2);
  }
});

test('visibility defaults, page limits and sorting differences remain explicit and stable', () => {
  assert.equal(Object.keys(query.buildProductQuery(params('')).where).length, 0);
  assert.equal(query.buildProductQuery(params('limit=6')).limit, 6);
  assert.equal(query.buildProductQuery(params('limit=6'), 30).limit, 30); // shop always uses 30
  for (const sort of ['newest', 'rating', 'price-asc', 'price-desc', 'featured', 'unknown']) {
    const result = query.buildProductQuery(params({ sort, page: '9999999999999999999999' }));
    assert.equal(result.page, 1);
    assert.equal(JSON.stringify(result.orderBy.at(-1)), '{"id":"asc"}');
  }
  assert.equal(query.buildProductQuery(params('availability=available')).where.stockQuantity, undefined);
  assert.throws(() => query.buildProductQuery(params({ search: 'a'.repeat(121) })), /too long/);
});

function serviceHarness() {
  const calls = [];
  const entries = new Map();
  let clock = 1000;
  let total = 10;
  let price = 50;
  let stock = 5;
  const nextCache = {
    unstable_cache: (fn, key, options) => async () => {
      const id = JSON.stringify(key);
      if (!entries.has(id)) entries.set(id, { value: await fn(), tags: options.tags });
      return entries.get(id).value;
    },
    revalidateTag: tag => { for (const [key, entry] of entries) if (entry.tags.includes(tag)) entries.delete(key); },
    revalidatePath() {},
  };
  const service = evaluate('src/lib/product-service.ts', {
    'server-only': {}, react: { cache: fn => fn }, 'next/cache': nextCache,
    './product-query': query, './storefront': storefront(),
    './prisma': { prisma: { product: {
      count: async args => { calls.push(['count', args]); return total; },
      findMany: async args => { calls.push(['findMany', args]); return [{ id: 'public', basePrice: price, stockQuantity: stock, images: [] }]; },
    } } },
  }, undefined, { Date: class extends Date { static now() { return clock; } } });
  return { service, calls, entries, nextCache, advance: () => { clock += 60_000; }, change: () => { total = 11; price = 75; stock = 0; } };
}

test('one shared count entry serves SSR/API-style reads while prices, stock and membership are fetched every time', async () => {
  const h = serviceHarness();
  const first = await h.service.loadProductListing(params(''));
  h.change();
  const second = await h.service.loadProductListing(params('page=2&sort=price-desc'));
  assert.equal(first.products[0].basePrice, 50);
  assert.equal(second.products[0].basePrice, 75);
  assert.equal(second.products[0].stockQuantity, 0);
  assert.equal(h.entries.size, 1);
  assert.equal(h.calls.filter(([op]) => op === 'count').length, 1);
  assert.equal(h.calls.filter(([op]) => op === 'findMany').length, 2);
  const selection = h.calls.find(([op]) => op === 'findMany')[1].select;
  for (const privateField of ['user', 'cartItems', 'orderItems', 'wishlistItems', 'email', 'passwordHash', 'payments']) assert.equal(selection[privateField], undefined);
});

test('arbitrary search/filter combinations bypass shared cache; suggestions never count', async () => {
  const h = serviceHarness();
  for (const filter of ['search=حد', 'category=pots', 'brand=x', 'minPrice=0', 'availability=in-stock', 'slug=one']) await h.service.loadProductListing(params(filter));
  assert.equal(h.entries.size, 0);
  assert.equal(h.calls.filter(([op]) => op === 'count').length, 6);
  h.calls.length = 0;
  await h.service.loadProductSuggestions(params('search=garden&limit=100'));
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0][1].take, 6);
  assert.equal(h.calls[0][1].select.basePrice, undefined);
});

test('hard count age ceiling rejects stale-while-revalidate snapshots, including failed background refreshes', async () => {
  const h = serviceHarness();
  assert.equal((await h.service.loadProductListing(params(''))).total, 10);
  h.change(); h.advance();
  // Our fake cache deliberately keeps returning the old entry forever.
  assert.equal((await h.service.loadProductListing(params(''))).total, 11);
  assert.equal(h.calls.filter(([op]) => op === 'count').length, 2);
});

test('successful category mutations invalidate shared counts; failed or unauthorized mutations do not', async () => {
  for (const scenario of ['success', 'unauthorized', 'database-error']) {
    const h = serviceHarness();
    await h.service.loadProductListing(params(''));
    const actions = evaluate('src/app/admin/actions/category-actions.ts', {
      '@/lib/admin-validation': { validate: async (_schema, value) => value },
      '@/lib/validation': {}, '@/lib/auth': { assertAdmin: async () => { if (scenario === 'unauthorized') throw new Error('Unauthorized'); } },
      '@/lib/admin-prisma': { prisma: { category: { create: async () => { if (scenario === 'database-error') throw new Error('db'); } } } },
      'next/cache': h.nextCache,
    });
    h.change();
    const invoke = () => actions.createCategory({ nameAr: 'قسم', nameEn: 'Category', slug: 'category' });
    if (scenario === 'success') await invoke(); else await assert.rejects(invoke);
    assert.equal((await h.service.loadProductListing(params(''))).total, scenario === 'success' ? 11 : 10);
  }
});

test('products API never caches mutable JSON at browser/CDN and retains rate limiting', async () => {
  for (const value of ['', 'search=garden', 'view=suggestions&search=حد']) {
    assert.equal((await route().get(value)).headers['Cache-Control'], 'no-store');
  }
  assert.equal((await route().get(`search=${'a'.repeat(121)}`)).status, 400);
  const denied = route(false);
  assert.equal((await denied.get('')).status, 429);
  assert.equal(denied.calls.length, 0);
});

test('pool defaults are bounded and existing URLs/settings remain authoritative', () => {
  const { pooledDatabaseUrl } = evaluate('src/lib/prisma-config.ts', {});
  const env = { DATABASE_URL: 'postgresql://test:dummy@localhost/test?schema=public' };
  assert.equal(new URL(pooledDatabaseUrl(env)).searchParams.get('connection_limit'), '3');
  assert.equal(new URL(env.DATABASE_URL).searchParams.has('connection_limit'), false);
  assert.equal(new URL(pooledDatabaseUrl({ ...env, PRISMA_CONNECTION_LIMIT: '1' })).searchParams.get('connection_limit'), '1');
  assert.equal(new URL(pooledDatabaseUrl({ DATABASE_URL: `${env.DATABASE_URL}&connection_limit=2`, PRISMA_CONNECTION_LIMIT: '3' })).searchParams.get('connection_limit'), '2');
  for (const value of ['0', '-1', '21', 'abc']) assert.throws(() => pooledDatabaseUrl({ ...env, PRISMA_CONNECTION_LIMIT: value }), /PRISMA_CONNECTION_LIMIT/);
  assert.equal(pooledDatabaseUrl({}), undefined);
});

test('shop starts queries inside Suspense and preserves server product props, fixed pagination and SEO', async () => {
  let calls = 0;
  let received;
  const react = { Suspense: 'suspense', createElement: (type, props, ...children) => ({ type, props, children }) };
  const shop = evaluate('src/app/shop/page.tsx', {
    react, '@/lib/product-service': { loadProductListing: async (input, limit) => { calls++; received = { input, limit }; return { products: [{ id: 'public' }] }; } },
    './ShopContent': 'shop-content',
    '@/components/layout/RouteLoading': 'route-loading',
    '@/lib/storefront': { getSiteSettings: async () => ({}), getPageContent: async () => null, getFilterOptions: async () => ({ categories: [] }) },
    '@/lib/seo': { bilingualMetadata: value => value },
  }, undefined, { URLSearchParams });
  const shell = shop.default({ searchParams: { search: 'حديقة', brand: 'b' } });
  assert.equal(shell.type, 'suspense');
  assert.equal(shell.props.fallback.type, 'route-loading');
  assert.equal(calls, 0);
  const serverChild = shell.children[0];
  const loaded = await serverChild.type(serverChild.props);
  assert.equal(calls, 1);
  assert.equal(received.input.get('search'), 'حديقة');
  assert.equal(received.limit, 30);
  assert.equal(loaded.props.initialData.products[0].id, 'public');
  assert.equal((await shop.generateMetadata()).path, '/shop');
});

test('homepage prices remain live and category metadata uses one bounded tagged entry with an age ceiling', async () => {
  let price = 10;
  let title = 'old';
  let clock = 0;
  let categoryReads = 0;
  const entries = new Map();
  const tags = [];
  const store = evaluate('src/lib/storefront.ts', {
    './catalog-taxonomy': {}, react: { cache: fn => fn },
    'next/cache': { unstable_cache: (fn, key, options) => async () => {
      const id = JSON.stringify(key);
      if (!entries.has(id)) { tags.push(options.tags); entries.set(id, await fn()); }
      return entries.get(id);
    } },
    './prisma': { prisma: {
      product: { findMany: async () => [{ id: 'p', basePrice: price, images: [] }] },
      category: { findMany: async () => { categoryReads++; return [{ id: 'c', metaTitleEn: title }]; } },
    } },
    fs: { existsSync: () => false }, path: { join: (...parts) => parts.join('/') },
  }, undefined, { Date: class extends Date { static now() { return clock; } } });
  assert.equal((await store.getHomepageProducts()).latest[0].basePrice, 10);
  price = 25;
  assert.equal((await store.getHomepageProducts()).latest[0].basePrice, 25);
  assert.equal(entries.size, 0);
  assert.equal((await store.getCategoryMetadata('c')).metaTitleEn, 'old');
  for (let i = 0; i < 20; i++) assert.equal(await store.getCategoryMetadata(`unknown-${i}`), null);
  assert.equal(entries.size, 1);
  assert.equal(categoryReads, 1);
  assert.equal(tags[0][0], 'categories');
  title = 'new'; clock = 300_000;
  assert.equal((await store.getCategoryMetadata('c')).metaTitleEn, 'new');
  assert.equal(categoryReads, 2);
});
