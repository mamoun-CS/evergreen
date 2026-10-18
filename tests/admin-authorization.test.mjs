import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

// Execute the actual page actions and permission/validation/audit helpers.
// The allowlisted loader replaces auth, Prisma and Next request context before
// evaluation: no environment files, PrismaClient, database or network is used.
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const pages = {
  alert: 'src/app/admin/alerts/page.tsx',
  product: 'src/app/admin/content/seo/products/[id]/page.tsx',
  category: 'src/app/admin/content/seo/categories/[id]/page.tsx',
};
const allowed = new Set([...Object.values(pages), 'src/lib/auth-middleware.ts', 'src/lib/rbac.ts', 'src/lib/validation.ts', 'src/lib/admin-prisma.ts']);

function harness(kind, id = kind === 'category' ? 'category-1' : 'product-1', failAudit = false, transactionError) {
  let user = { id: 'staff-1', role: 'SUPER_ADMIN' };
  let writes = [];
  let audits = [];
  let transactionCalls = 0;
  const invalidations = [];
  let categories = [
    { id: 'category-1', nameAr: 'قسم', nameEn: 'Category', slug: 'category', parentId: null,
      imageUrl: '/old.jpg', metaTitleAr: 'عنوان سابق', metaTitleEn: 'Old title',
      metaDescAr: null, metaDescEn: 'Old description', ogImage: '/old-og.jpg', unrelatedPrivateField: 'excluded' },
    { id: 'child-1', nameAr: 'فرع', nameEn: 'Child', slug: 'child', parentId: 'category-1' },
    { id: 'grandchild-1', parentId: 'child-1' },
    { id: 'other-1', parentId: null },
  ];
  const product = { id: 'product-1', nameAr: 'منتج', nameEn: 'Product', slug: 'product', images: [] };
  const alert = { id, product: { ...product, stockQuantity: 1 }, currentStock: 1, threshold: 2, createdAt: new Date(), dismissedAt: null };
  const db = {
    category: {
      findUnique: async ({ where }) => ({ ...categories.find(c => c.id === where.id), children: [], parent: null }),
      findUniqueOrThrow: async ({ where }) => {
        const result = categories.find(c => c.id === where.id);
        if (!result) throw new Error('Not found');
        return { ...result };
      },
      findMany: async () => categories.map(c => ({ ...c })),
      update: async ({ where, data }) => {
        writes.push({ model: 'category', id: where.id, data });
        const result = { ...categories.find(c => c.id === where.id), ...data };
        categories = categories.map(c => c.id === where.id ? result : c);
        return result;
      },
      create: async ({ data }) => {
        writes.push({ model: 'category', data });
        const result = { id: 'created-1', ...data };
        categories.push(result);
        return result;
      },
    },
    product: {
      findUnique: async () => product,
      findFirst: async () => product,
      update: async ({ data }) => { writes.push({ model: 'product', data }); return { ...product, ...data }; },
    },
    adminAlert: {
      findMany: async () => [alert],
      findUniqueOrThrow: async () => alert,
      update: async ({ data }) => { writes.push({ model: 'alert', data }); return { ...alert, ...data }; },
    },
    adminAuditLog: { create: async ({ data }) => {
      if (failAudit) throw new Error('Audit unavailable');
      audits.push(data); return data;
    } },
    $transaction: async (callback, options) => {
      transactionCalls++;
      if (kind === 'category') assert.equal(options?.isolationLevel, 'Serializable');
      const snapshot = { writes: [...writes], audits: [...audits], categories: categories.map(c => ({ ...c })) };
      try {
        const result = await callback(db);
        if (transactionError) throw transactionError;
        return result;
      }
      catch (error) { writes = snapshot.writes; audits = snapshot.audits; categories = snapshot.categories; throw error; }
    },
    $extends: extension => ({ product: { update: args => extension.query.$allModels.$allOperations({
      model: 'Product', operation: 'update', args, query: () => { throw new Error('Unexpected unguarded query'); },
    }) } }),
  };
  const cache = new Map();
  function load(relative) {
    if (!allowed.has(relative)) throw new Error(`Module is not isolated: ${relative}`);
    if (cache.has(relative)) return cache.get(relative).exports;
    const module = { exports: {} };
    cache.set(relative, module);
    const filename = path.join(root, relative);
    const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText;
    function isolatedRequire(specifier) {
      if (specifier === 'next/cache') return { revalidateTag: tag => invalidations.push(tag) };
      if (specifier === 'server-only') return {};
      if (specifier === 'next/headers') return { headers: () => new Headers() };
      if (specifier === 'next/navigation') return { redirect: url => { throw new Error(`REDIRECT:${url}`); } };
      if (specifier === 'next/link') return { __esModule: true, default: 'a' };
      if (specifier === 'lucide-react') return { ChevronLeft: 'span' };
      if (specifier === '@/components/admin/ImageUploader') return { __esModule: true, default: 'input' };
      if (specifier === '@prisma/client') return { Prisma: { TransactionIsolationLevel: { Serializable: 'Serializable' } } };
      if (specifier === '@/lib/auth' || specifier === './auth') return { getCurrentUser: async () => user, requireAdmin: async () => user };
      if (specifier === '@/lib/prisma' || specifier === './prisma') return { prisma: db };
      if (specifier === 'zod' || specifier === 'react/jsx-runtime') return require(specifier);
      if (specifier.startsWith('@/lib/')) return load(`src/lib/${specifier.slice(6)}.ts`);
      if (specifier.startsWith('./')) return load(path.posix.join(path.posix.dirname(relative), `${specifier}.ts`));
      throw new Error(`Unexpected dependency: ${specifier}`);
    }
    vm.runInNewContext(compiled, {
      module, exports: module.exports, require: isolatedRequire,
      Buffer, Headers, console: { warn() {} }, process: { env: {} },
    }, { filename });
    return module.exports;
  }
  function forms(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(forms);
    return [...(node.type === 'form' ? [node.props.action] : []), ...forms(node.props?.children)];
  }
  return {
    render: async () => forms(await load(pages[kind]).default({ params: { id } }))[0],
    renderTree: searchParams => load(pages[kind]).default({ params: { id }, searchParams }),
    setRole: role => { user = role ? { id: 'staff-1', role } : null; },
    writes: () => writes, audits: () => audits,
    transactionCalls: () => transactionCalls,
    invalidations: () => invalidations,
  };
}

test('category: audit records all previous form fields, including nulls, and excludes unrelated data', async () => {
  const h = harness('category');
  const action = await h.render();
  await assert.rejects(() => action(form({ imageUrl: '', ogImage: '' })), /REDIRECT:/);
  assert.deepEqual(JSON.parse(JSON.stringify(h.audits()[0].oldData)), {
    nameAr: 'قسم', nameEn: 'Category', slug: 'category', parentId: null,
    imageUrl: '/old.jpg', metaTitleAr: 'عنوان سابق', metaTitleEn: 'Old title',
    metaDescAr: null, metaDescEn: 'Old description', ogImage: '/old-og.jpg',
  });
  assert.equal(h.audits()[0].newData.imageUrl, null);
  assert.equal(h.audits()[0].newData.ogImage, null);
  assert.deepEqual(h.invalidations(), ['categories', 'products']);
});

for (const id of ['category-1', 'new']) {
  test(`category ${id}: P2034 redirects to a visible retry message without replaying the transaction`, async () => {
    const h = harness('category', id, false, { code: 'P2034' });
    const action = await h.render();
    await assert.rejects(() => action(form()), error => error.message === `REDIRECT:/admin/content/seo/categories/${id}?error=transaction-conflict`);
    assert.equal(h.transactionCalls(), 1);
    assert.equal(h.writes().length, 0);
    assert.equal(h.audits().length, 0);
    assert.equal(h.invalidations().length, 0);
    const tree = await h.renderTree({ error: 'transaction-conflict' });
    assert.match(JSON.stringify(tree), /A concurrent update prevented saving/);
  });
}

test('category: other transaction errors propagate unchanged and are not retried', async () => {
  const failure = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
  const h = harness('category', 'category-1', false, failure);
  const action = await h.render();
  await assert.rejects(() => action(form()), error => error === failure);
  assert.equal(h.transactionCalls(), 1);
  assert.equal(h.writes().length, 0);
  assert.equal(h.audits().length, 0);
});

function form(changes = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ nameAr: 'قسم', nameEn: 'Category', slug: 'category', parentId: '', imageUrl: '', metaTitleAr: '', metaTitleEn: 'SEO title', metaDescAr: '', metaDescEn: 'Description', ogImage: '/images/example.jpg', ...changes })) data.set(key, value);
  return data;
}

for (const kind of Object.keys(pages)) {
  for (const role of [null, 'CUSTOMER', 'MANAGER', ...(kind === 'alert' ? [] : ['ADMIN'])]) {
    test(`${kind}: captured action denies ${role ?? 'unauthenticated'} before any mutation`, async () => {
      const h = harness(kind);
      const action = await h.render();
      assert.equal(typeof action, 'function');
      h.setRole(role);
      await assert.rejects(() => action(form()), /Forbidden/);
      assert.equal(h.writes().length, 0);
      assert.equal(h.audits().length, 0);
    });
  }
  test(`${kind}: SUPER_ADMIN succeeds and is audited`, async () => {
    const h = harness(kind);
    const action = await h.render();
    if (kind === 'alert') await action();
    else await assert.rejects(() => action(form()), /REDIRECT:\/admin\/content\/seo\//);
    assert.equal(h.writes().length, 1);
    assert.equal(h.audits().length, 1);
    assert.equal(h.audits()[0].userId, 'staff-1');
    if (kind !== 'alert') assert.equal(h.writes()[0].data.metaTitleEn, 'SEO title');
  });
}

for (const role of [null, 'CUSTOMER', 'MANAGER', 'ADMIN']) {
  test(`category creation: denies ${role ?? 'unauthenticated'} before mutation`, async () => {
    const h = harness('category', 'new');
    const action = await h.render();
    h.setRole(role);
    await assert.rejects(() => action(form()), /Forbidden/);
    assert.equal(h.writes().length, 0);
    assert.equal(h.audits().length, 0);
  });
}

for (const kind of Object.keys(pages)) {
  test(`${kind}: audit failure rolls back the mutation`, async () => {
    const h = harness(kind, undefined, true);
    const action = await h.render();
    await assert.rejects(() => action(form()), /Audit unavailable/);
    assert.equal(h.writes().length, 0);
    assert.equal(h.audits().length, 0);
  });
}

test('alert: invalid captured identifier is rejected', async () => {
  const h = harness('alert', 'x'.repeat(101));
  const action = await h.render();
  await assert.rejects(() => action(), /100/);
  assert.equal(h.writes().length, 0);
});

test('alert: ADMIN retains dismissal permission', async () => {
  const h = harness('alert');
  const action = await h.render();
  h.setRole('ADMIN');
  await action();
  assert.equal(h.writes().length, 1);
  assert.equal(h.audits().length, 1);
});

for (const parentId of ['category-1', 'child-1', 'grandchild-1', 'missing-parent']) {
  test(`category: rejects invalid hierarchy parent ${parentId}`, async () => {
    const h = harness('category');
    const action = await h.render();
    await assert.rejects(() => action(form({ parentId })), /circular|Parent category not found/);
    assert.equal(h.writes().length, 0);
  });
}

test('category: valid reparenting preserves SEO in the same audited write', async () => {
  const h = harness('category');
  const action = await h.render();
  await assert.rejects(() => action(form({ parentId: 'other-1' })), /REDIRECT:/);
  assert.equal(h.writes()[0].data.parentId, 'other-1');
  assert.equal(h.writes()[0].data.metaTitleEn, 'SEO title');
});

test('category: creation still saves base and SEO fields', async () => {
  const h = harness('category', 'new');
  const action = await h.render();
  await assert.rejects(() => action(form()), /REDIRECT:/);
  assert.equal(h.writes()[0].data.nameEn, 'Category');
  assert.equal(h.writes()[0].data.metaTitleEn, 'SEO title');
  assert.equal(h.audits()[0].action, 'create');
});

test('category: rejects a forged existing slug', async () => {
  const h = harness('category');
  const action = await h.render();
  await assert.rejects(() => action(form({ slug: 'changed' })), /Cannot change/);
  assert.equal(h.writes().length, 0);
});

for (const kind of ['product', 'category']) {
  for (const changes of [{ ogImage: 'javascript:alert(1)' }, { metaTitleEn: '<script>bad</script>' }, { metaDescEn: 'x'.repeat(321) }]) {
    test(`${kind}: rejects invalid SEO ${Object.keys(changes)[0]}`, async () => {
      const h = harness(kind);
      const action = await h.render();
      await assert.rejects(() => action(form(changes)), /ogImage|metaTitleEn|metaDescEn/);
      assert.equal(h.writes().length, 0);
    });
  }
  test(`${kind}: rejects an oversized identifier`, async () => {
    const h = harness(kind, 'x'.repeat(101));
    const action = await h.render();
    await assert.rejects(() => action(form()), /100/);
    assert.equal(h.writes().length, 0);
  });
}
