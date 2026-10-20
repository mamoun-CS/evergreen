import { PrismaClient } from '@prisma/client';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const prisma = new PrismaClient();
const execute = process.argv.includes('--execute');

// Order matters: identify the actual object before its decorative adjectives.
function classify(text: string): string | null {
  const rules: [RegExp, string][] = [
    [/birdbath|حوض طيور/i, 'garden-accessories'],
    [/قاتل.*(?:الآفات|الصرصور)|مبيد|pesticide|insecticide|تعريشة|trellis/i, 'gardening-supplies'],
    [/سلات|سلال|basket|straw/i, 'mntjat-alkhws-wjwz-alhnd'],
    [/شخصيات الحديقة|خنفساء.*نحلة.*تعليق/i, 'statues-ornaments'],
    [/Agrimix/i, 'khltat-alzra'],
    [/نافور|نوافير|شلال|\bfountain|waterfall/i, 'fountains-water-features'],
    [/تمثال|تماثيل|مجسم|\bstatue|sculpture|gnome/i, 'statues-ornaments'],
    [/عمود روم|أعمدة روم|roman column/i, 'alaamda-alrwmanya'],
    [/عشب صناعي|عشب اصطناعي|artificial grass|synthetic grass|\bturf\b/i, 'alashb-alsnaay'],
    [/جدار أخضر|الجدار الأخضر|green wall/i, 'aljdar-alakhdr'],
    [/صناعي|اصطناعي|artificial/i, 'nbatat-astnaaya'],
    [/خليط زراع|خلطات|تربة|بيرلايت|فيرميكوليت|compost|soil|perlite|vermiculite|planting mix/i, 'khltat-alzra'],
    [/شبك.*ظل|shade net/i, 'shbkat-alzl'],
    [/(?:سياج|سور|أسوار|fence).*?(?:بامبو|خيزران|bamboo)|(?:بامبو|خيزران|bamboo).*?fence/i, 'aswar-alkhyzran'],
    [/حصى|pebble/i, 'hsa-alnhr'],
    [/بلاط|deck tile/i, 'terrace-it'],
    [/خرطوم|رشاش|تنقيط|وصلة.*ري|hose|sprinkler|irrigation|dripper/i, 'irrigation-systems'],
    [/مقص|مجرفة|مشط|فأس|منتقي فواكه|prun|shear|shovel|rake|fruit picker|\baxe\b|\bspade\b/i, 'aladwat-almhnya'],
    [/عربة يد|wheelbarrow/i, 'arbat-alyd-walarbat'],
    [/إضاءة|مصباح|فانوس|فوانيس|شعلة شمسية|عصا شمسية|\blighting\b|\blamp\b|lantern|solar light/i, 'garden-lighting'],
    [/خوص|خيزران|جوز الهند|wicker|coconut|bamboo/i, 'mntjat-alkhws-wjwz-alhnd'],
    [/تيراكوتا|تراكوتا|terracotta/i, 'tyrakwta-aytalya'],
    [/\beda\b/i, 'awany-eda'],
    [/\bjapi\b|جابي|برازيلي/i, 'alqdwr-albrazylya'],
    [/كورتن|corten/i, 'awany-kwrtn'],
    [/مزجج|مزجّج|glazed/i, 'alawany-alzjajya'],
    [/فينتج|فينتاج|عتيق|vintage|antique/i, 'alawany-khmr'],
    [/بلاستيك|plastic/i, 'alawany-alblastykya'],
    [/وعاء|أوعية|أوعيه|أواني|قدور|أصيص|اصيص|حوض|أحواض|زارع|زهرية|مزهري|كأس|جرة|جرار|أباريق|اباريق|إبريق|سيراميك|\bpot\b|\bpots\b|planter|\bjar\b|\bbowl|saucer|\bvase|goblet|ceramic/i, 'planters'],
    [/ديكور|زينة|زخرف|decor|ornament/i, 'outdoor-decor'],
  ];
  return rules.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

async function main() {
  const [categories, products] = await Promise.all([
    prisma.category.findMany(),
    prisma.product.findMany({ include: { categories: { select: { id: true, slug: true } } } }),
  ]);
  const bySlug = new Map(categories.map(c => [c.slug, c]));
  const buckets = new Set(['aam', 'itaytrade-import']);
  const reviewPath = process.argv.find(arg => arg.startsWith('--review-report='))?.split('=').slice(1).join('=');
  const previous: { id: string; target: string }[] = reviewPath ? JSON.parse(readFileSync(reviewPath, 'utf8')).changes : [];
  const reviewed = new Map(previous.map(change => [change.id, change.target]));
  const changes = products.flatMap(product => {
    const priorTarget = reviewed.get(product.id);
    if (product.categories.some(c => !buckets.has(c.slug)) && !(priorTarget && product.categories.length === 1 && product.categories[0].slug === priorTarget)) return [];
    const target = classify(`${product.nameAr} ${product.nameEn}`);
    if (!target || !bySlug.has(target)) return [];
    if (product.categories.length === 1 && product.categories[0].slug === target) return [];
    return [{ id: product.id, nameAr: product.nameAr, target, oldCategoryIds: product.categories.map(c => c.id) }];
  });
  const report = { generatedAt: new Date().toISOString(), execute, changes, unresolved: products.filter(p => p.categories.every(c => buckets.has(c.slug)) && !changes.some(c => c.id === p.id)).map(p => ({ id: p.id, nameAr: p.nameAr, nameEn: p.nameEn })) };
  mkdirSync('artifacts/catalog', { recursive: true });
  const path = `artifacts/catalog/classification-${Date.now()}.json`;
  writeFileSync(path, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ report: path, changes: changes.length, unresolved: report.unresolved.length, counts: changes.reduce<Record<string, number>>((counts, c) => { counts[c.target] = (counts[c.target] || 0) + 1; return counts; }, {}) }, null, 2));
  if (execute) {
    for (let index = 0; index < changes.length; index += 100) {
      await prisma.$transaction(changes.slice(index, index + 100).map(change => prisma.product.update({ where: { id: change.id }, data: { categories: { set: [{ id: bySlug.get(change.target)!.id }] } } })));
    }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
