import { mkdirSync, writeFileSync } from 'node:fs';
import { catalogCategories } from '../src/lib/catalog-taxonomy';
import { legacyCategoryTargets } from '../prisma/catalog-categories';

const quote = (value: string) => "'" + value.replace(/'/g, "''") + "'";
const sql = ['-- Owner-approved provisional taxonomy; preserve legacy links and all products.', 'BEGIN;'];
for (const c of catalogCategories) {
  sql.push(`INSERT INTO "Category" ("id", "slug", "nameAr", "nameEn") VALUES (${[ 'approved-' + c.slug, c.slug, c.nameAr, c.nameEn ].map(quote).join(', ')}) ON CONFLICT ("slug") DO UPDATE SET "nameAr" = EXCLUDED."nameAr", "nameEn" = EXCLUDED."nameEn";`);
}
for (const c of catalogCategories) {
  sql.push(`UPDATE "Category" SET "parentId" = ${c.parentSlug ? `(SELECT "id" FROM "Category" WHERE "slug" = ${quote(c.parentSlug)})` : 'NULL'} WHERE "slug" = ${quote(c.slug)};`);
}
for (const [alias, target] of Object.entries(legacyCategoryTargets)) {
  sql.push(`INSERT INTO "_ProductCategories" ("A", "B") SELECT target."id", links."B" FROM "Category" old JOIN "_ProductCategories" links ON links."A" = old."id" CROSS JOIN "Category" target WHERE old."slug" = ${quote(alias)} AND target."slug" = ${quote(target)} ON CONFLICT DO NOTHING;`);
  sql.push(`UPDATE "Category" SET "parentId" = (SELECT "id" FROM "Category" WHERE "slug" = ${quote(target)}) WHERE "slug" = ${quote(alias)};`);
}
sql.push('COMMIT;');
const directory = 'prisma/migrations/20261015130000_approved_catalog_taxonomy';
mkdirSync(directory, { recursive: true });
writeFileSync(`${directory}/migration.sql`, sql.join('\n') + '\n');
