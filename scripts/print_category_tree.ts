import * as fs from 'fs';

interface Cat {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  parentNameAr: string | null;
  parentNameEn: string | null;
  productsCount: number;
  childrenCount: number;
}

const cats: Cat[] = JSON.parse(fs.readFileSync('category_audit_output.json', 'utf8'));

const roots = cats.filter(c => !c.parentNameAr);

console.log('=== أقسام الموقع الرئيسية والفرعية ===\n');

for (const root of roots) {
  console.log(`[رئيسي] ${root.nameAr} / ${root.nameEn} (منتجات مباشرة: ${root.productsCount})`);
  const subs = cats.filter(c => c.parentNameAr === root.nameAr || c.parentNameEn === root.nameEn);
  for (const sub of subs) {
    console.log(`   └── ${sub.nameAr} / ${sub.nameEn} (${sub.productsCount} منتج) [slug: ${sub.slug}]`);
    const subSubs = cats.filter(c => c.parentNameAr === sub.nameAr && c.parentNameAr !== root.nameAr);
    for (const subSub of subSubs) {
      console.log(`         └── ${subSub.nameAr} / ${subSub.nameEn} (${subSub.productsCount} منتج)`);
    }
  }
  console.log('');
}
