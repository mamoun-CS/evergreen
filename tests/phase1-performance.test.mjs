import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import { evaluate, storefront } from './performance-harness.mjs';

test('child summaries include nested descendants and deduplicate multi-category products', () => {
  const { summarizeChildren } = evaluate('src/lib/category-summaries.ts', {});
  const children = [{ id: 'a' }, { id: 'b' }, { id: 'empty' }];
  const hierarchy = [{ id: 'a', parentId: null }, { id: 'nested', parentId: 'a' }, { id: 'leaf', parentId: 'nested' }, { id: 'b', parentId: null }];
  const products = [
    { id: 'new', images: [], categories: [{ id: 'a' }, { id: 'leaf' }, { id: 'b' }] },
    { id: 'old', images: ['/old.jpg'], categories: [{ id: 'nested' }] },
  ];
  const result = summarizeChildren(children, hierarchy, products);
  assert.deepEqual(Array.from(result, child => child._count.products), [2, 1, 0]);
  // Newest product without an image must not fall back to an older product.
  assert.equal(result[0].products[0].images.length, 0);
  assert.equal(result[2].products.length, 0);
  assert.equal(summarizeChildren([], hierarchy, products).length, 0);
});

test('category pagination clamps invalid/out-of-range pages and covers stable ordered products exactly once', () => {
  const { categoryPage, CATEGORY_PAGE_SIZE } = evaluate('src/lib/category-pagination.ts', {});
  for (const value of [undefined, '', '0', '-1', '1.2', '2x', ['2'], '9007199254740992']) {
    assert.equal(categoryPage(value, 65).page, 1);
  }
  assert.equal(categoryPage('99', 65).page, 3);
  assert.equal(categoryPage('2', 0).page, 1);
  const ids = Array.from({ length: 65 }, (_, i) => i);
  const pages = ['1', '2', '3'].flatMap(value => {
    const { skip } = categoryPage(value, ids.length);
    return ids.slice(skip, skip + CATEGORY_PAGE_SIZE);
  });
  assert.deepEqual(pages, ids);
});

test('wishlist sync only posts missing unique IDs and skips refresh when already synchronized', async () => {
  const calls = [];
  let server = [{ product: { id: 'saved' } }];
  const { synchronizeWishlist } = evaluate('src/lib/wishlist-sync.ts', {}, undefined, {
    fetch: async (_url, options) => {
      calls.push(options.method || 'GET');
      if (options.method === 'POST') server = [{ product: { id: JSON.parse(options.body).productId } }, ...server];
      return { ok: true, status: 200, json: async () => ({ items: server }) };
    },
  });
  const signal = new AbortController().signal;
  const merged = await synchronizeWishlist(['saved', 'new', 'new'], signal);
  assert.deepEqual(calls, ['GET', 'POST', 'GET']);
  assert.deepEqual(Array.from(merged.ids), ['new', 'saved']);
  calls.length = 0;
  await synchronizeWishlist(['saved', 'new'], signal);
  assert.deepEqual(calls, ['GET']);
});

test('wishlist keeps failed additions for retry and does not refresh after rejected writes', async () => {
  const calls = [];
  const { synchronizeWishlist } = evaluate('src/lib/wishlist-sync.ts', {}, undefined, {
    fetch: async (_url, options) => {
      calls.push(options.method || 'GET');
      return options.method === 'POST' ? { ok: false, status: 429 } : { ok: true, json: async () => ({ items: [] }) };
    },
  });
  const result = await synchronizeWishlist(['pending'], new AbortController().signal);
  assert.deepEqual(Array.from(result.ids), ['pending']);
  assert.deepEqual(calls, ['GET', 'POST']);
});

test('wishlist rejects network failures and returns null for expired sessions without writing', async () => {
  let calls = 0;
  const { synchronizeWishlist } = evaluate('src/lib/wishlist-sync.ts', {}, undefined, {
    fetch: async () => { calls++; return { status: 401 }; },
  });
  assert.equal(await synchronizeWishlist(['local'], new AbortController().signal), null);
  assert.equal(calls, 1);
  const failing = evaluate('src/lib/wishlist-sync.ts', {}, undefined, { fetch: async () => { throw new Error('offline'); } });
  await assert.rejects(failing.synchronizeWishlist(['local'], new AbortController().signal), /offline/);
});

test('bounded image query preserves main-image ordering, fallback, and no-image behavior', () => {
  const { productCardSelect, serializeCard } = storefront();
  const selection = productCardSelect.productImages;
  assert.equal(selection.take, 1);
  assert.equal(JSON.stringify(selection.orderBy), JSON.stringify([{ isMain: 'desc' }, { sortOrder: 'asc' }]));
  const fixtures = [[], [{ path: '/only', isMain: false, sortOrder: 0 }], [
    { path: '/secondary', isMain: false, sortOrder: 0 },
    { path: '/main-later', isMain: true, sortOrder: 4 },
    { path: '/main-first', isMain: true, sortOrder: 1 },
  ]];
  for (const records of fixtures) {
    const ordered = records.slice().sort((a, b) => Number(b.isMain) - Number(a.isMain) || a.sortOrder - b.sortOrder);
    const original = serializeCard({ images: ['/fallback'], productImages: records });
    const bounded = serializeCard({ images: ['/fallback'], productImages: ordered.slice(0, selection.take) });
    assert.equal(JSON.stringify(bounded), JSON.stringify(original));
  }
  assert.equal(serializeCard({ images: [], productImages: [] }).images.length, 0);
});

test('user reads deduplicate per render, isolate requests, and revalidate changed cookies', async () => {
  let cookie;
  let reads = 0;
  let active = true;
  let requestCache = new Map();
  const auth = evaluate('src/lib/auth.ts', {
    'server-only': {}, 'node:crypto': crypto,
    react: { cache: fn => (...args) => {
      const key = JSON.stringify(args);
      if (!requestCache.has(key)) requestCache.set(key, fn(...args));
      return requestCache.get(key);
    } },
    'next/headers': { cookies: () => ({ get: () => cookie ? { value: cookie } : undefined }) },
    '@prisma/client': { Role: { ADMIN: 'ADMIN', SUPER_ADMIN: 'SUPER_ADMIN', MANAGER: 'MANAGER' } },
    './prisma': { prisma: { user: { findUnique: async ({ where }) => { reads++; return { id: where.id, role: 'CUSTOMER', isActive: active }; } } } },
  }, undefined, { Buffer, process: { env: { ADMIN_SESSION_SECRET: 'test-only-secret' } } });
  cookie = auth.createSessionCookieValue('customer', 'CUSTOMER');
  await Promise.all([auth.getCurrentUser(), auth.getCurrentUser()]);
  assert.equal(reads, 1);
  await assert.rejects(auth.assertAdmin(), /Unauthorized/);
  cookie = undefined;
  assert.equal(await auth.getCurrentUser(), null);
  cookie = 'invalid.signature';
  assert.equal(await auth.getCurrentUser(), null);
  const expired = Buffer.from(JSON.stringify({ userId: 'customer', role: 'CUSTOMER', expiresAt: 1 })).toString('base64url');
  cookie = `${expired}.${crypto.createHmac('sha256', 'test-only-secret').update(expired).digest('base64url')}`;
  assert.equal(await auth.getCurrentUser(), null);
  assert.equal(reads, 1);
  requestCache = new Map(); // Simulate a new React request dispatcher/cache.
  cookie = auth.createSessionCookieValue('customer', 'CUSTOMER');
  active = false;
  assert.equal(await auth.getCurrentUser(), null);
  assert.equal(reads, 2);
});

function wishlistProviderHarness(fetcher) {
  const slots = [];
  let cursor = 0;
  let authenticated = true;
  let effect;
  let stored = '["local"]';
  const react = {
    createContext: () => ({ Provider: 'provider' }),
    useState: initial => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], value => { slots[index] = value; }];
    },
    useRef: initial => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useCallback: fn => fn,
    useEffect: fn => { effect = fn; },
    createElement: (_type, props) => props.value,
  };
  const { synchronizeWishlist } = evaluate('src/lib/wishlist-sync.ts', {}, undefined, { fetch: fetcher });
  const { WishlistProvider } = evaluate('src/components/wishlist/WishlistContext.tsx', {
    react, '@/components/auth/AuthContext': { useAuth: () => authenticated },
    '@/lib/wishlist-sync': { synchronizeWishlist },
  }, undefined, {
    React: react, AbortController, fetch: fetcher,
    localStorage: { getItem: () => stored, setItem: (_key, value) => { stored = value; }, removeItem: () => { stored = '[]'; } },
  });
  return {
    render: () => { cursor = 0; return WishlistProvider({ children: null }); },
    mount: () => effect(), logout: () => { authenticated = false; },
    stored: () => JSON.parse(stored),
  };
}

test('wishlist provider shares concurrent synchronizations and persists merged IDs', async () => {
  let calls = 0;
  let finish;
  const harness = wishlistProviderHarness(() => {
    calls++;
    return new Promise(resolve => { finish = resolve; });
  });
  const provider = harness.render();
  const first = provider.sync();
  const second = provider.sync();
  assert.equal(first, second);
  assert.equal(calls, 1);
  finish({ ok: true, json: async () => ({ items: [{ product: { id: 'local' } }] }) });
  await first;
  assert.deepEqual(harness.stored(), ['local']);
  assert.equal(harness.render().authenticated, true);
});

test('wishlist logout cancels synchronization and ignores late server results', async () => {
  let finish;
  let signal;
  const harness = wishlistProviderHarness((_url, options) => {
    signal = options.signal;
    return new Promise(resolve => { finish = resolve; });
  });
  const provider = harness.render();
  const cleanup = harness.mount();
  const pending = provider.sync();
  cleanup();
  assert.equal(signal.aborted, true);
  harness.logout();
  harness.render();
  harness.mount();
  finish({ ok: true, json: async () => ({ items: [{ product: { id: 'remote' } }, { product: { id: 'local' } }] }) });
  await pending;
  const loggedOut = harness.render();
  assert.equal(loggedOut.authenticated, false);
  assert.equal(loggedOut.products.length, 0);
  assert.deepEqual(harness.stored(), ['local']);
});

test('category route uses bounded stable pagination and one batched summary read; SEO path stays unchanged', async () => {
  const calls = [];
  const summaries = evaluate('src/lib/category-summaries.ts', {});
  const pagination = evaluate('src/lib/category-pagination.ts', {});
  const node = { id: 'root', slug: 'root', nameAr: 'قسم', nameEn: 'Category', parentId: null };
  const category = evaluate('src/app/category/[...path]/page.tsx', {
    '@/lib/catalog-taxonomy': { categoryChildren: {}, orderCategories: items => items },
    react: { cache: fn => fn, createElement: (type, props) => ({ type, props }) },
    'next/navigation': { notFound: () => { throw new Error('404'); } },
    '@/lib/prisma': { prisma: {
      category: {
        findFirst: async () => node,
        findUnique: async () => ({}),
        findMany: async args => args.where ? [{ ...node, id: 'child', imageUrl: null }] : [{ id: 'child', parentId: 'root' }],
      },
      product: {
        count: async () => 65,
        findMany: async args => { calls.push(args); return []; },
      },
    } },
    '@/lib/seo': { bilingualMetadata: value => value },
    '@/lib/storefront': { getCategoryMetadata: async () => ({}), productCardSelect: {}, serializeCard: value => value, optimizeProductImagePath: value => value },
    '@/lib/category-summaries': summaries, '@/lib/category-pagination': pagination,
    './CategoryHierarchyPage': {},
  }, undefined, { React: { createElement: (type, props) => ({ type, props }) } });
  const output = await category.default({ params: { path: ['root'] }, searchParams: { page: '2' } });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].skip, 30);
  assert.equal(calls[0].take, 30);
  assert.equal(JSON.stringify(calls[0].orderBy), JSON.stringify([{ isFeatured: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }]));
  assert.equal(calls[1].select.categories.select.id, true);
  assert.equal(output.props.pagination.total, 65);
  assert.equal((await category.generateMetadata({ params: { path: ['root'] } })).path, '/category/root');
});

test('category pagination emits crawlable links and retains the full product total', () => {
  let lang = 'en';
  const react = { createElement: (type, props, ...children) => ({ type, props: props || {}, children }) };
  const { default: View } = evaluate('src/app/category/[...path]/CategoryHierarchyPage.tsx', {
    'next/image': {}, 'next/link': 'link',
    'lucide-react': {}, '@/components/product/ProductCard': {}, '@/components/layout/Breadcrumbs': {},
    '@/components/layout/LanguageContext': { useLanguage: () => ({ lang }) },
    '@/lib/catalog-taxonomy': { catalogCategories: [] },
  }, undefined, { React: react });
  const tree = View({ trail: [{ id: 'c', slug: 'garden', nameEn: 'Garden' }], subcategories: [], products: [{ id: 'p' }], pagination: { page: 2, totalPages: 3, total: 65 } });
  const links = [];
  const visit = node => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    if (node.props?.rel) links.push(node.props);
    node.children?.forEach(visit);
  };
  visit(tree);
  assert.equal(links.find(link => link.rel === 'prev').href, '/category/garden');
  assert.equal(links.find(link => link.rel === 'next').href, '/category/garden?page=3');
  assert.match(JSON.stringify(tree), /65 items available/);
  lang = 'ar';
  const arabic = View({ trail: [{ id: 'c', slug: 'garden', nameAr: 'حديقة' }], subcategories: [], products: [], pagination: { page: 2, totalPages: 3, total: 65 } });
  assert.match(JSON.stringify(arabic), /صفحة 2 من 3/);
  assert.match(JSON.stringify(arabic), /التالي/);
});
