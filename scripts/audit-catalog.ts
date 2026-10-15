import { PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'node:fs';
const db = new PrismaClient();
async function main() {
 const [categories, products] = await Promise.all([db.category.findMany({include:{_count:{select:{products:true}}}}),db.product.findMany({select:{id:true,nameAr:true,nameEn:true,slug:true,categories:{select:{id:true,slug:true}},sourceUrl:true}})]);
 const byId = new Map(categories.map(c => [c.id,c]));
 const cycles: string[][] = [];
 for (const category of categories) { const visited: string[] = []; let current: typeof category | undefined = category; while (current) { if (visited.includes(current.id)) {cycles.push(visited); break;} visited.push(current.id); current = current.parentId ? byId.get(current.parentId) : undefined; } }
 const report = {generatedAt:new Date().toISOString(), totalProducts:products.length,totalCategories:categories.length,cycles,uncategorized:products.filter(p=>!p.categories.length),generalOnly:products.filter(p=>p.categories.length && p.categories.every(c=>['aam','itaytrade-import'].includes(c.slug))),categories:categories.map(c=>({id:c.id,nameAr:c.nameAr,slug:c.slug,parentId:c.parentId,directProducts:c._count.products}))};
 mkdirSync('artifacts/catalog',{recursive:true});writeFileSync('artifacts/catalog/catalog-audit.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({products:report.totalProducts,categories:report.totalCategories,cycles:cycles.length,uncategorized:report.uncategorized.length,generalOnly:report.generalOnly.length}));
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.$disconnect());
