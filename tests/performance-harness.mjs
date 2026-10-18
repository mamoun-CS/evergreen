import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the actual route and serializer with fail-closed dependency stubs.
// No environment, live Prisma client, database, or network access is used.
export function evaluate(file, dependencies, source, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(source ?? readFileSync(file, 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.React, esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, console, URL, RangeError, ...globals, process: { cwd: () => '.', env: {}, ...globals.process } }, { filename: file });
  return exports;
}
export function storefront(source) {
  return evaluate('src/lib/storefront.ts', {
    './catalog-taxonomy': {}, react: { cache: fn => fn },
    'next/cache': { unstable_cache: fn => fn }, './prisma': { prisma: {} },
    fs: { existsSync: () => false }, path: { join: (...parts) => parts.join('/') },
  }, source);
}
export function route(allowed = true, source) {
  const calls = [];
  const cards = storefront();
  const product = { id: 'p1', slug: 'test', sku: 'SKU', nameEn: 'Test', nameAr: 'اختبار', images: ['/test.jpg'] };
  const prisma = { product: {
    count: async args => { calls.push(['count', args]); return 10; },
    findMany: async args => { calls.push(['findMany', args]); return [product]; },
  } };
  const service = evaluate('src/lib/product-service.ts', {
    'server-only': {}, react: { cache: fn => fn }, 'next/cache': { unstable_cache: fn => fn },
    './prisma': { prisma }, './storefront': cards,
    './product-query': evaluate('src/lib/product-query.ts', {}),
  });
  const exports = evaluate('src/app/api/products/route.ts', {
    'next/server': { NextResponse: { json: (body, init = {}) => ({ body, ...init, status: init.status ?? 200 }) } },
    'next/cache': { unstable_cache: fn => fn },
    '@/lib/prisma': { prisma: { product: {
      count: async args => { calls.push(['count', args]); return 10; },
      findMany: async args => { calls.push(['findMany', args]); return [product]; },
    } } },
    '@/lib/auth-middleware': { getClientIp: () => 'test' },
    '@/lib/rate-limit': { consumeRateLimit: async () => ({ allowed }), rateLimitConfig: { browse: { maximum: 100, windowMs: 1000 } }, rateLimitResponseHeaders: () => ({}) },
    '@/lib/storefront': cards,
    '@/lib/product-service': service,
  }, source);
  return { get: query => exports.GET({ url: `http://local/api/products?${query}`, headers: {} }), calls };
}

