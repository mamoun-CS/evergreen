# Evergreen performance optimization report

Date: 2026-10-18 (Asia/Hebron)

## 1. الملخص التنفيذي

تم تنفيذ تحسينات فعلية في تحميل بيانات الواجهة، والبحث الفوري، وصفحات الأقسام، وحجم البيانات المرسلة، والصور، وتحميل السلة عند الحاجة. أصبح البحث الفوري ينفذ عملية قراءة منتجات واحدة بدلاً من عمليتين، مع الحفاظ على شروط البحث والترتيب وتحديد معدل الطلبات. وأُزيلت طلبات إضافية لتحميل خيارات التصفية والأقسام من المتصفح، وأُصلح إلغاء طلبات البحث القديمة.

نجح بناء الإنتاج وفحص TypeScript وجميع الاختبارات المستقلة عن قاعدة البيانات وعددها 111. ما زال أمر الاختبار الشامل يفشل في اختبار PostgreSQL بسبب مشكلة استيراد موجودة قبل التعديلات. لم تُطبّق أي تغييرات على قاعدة البيانات ولم يُنفّذ أي نشر. لم تُقَس مؤشرات LCP أو TTFB أو INP؛ لذلك لا تُنسب نسب تسريع فعلية لتجربة المستخدم إلى هذه التعديلات. يحتوي التقرير على القياسات المتاحة وحدودها بوضوح.

## 2. Scope and baseline

Inspected package scripts, Next configuration, root providers, middleware, Prisma schema/client, storefront queries, catalog/category/product routes, autocomplete, navigation, images, admin tables/actions, cart synchronization, checkout reads, and test infrastructure.

Existing useful optimizations were retained: Prisma process-wide reuse, selective card fields, 30-item shop pagination, 50-item admin order/product pagination, parallel counts/list reads, product metadata request memoization, tagged public content caches, local WebP derivatives, AVIF/WebP optimization, and product-detail primary-image priority.

**Build safety:** `npm run build` invokes `scripts/prepare-build.mjs`, which runs `prisma migrate deploy`. All three production builds in this task used `npx next build` directly, bypassing migration preparation. No migration, database mutation command, seed, import, image rewrite, production deployment, or integration workflow against the configured database was run. Existing public build-time content reads were allowed to run; this report does not infer their database target or timings.

## 3. Implemented changes

### Database and server execution

- Root layout starts six independent public content reads and the private current-user read together instead of awaiting them sequentially. Authentication remains request scoped.
- Autocomplete uses `view=suggestions` on the existing products endpoint. It requests at most six records, skips the unused product count, excludes price/stock/warranty/rating fields and the brand relation, and retains existing matching predicates and ordering. The normal listing response remains paginated and includes totals.
- Category metadata and body share request-memoized breadcrumb resolution using a primitive serialized path key. Legacy leaf/ID links and parent constraints remain intact.
- Category loading no longer fetches immediate-child product counts/previews that were immediately overwritten by descendant summaries. The hierarchy read now overlaps child/product reads.
- Customer administration selects displayed fields and order counts rather than entire user records, including password hashes.
- Inventory alert checks select only stock/availability and alert ID. Mutation order, thresholds, duplicate-alert checks, and stock behavior are unchanged.

### Payloads, frontend, and navigation

- Card serialization removes duplicate `productImages` records after deriving the displayed image. Detail client props also omit redundant image records; the complete derived gallery remains available.
- Shop receives cached filter options with server-rendered data, eliminating its separate `/api/equipment-finder/options` browser request and initial empty-filter render.
- Header desktop/mobile category menus consume the root categories already read by the layout instead of fetching `/api/categories` when opened.
- Autocomplete keeps its 250 ms debounce, aborts immediately on effect cleanup/unmount, and ignores late aborted responses. Search submission uses Next router navigation.
- The cart drawer uses a conditional dynamic import. Its code is requested when the cart opens, while cart state and business operations remain in the existing provider.
- Shop fetch errors now reach the existing error UI instead of being treated as successful empty JSON. Invalid numeric page input falls back to page 1.

### Images

- Product gallery thumbnails now declare `sizes="64px"`, matching their existing 64-pixel containers.
- Editorial banners and admin product thumbnails use lazy loading and asynchronous decoding; admin thumbnails specify their existing 40×40 dimensions.
- Existing URLs, quality settings, layout classes, gallery order, and primary-image priority are preserved. No image conversion or destructive asset processing was performed.

## 4. Caching and invalidation

- Added only request-level category trail memoization. It has no persistent TTL or cross-user data sharing and requires no invalidation.
- Existing cross-request cache durations remain unchanged: settings/navigation/filter options 300 seconds; homepage products 120 seconds; browse listing data 60 seconds. Existing public cache tags remain in use.
- Brand and application create/update/delete actions now invalidate `products` after successful authorized mutations. This refreshes existing filter options and affected public product/homepage caches. Failed or unauthorized mutations do not invalidate data.
- Existing product actions invalidate `products` and `categories`; category actions invalidate `categories`. No personalized cart, authentication, checkout, or admin response was added to a shared cache.
- Suggestions remain `Cache-Control: no-store` and retain rate limiting and maximum search length validation.
- Existing browse API CDN headers were not changed. Their independent edge freshness window can outlast application tag invalidation; verify immediately visible stock/prices through authoritative checkout validation and review CDN policy separately.
- Header categories now follow the existing layout snapshot and tagged data cache; an already-open browser layout can retain its snapshot until refresh/navigation refresh. This is a tradeoff of removing repeated menu fetches.

## 5. Database index preparation

Prepared `docs/performance/index-candidates.sql`, deliberately outside `prisma/migrations` because this repository applies migrations during its standard build preparation.

Candidates match inspected reads: `ProductVariant(productId)`, `Specification(productId)`, `OrderItem(orderId)`, and `InventoryAuditLog(createdAt)`. Existing product indexes already cover several common price, availability, brand, and timestamp filters. No speculative multi-column or broad trigram index set was introduced.

**None of these candidates was applied or validated with EXPLAIN.** Inspect actual installed indexes and benchmark representative plans in an isolated test database before accepting them. Concurrent index creation must run outside a transaction. Approved production indexing requires separate deployment review and matching Prisma migration/schema reconciliation.

## 6. Before/after measurements

Evidence is in `artifacts/performance/`.

| Measurement | Baseline | Final | Interpretation |
| --- | --- | --- | --- |
| Local production build wall time | 100.24 s | 45.36 s | Later builds use warm filesystem/compiler caches; not a controlled speedup claim |
| Listed routes | 113 | 113 | No route added |
| Dynamic / static route counts | 108 / 5 | 108 / 5 | Rendering modes preserved |
| Home route size / first-load JS | 5.20 / 114 kB | 5.22 / 114 kB | Rounded first-load total unchanged |
| Shop route size / first-load JS | 8.32 / 120 kB | 14.7 / 120 kB | Chunk allocation changed; rounded first-load total unchanged |
| Category route size / first-load JS | 2.49 / 115 kB | 2.72 / 115 kB | Rounded first-load total unchanged |
| Product route size / first-load JS | 8.14 / 125 kB | 8.38 / 125 kB | Rounded first-load total unchanged |
| Shared first-load JS | 87.3 kB | 87.3 kB | No overall bundle reduction demonstrated |
| Autocomplete product delegate operations | 2 | 1 | Actual route executed with stubbed dependencies; rate-limit work excluded |
| Autocomplete selected top-level fields | 18 | 7 | Same matching/order; excludes brand join |
| Raw card fixture JSON, four image records | 349 bytes | 116 bytes | Synthetic serializer fixture; same displayed image; not production/network bytes |
| Shop filter-options browser fetch | Present | Removed | Source-level request removal, not a browser network capture |
| Menu categories browser fetch | Present on menu use | Removed | Source-level request removal |
| Cart drawer code | Eager import | 5,136-byte separate JS chunk | Raw emitted chunk bytes; not gzip transfer size |

The intermediate optimized build took 42.92 seconds. Build logs are retained; timing differences are not attributable solely to code changes. Structural measurements are reproducible with `node scripts/measure-performance.mjs`, which compares actual code with the pinned baseline Git revision using synthetic fixtures. Prisma relation loading can generate additional SQL; delegate operation counts are not SQL statement counts.

**Not measured:** Lighthouse, LCP, CLS, FCP, INP, TTFB, actual API latency, SQL duration/count, browser request waterfalls, compressed JS transfer, and server memory. No real-user or controlled runtime speedup percentage is claimed.

## 7. Validation and results

- Baseline and both optimized production builds: passed compilation, lint/type validation, static generation, and tracing.
- Explicit TypeScript validation: `npx tsc --noEmit --incremental false`, passed.
- Explicit `npm run lint`: passed with four existing warnings (raw admin/editorial images and a ProductReviews effect dependency). Final build lint also passed with those warnings.
- Existing TypeScript tests: 14 passed.
- Database-independent JavaScript tests: 97 passed, including five new top-level performance tests. The cache invalidation test exercises both resources, all three mutations, and success/authorization/database-error scenarios.
- New tests execute real route/serializer/action/client-effect code with allowlisted stubs: search equivalence/order, suggestion bounds, validation/rate limiting, card image/price equivalence, immutability, immediate request cancellation, late-response suppression, and mutation invalidation sequencing.
- Full `npm test`: 111 passed and one pre-existing file-level failure. Baseline had 106 passed and that same failure. `tests/order-claim-postgresql.test.mjs` fails importing missing package `server-only` before database testing begins. No dependency workaround was installed.
- Docker availability check: installed CLI, unavailable Linux engine. An isolated database was not available for integration testing.
- `git diff --check`: passed. Generated `tsconfig.tsbuildinfo` changes were restored.

Existing unit/security tests cover portions of authentication, RBAC, order claiming, validation and security behavior. **End-to-end browsing, filtering, cart, checkout/payment/order creation, inventory updates, admin workflows, hydration, visual equivalence, SEO output, and broken images were not browser-verified in this run.** These require the isolated runtime regression pass before release. Metadata builders, canonical paths, structured-data construction, middleware, authorization checks and checkout transaction logic were retained, but source preservation is not a substitute for that runtime pass.

## 8. Remaining bottlenecks and next improvements

1. Restore isolated PostgreSQL/Docker testing and repair the PostgreSQL test runner's `server-only` resolution; run the existing integration suite only after enforcing its isolated target. The general integration script loads `.env` and performs writes, so it was deliberately not invoked here.
2. Benchmark seeded production-mode home/shop/category/product/search scenarios with the same browser/device/network profile. Capture waterfall, image candidates, LCP/CLS/FCP and interaction traces; INP needs representative interaction/field measurement.
3. Run representative EXPLAIN plans before applying index candidates or introducing search indexes.
4. Category descendant summaries still perform count/preview reads per child. Replacing these with verified batched SQL is a remaining opportunity; no untested query rewrite was introduced without PostgreSQL verification.
5. Category product lists and some admin/customer lists remain unbounded. Pagination changes visible navigation and count semantics, so those require a separate behavior-preserving implementation with regression coverage.
6. Server-rendered and API shop search already differ: the API also matches category names. This pre-existing difference was preserved rather than silently changing search semantics.
7. Global layouts remain dynamic because of session reads and CSP nonces. Forcing static output would risk personalization/security. Public data retains its existing cache strategy.
8. The Google Fonts CSS import and some editorial/raw admin images remain. Self-hosting exact font assets and responsive editorial delivery need visual and CSP verification before changing them.
9. Conditional drawer loading adds a first-open chunk fetch. Verify behavior under slow/offline network conditions and consider intent preloading only if that interaction is measurably affected.
10. Monitor concurrent database pressure on cold caches after parallelizing reads. Concurrency reduces serial waits but does not reduce every query's work.

## 9. Deployment and cost considerations

No dependency upgrade, paid service, new API route, Redis deployment, or production deployment was introduced. The Next build route inventory is unchanged; an actual Vercel serverless-function count was not available because no Vercel deployment/package was produced. Route count is not equivalent to deployed function count.

Run the isolated critical-workflow/browser checks before release. Preserve versioned assets and inspect the existing build-time migration behavior before using `npm run build` in any environment. Index candidates are proposals only and will not execute through the current build script. Existing price/stock caching windows were not extended, and authoritative checkout/inventory logic was left unchanged.

## 10. Modified and added files

Application source:

- `src/app/layout.tsx`
- `src/app/api/products/route.ts`
- `src/app/category/[...path]/page.tsx`
- `src/app/products/[slug]/page.tsx`
- `src/app/products/[slug]/ProductDetailsClient.tsx`
- `src/app/shop/page.tsx`
- `src/app/shop/ShopContent.tsx`
- `src/app/admin/actions/brand-actions.ts`
- `src/app/admin/actions/application-actions.ts`
- `src/app/admin/customers/page.tsx`
- `src/app/admin/products/page.tsx`
- `src/components/cart/CartDrawerLoader.tsx` (new)
- `src/components/home/HomeView.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/CatalogMegaMenu.tsx`
- `src/components/layout/SearchAutocomplete.tsx`
- `src/lib/storefront.ts`
- `src/lib/inventory-management.ts`

Validation and documentation:

- `tests/performance.test.mjs` (new)
- `tests/performance-harness.mjs` (new)
- `scripts/measure-performance.mjs` (new)
- `docs/performance/index-candidates.sql` (new, unapplied)
- `EVERGREEN_PERFORMANCE_OPTIMIZATION_REPORT.md` (this report)
- `artifacts/performance/baseline-ref.txt`
- `artifacts/performance/baseline-build.log`
- `artifacts/performance/baseline-tests.log`
- `artifacts/performance/optimized-build.log`
- `artifacts/performance/optimized-tests.log`
- `artifacts/performance/final-build.log`
- `artifacts/performance/final-tests.log`
- `artifacts/performance/unit-tests.log`
- `artifacts/performance/typescript.log`
- `artifacts/performance/final-typescript.log`
- `artifacts/performance/lint.log`
- `artifacts/performance/build-measurements.json`
- `artifacts/performance/structural-measurements.json`
- `artifacts/performance/structural-measurements.log`
