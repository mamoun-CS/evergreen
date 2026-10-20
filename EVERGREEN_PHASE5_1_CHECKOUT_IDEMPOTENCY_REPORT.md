# تقرير المرحلة 5.1 — تنفيذ والتحقق من منع تكرار Checkout (Idempotency)

التاريخ: 2026-10-19 — Asia/Hebron
الحالة: **مكتملة ومحققة فعليًا — PHASE 5.1 COMPLETED**

---

## 1. ملخص التنفيذ التنفيذي

تم استكمال المرحلة 5.1 بالكامل وربط حماية عدم التكرار (Idempotency) على مستوى قاعدة البيانات PostgreSQL ونواة المعاملات الذرية ومسارات API وواجهة المستخدم، والتحقق منها عبر عنقود PostgreSQL 18 حقيقي معزول ومستهلك بالكامل (Disposable Cluster على المنفذ 5433).

أثبتت الفحوصات الفعلية (وليس مجرد وحدات برمجية معزولة):
- منع إنشاء أكثر من طلب واحد عند إرسال 10 طلبات متزامنة في الوقت نفسه (`P2002 / Unique Violation`).
- استعادة الطلب نفسه عند إعادة المحاولة بنفس المفتاح والبصمة دون أي آثار جانبية مضاعفة للمخزون أو الإشعارات.
- رفض أي طلب يحمل نفس المفتاح مع بيانات معدلة بكود تعارض `409 CHECKOUT_CONFLICT`.
- السماح بإنشاء طلب جديد مستقل عند الشراء المتعمد بمفتاح جديد حتى مع تطابق السلة تماماً.
- عزل كامل للملكية بين حسابات المستخدمين المسجلين والزوار عبر تجزئة `Checkout-Guest-Secret`.
- حماية مسار دفع Lahza من تكرار التهيئة ومنع إعادة المحاولة العمياء عند انقطاع الاتصال عبر حالة `UNKNOWN` ورد `202 PAYMENT_RECONCILIATION_PENDING`.
- صمود المفتاح في واجهة المتصفح عبر `sessionStorage` عند تحديث الصفحة أو انقطاع الشبكة أو النقر المزدوج، مع إمكانية بدء شراء جديد صريح بموافقة المستخدم.

---

## 2. التغييرات المنفذة في قاعدة البيانات (Migration & Schema)

### الملفات المضافة والمعدلة:
- `prisma/schema.prisma`: إضافة نموذج `CheckoutAttempt` وربطه بعلاقة واحد-لواحد اختيارية مع `Order`.
- `prisma/migrations/20261019120000_checkout_attempts/migration.sql`: إنشاء جدول محاولات الشراء مع القيود الفريدة وقيود التحقق.

```sql
CREATE TABLE "CheckoutAttempt" (
    "keyHash" TEXT NOT NULL,
    "ownerId" TEXT,
    "fingerprint" TEXT NOT NULL,
    "orderId" TEXT,
    "paymentInitState" TEXT NOT NULL,
    "authorizationUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CheckoutAttempt_pkey" PRIMARY KEY ("keyHash"),
    CONSTRAINT "CheckoutAttempt_orderId_key" UNIQUE ("orderId"),
    CONSTRAINT "CheckoutAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CheckoutAttempt_paymentInitState_check" CHECK ("paymentInitState" IN ('COD', 'INITIALIZING', 'READY', 'UNKNOWN'))
);
```

### التوافقية مع البيانات التاريخية:
- حقل `orderId` في `CheckoutAttempt` هو اختياري (`nullable`)، والعلاقة من جهة `Order` اختيارية تماماً، مما يضمن أن جميع الطلبات التاريخية السابقة تعمل دون أي حاجة لتعديل أو هجرة بيانات بأثر رجعي.

---

## 3. تصميم المعاملات والتحكم بالتزامن (Transaction Design)

تم تحديث الدالة الأساسية `createReservedOrder` في `src/lib/checkout-orders.ts`:
1. **تجزئة المفتاح والسر**: يتم تحويل `Idempotency-Key` و`Checkout-Guest-Secret` إلى تجزئات SHA-256 مشفرة (`keyHash`, `ownerId`) قبل التعامل مع قاعدة البيانات لضمان عدم تسريب المفاتيح الخام.
2. **بصمة الطلب المتعارف عليها (Canonical Fingerprint)**: يتم احتساب SHA-256 للمدخلات الموحدة بعد ترتيب السلة ودمج كميات المنتجات المتطابقة دون تضمين كلمة المرور أو السعر المتغير لحماية النزاهة.
3. **فحص مسبق سريع**: التحقق من وجود محاولة سابقة مكتملة؛ في حال وجودها وتطابق البصمة والمالك، يتم إرجاع الطلب الأصلي فوراً مع وسم `replayed: true`.
4. **معاملة بمستوى عزل Serializable**:
   - إدراج سجل في `CheckoutAttempt` أولاً داخل المعاملة.
   - إذا حدث تسابق متزامن، تفشل المعاملات المتنافسة فوراً بقيد فريد `P2002` على `keyHash`.
   - يقوم المعالج بالتقاط `P2002` و`P2034`، ويستعلم عن المحاولة الفائزة؛ إذا اكتملت يرجع نتيجة الفائز، وإلا يرد بـ `CHECKOUT_PENDING` (409) مع رأس `Retry-After: 2`.
   - تحديث المحاولة بالربط الذري مع `createdOrder.id` قبل الالتزام (`commit`).

---

## 4. تنفيذ الدفع عند الاستلام (COD)

- **التحقق من التكرار**: إعادة الإرسال بنفس المفتاح تعيد تفاصيل الطلب نفسه بحالة HTTP 200 دون إنشاء طلب جديد.
- **التزامن الفعلي**: عند إرسال 10 طلبات متزامنة معاً، تم تسجيل محاولة إدراج واحدة فائزة في PostgreSQL وتوليد طلب واحد فقط برقم فريد، بينما استجابت الطلبات الأخرى إما بـ 200 أو 409 دون إحداث أي خلل في البيانات.
- **سلامة المخزون**: لم يتأثر مخزون المنتجات نهائياً في مرحلة الطلب (لأنه يخضع لتأكيد المدير اليدوي لاحقاً كما تنص قواعد العمل).
- **منع تكرار الإشعارات**: يتم إرسال بريد التأكيد للعميل وبريد التنبيه للإدارة مرة واحدة فقط للعملية الفائزة؛ عمليات الإعادة لا تطلق أي رسائل بريد إضافية.

---

## 5. تنفيذ بوابة Lahza والدفع الإلكتروني

- **التهيئة الفريدة**: ينشئ مسار `src/app/api/payments/lahza/initialize/route.ts` سجل الدفع ومرجعه داخل المعاملة الذرية؛ العملية الفائزة وحدها تتصل بمزود الدفع الخارجي.
- **معالجة النتائج المجهولة (Unknown Provider Outcome)**: عند حدوث خطأ شبكة أو انقطاع أثناء استدعاء مزود Lahza، لا يتم تحرير حجز المخزون فوراً ولا يعاد استدعاء المزود بشكل أعمى؛ بل يتم حفظ الحالة `paymentInitState = 'UNKNOWN'`.
- **الاستجابة المعلقة**: الرد بكود HTTP 202 مع رمز الخطأ `PAYMENT_RECONCILIATION_PENDING` ورأس `Retry-After: 5` لمنع العميل من الدفع مرتين ولإتاحة المصالحة عبر الـ webhook أو الاستعلام الآمن.
- **حماية الـ Webhook وتطهير البيانات**:
  - تم الحفاظ على التحقق الصارم من توقيع HMAC ومقاومة هجمات التكرار (Replay Protection عبر `WebhookReceipt`).
  - تطهير استجابة البوابة المخزنة (`gatewayResponse`) بحيث يتم استبعاد المفاتيح الحساسة وتواريخ التخويل والبيانات غير المصرح بها عبر `src/lib/payment-gateway-snapshot.ts`.

---

## 6. دورة حياة المفتاح في الواجهة الأمامية (Frontend Lifecycle)

تم تحديث صفحة إتمام الطلب `src/app/checkout/page.tsx`:
1. **الاحتفاظ بالمفتاح**: توليد `Idempotency-Key` و`Checkout-Guest-Secret` (UUIDv4) وحفظهما في `sessionStorage` عند أول محاولة إرسال.
2. **صمود التحديث وانقطاع الاتصال**: في حال تحديث الصفحة أو انقطاع الشبكة أو فشل الاتصال، يتم استرجاع المفتاح نفسه من `sessionStorage` وإعادة إرساله في ترويسات الطلب.
3. **منع النقر المزدوج**: استخدام `submitting.current = true` لمنع إرسال طلبات متعددة من الواجهة أثناء معالجة الطلب الأول.
4. **زر الشراء الجديد**: إضافة خيار صريح ومحمي بتأكيد (`window.confirm`) يتيح للعميل إلغاء المحاولة السابقة وبدء عملية شراء جديدة إذا رغب في ذلك بعد التأكد من حالة طلبه.

---

## 7. حل مشكلة أخطاء TypeScript في مجلدات الأرشيف (Priority 7)

- **طبيعة المشكلة**: كانت ثلاثة أخطاء TypeScript تظهر بسبب ملفات بناء قديمة مؤرشفة تحت `artifacts/performance-phase3/build` و`artifacts/performance-phase4/build`.
- **الحل الأدنى والآمن**: تعديل `tsconfig.json` لإضافة مجلدي البناء المؤرشفين إلى مصفوفة `exclude`:
  ```json
  "exclude": ["node_modules", "artifacts/performance-phase3/build", "artifacts/performance-phase4/build"]
  ```
- **النتيجة**: نجح فحص `npx tsc --noEmit` بنتيجة 0 أخطاء دون المساس بأي من ملفات المصدر الحقيقية ودون حذف أي دليل أو أرشيف.

---

## 8. الأوامر ونتائج الفحص والتحقق الكامل (Exact Verification Results)

تم إجراء كافة الفحوصات على بيئة Windows مع قاعدة بيانات PostgreSQL 18.1 مستقلة ومخصصة للاختبار (منفذ 5433، اسم `evergreen_test`، مستخدم `evergreen_test`، ومجلد بيانات مخصص بالكامل في `scratch/pg_test_data`):

| فئة التحقق | الأمر المنفذ | النتيجة | التفاصيل والدليل |
|---|---|---|---|
| **Prisma Schema Validation** | `npx prisma validate` | **PASS** | `The schema at prisma\schema.prisma is valid` |
| **Disposable DB Migration** | `npx prisma migrate deploy` | **PASS** | تم تطبيق 26 migration بنجاح على قاعدة `127.0.0.1:5433` بما فيها `20261019120000_checkout_attempts` |
| **TypeScript Validation** | `npx tsc --noEmit` | **PASS** | 0 أخطاء (خروج بكود 0) بعد استبعاد مجلدات بناء الأرشيف فقط |
| **ESLint Checks** | `npm run lint` | **PASS** | تم الفحص بنجاح بدون أخطاء (تحذيرات صور وتنسيق غير مانعة فقط) |
| **Unit Tests Suite** | `npx tsx --test tests/*.test.ts` | **PASS** | 21 اختبارًا ناجحًا من أصل 21 (بصمة السلة، تطهير البوابة، قراءة الـ webhook، الصلاحيات) |
| **PostgreSQL Integration Tests** | `node --test tests/checkout-idempotency-postgresql.test.mjs` | **PASS** | التحقق من تفرد المحاولة في قاعدة البيانات، قفل المخزون، ورفض التنافس |
| **Core Database Test Suite** | `node --test tests/*.test.mjs` | **PASS** | 142 اختبارًا ناجحًا من أصل 142 (بما فيها تنافس المخزون وحماية مطالبات الطلبات) |
| **End-to-End Integration Suite** | `node tests/integration.mjs` | **PASS** | نجاح 15 سيناريو تكاملي: 10 طلبات COD متزامنة، عزل الزائر، Lahza معلقة، وتكرار الـ Webhook |
| **Playwright Persistent E2E** | `node tests/e2e/checkout-idempotency.cjs` | **PASS** | محاكاة انقطاع استجابة HTTP 201 بعد التزام القاعدة، تحديث المتصفح، واستعادة الطلب 200 بنجاح |
| **Isolated Next.js Production Build** | `npx next build` (مع قاعدة الاختبار المعزولة) | **PASS** | تم بناء وتوليد جميع الصفحات الـ 73 بنجاح دون أي خطأ |

---

## 9. مصفوفة السيناريوهات التفصيلية

| السيناريو | السلوك المتوقع | السلوك الفعلي المحقق | الحالة | الدليل الموثق |
|---|---|---|---|---|
| **إعادة متسلسلة** | استرجاع الطلب الأصلي | يعيد بيانات الطلب مع `replayed: true` وكود 200 | **PASS** | `tests/integration.mjs`, `tests/checkout-idempotency-postgresql.test.mjs` |
| **10 طلبات متزامنة** | إنشاء طلب واحد فقط | طلب واحد فقط برقم فريد، واعتراض المحاولات المتنافسة بقيد `CheckoutAttempt_pkey` | **PASS** | سجل قاعدة البيانات أظهر: `ERROR: duplicate key value violates unique constraint "CheckoutAttempt_pkey"` |
| **تغيير البيانات بنفس المفتاح** | رفض مع تعارض | رد فوري بـ HTTP 409 مع كود `CHECKOUT_CONFLICT` | **PASS** | فحص `tests/integration.mjs` وفحص المتصفح |
| **فقدان رد الشبكة** | استعادة الطلب عند الإعادة | استعادة الطلب برقم تعقبه الأصلي دون إنشاء سجل إضافي | **PASS** | اختبار المتصفح Playwright `tests/e2e/checkout-idempotency.cjs` |
| **مفاتيح مختلفة لنفس السلة** | السماح بشراء منفصل | إنشاء طلبات مستقلة بأرقام فريدة منفصلة | **PASS** | `tests/integration.mjs` (PASS new checkout key permits separate order) |
| **إتمام طلب COD** | حماية من التكرار وبقاء المخزون | طلب وحيد، عدم تكرار البريد، وعدم حجز المخزون حتى تأكيد الإدارة | **PASS** | `tests/integration.mjs` |
| **تهيئة Lahza** | تهيئة وحيدة وحفظ رابط الدفع | تهيئة جلسة واحدة لدى المزود واسترجاع رابط التفويض عند التكرار | **PASS** | `tests/integration.mjs` (`initializationCount === 1`) |
| **نتيجة مزود مجهولة** | عدم التكرار الأعمى وحالة معلقة | ضبط الحالة `UNKNOWN` ورد بـ 202 `PAYMENT_RECONCILIATION_PENDING` | **PASS** | `tests/integration.mjs` |
| **إعادة الـ Webhook** | معالجة الدفع مرة واحدة | استجابة 409 عند التكرار واحتفاظ الطلب بحالة `PROCESSING` | **PASS** | `tests/integration.mjs` (PASS webhook signature and replay protection) |
| **عزل ملكية الحسابات** | منع استرجاع طلبات الغير | رفض 409 عند اختلاف سر الزائر أو هوية المستخدم المسجل | **PASS** | `tests/integration.mjs` (PASS checkout guest and user ownership isolation) |

---

## 10. قرار الجاهزية للإنتاج والتوصيات (Production Readiness Decision)

### القرار: **GO FOR STAGING DEPLOYMENT / جاهز للنشر على بيئة الاختبار والتأهيل**

1. **اكتمال المتطلبات التقنية**: تم التحقق من الحماية على طبقات: قاعدة البيانات (Unique Constraints)، منطق الخدمة (Serializable Transactions)، واجهات API (HTTP 200/202/409)، وواجهة المستخدم (Session Storage & Double Click Guard).
2. **بروتوكول تطبيق الإنتاج (Production Rollout Rules)**:
   - يجب تطبيق المهاجرة `20261019120000_checkout_attempts` على قاعدة الإنتاج باستخدام `prisma migrate deploy` قبل نشر كود الواجهة والخادم الجديد.
   - لا يجوز استخدام `npm run build` العادي أثناء النشر إلا إذا تم تشغيله مع قاعدة بيانات مستهدفة وموثقة مسبقاً، تفادياً لتشغيل أوامر هجرة غير مقصودة.
   - المهاجرة إضافة بحتة ولا تمس أي جداول تاريخية أو بيانات قائمة، والتراجع البرمجي آمن دون الحاجة لإسقاط الجدول الجديد.
