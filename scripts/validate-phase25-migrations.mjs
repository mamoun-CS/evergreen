import nextEnv from '@next/env';
import { PrismaClient, Prisma } from '@prisma/client';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
nextEnv.loadEnvConfig(process.cwd());
const original = new URL(process.env.DATABASE_URL);
if (!['localhost','127.0.0.1','[::1]'].includes(original.hostname) || !process.argv.includes('--disposable')) throw new Error('Explicit --disposable and local development database required');
original.searchParams.set('connection_limit','1');
const source = new PrismaClient({ datasources:{db:{url:original.toString()}} });
const databaseName = `evergreen_test_phase25_${crypto.randomBytes(6).toString('hex')}`;
if (!/^evergreen_test_phase25_[a-f0-9]{12}$/.test(databaseName)) throw new Error('Invalid disposable database name');
const targetUrl = new URL(original);
targetUrl.pathname = `/${databaseName}`;
const target = new PrismaClient({datasources:{db:{url:targetUrl.toString()}}});
const root = mkdtempSync(path.join(os.tmpdir(),'evergreen-phase25-migrations-'));
const migrationRoot = path.join(root,'migrations');
mkdirSync(migrationRoot);
cpSync('prisma/schema.prisma',path.join(root,'schema.prisma'));
cpSync('prisma/migrations/migration_lock.toml',path.join(migrationRoot,'migration_lock.toml'));
const searchMigration = '20261005133000_catalogue_search_indexes';
const migrations = readdirSync('prisma/migrations',{withFileTypes:true}).filter(entry=>entry.isDirectory()).map(entry=>entry.name).sort();
const output = { disposable: true, databaseName, stages: [], measurements: {} };
const dir = 'artifacts/performance-phase25'; mkdirSync(dir,{recursive:true});
const require = createRequire(import.meta.url);
let created = false;
function deploy(stage) {
  const run = spawnSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','deploy','--schema',path.join(root,'schema.prisma')],{env:{...process.env,DATABASE_URL:targetUrl.toString()},encoding:'utf8',windowsHide:true});
  writeFileSync(`${dir}/migration-${stage}.log`,(run.stdout||'')+(run.stderr||''));
  output.stages.push({stage,exit:run.status});
  return run.status===0;
}
const stats = values => {const a=[...values].sort((x,y)=>x-y);return{n:a.length,median:(a[14]+a[15])/2,p95:a[28]};};
async function measure() {
  const cases = { arabicShort: '%حد%', english: '%garden%', multiWord:'%garden decor%' };
  const results = {};
  for (const [label,term] of Object.entries(cases)) {
    const query = Prisma.sql`SELECT p.id FROM "Product" p WHERE p."nameEn" ILIKE ${term} OR p."nameAr" ILIKE ${term} OR p.sku ILIKE ${term} OR p."descriptionEn" ILIKE ${term} OR p."descriptionAr" ILIKE ${term} OR EXISTS (SELECT 1 FROM "_ProductCategories" pc JOIN "Category" c ON c.id=pc."A" WHERE pc."B"=p.id AND (c."nameEn" ILIKE ${term} OR c."nameAr" ILIKE ${term})) ORDER BY p."createdAt" DESC LIMIT 30`;
    for(let i=0;i<3;i++) await target.$queryRaw(query);
    const timings=[]; let ids;
    for(let i=0;i<30;i++){const start=performance.now();ids=await target.$queryRaw(query);timings.push(performance.now()-start);}
    const plan=await target.$queryRaw(Prisma.sql`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ${query}`);
    results[label]={...stats(timings),ids,plan:plan[0]['QUERY PLAN'][0]};
  }
  return results;
}
try {
  const fixtures = await source.$transaction(async tx=> {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const products = await tx.product.findMany({select:{id:true,nameEn:true,nameAr:true,slug:true,sku:true,descriptionEn:true,descriptionAr:true,images:true,createdAt:true,updatedAt:true}});
    const categories=await tx.category.findMany({select:{id:true,nameEn:true,nameAr:true,slug:true,parentId:true}});
    const links=await tx.$queryRaw`SELECT "A","B" FROM "_ProductCategories"`;
    return {products,categories,links};
  });
  output.dataset={products:fixtures.products.length,categories:fixtures.categories.length,links:fixtures.links.length};
  await source.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`); created=true;
  for(const name of migrations.filter(name=>name<searchMigration)) cpSync(path.join('prisma/migrations',name),path.join(migrationRoot,name),{recursive:true});
  if(!deploy('before-search')) { output.blocker='Original migration chain failed before reaching search migration; no force/resolve attempted'; }
  else {
    await target.$executeRaw`INSERT INTO "Category" (id,"nameEn","nameAr",slug) SELECT id,"nameEn","nameAr",slug FROM jsonb_to_recordset(${JSON.stringify(fixtures.categories)}::jsonb) AS c(id text,"nameEn" text,"nameAr" text,slug text)`;
    for(const category of fixtures.categories.filter(c=>c.parentId)) await target.$executeRaw`UPDATE "Category" SET "parentId"=${category.parentId} WHERE id=${category.id}`;
    await target.$executeRaw`INSERT INTO "Product" (id,"nameEn","nameAr",slug,sku,"descriptionEn","descriptionAr",images,"createdAt","updatedAt") SELECT id,"nameEn","nameAr",slug,sku,"descriptionEn","descriptionAr",images,"createdAt","updatedAt" FROM jsonb_to_recordset(${JSON.stringify(fixtures.products)}::jsonb) AS p(id text,"nameEn" text,"nameAr" text,slug text,sku text,"descriptionEn" text,"descriptionAr" text,images text[],"createdAt" timestamp,"updatedAt" timestamp)`;
    await target.$executeRaw`INSERT INTO "_ProductCategories" ("A","B") SELECT "A","B" FROM jsonb_to_recordset(${JSON.stringify(fixtures.links)}::jsonb) AS l("A" text,"B" text)`;
    output.measurements.before=await measure();
    cpSync(path.join('prisma/migrations',searchMigration),path.join(migrationRoot,searchMigration),{recursive:true});
    if(deploy('search')) {
      output.measurements.after=await measure();
      output.resultSetsEqual=Object.keys(output.measurements.before).every(key=>JSON.stringify(output.measurements.before[key].ids)===JSON.stringify(output.measurements.after[key].ids));
      output.indexes=await target.$queryRaw`SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname LIKE '%trgm%' ORDER BY indexname`;
      if(process.argv.includes('--integration')) {
        for(const name of migrations.filter(name=>name>searchMigration)) cpSync(path.join('prisma/migrations',name),path.join(migrationRoot,name),{recursive:true});
        if(deploy('remaining')) {
          const appRoot=mkdtempSync(path.join(os.tmpdir(),'evergreen-phase25-integration-'));
          for(const entry of ['src','prisma','data','package.json','package-lock.json','next.config.mjs','tsconfig.json','next-env.d.ts','tailwind.config.ts','postcss.config.js','.eslintrc.json']) cpSync(entry,path.join(appRoot,entry),{recursive:true});
          const {symlinkSync}=await import('node:fs');
          symlinkSync(path.resolve('node_modules'),path.join(appRoot,'node_modules'),'junction');
          symlinkSync(path.resolve('public'),path.join(appRoot,'public'),'junction');
          const integrationUrl = new URL(targetUrl);
          integrationUrl.searchParams.set('connection_limit','3');
          const run=spawnSync(process.execPath,[path.resolve('tests/integration.mjs')],{cwd:appRoot,env:{...process.env,DATABASE_URL:integrationUrl.toString(),ADMIN_SESSION_SECRET:'phase25-disposable-test-secret-only'},encoding:'utf8',windowsHide:true,timeout:300000});
          writeFileSync(`${dir}/integration.log`,(run.stdout||'')+(run.stderr||''));
          const {existsSync}=await import('node:fs');
          if(existsSync(path.join(appRoot,'artifacts/integration-server.log'))) cpSync(path.join(appRoot,'artifacts/integration-server.log'),`${dir}/integration-server.log`);
          output.integration={exit:run.status,timedOut:run.error?.code==='ETIMEDOUT',applicationPool:3,fixtureOnly:true,externalSMTP:false,realPayments:false};
        }
      }
    }
  }
} catch(error) { output.blocker=error.message; }
finally {
  await target.$disconnect();
  if(created) { await source.$executeRawUnsafe(`DROP DATABASE "${databaseName}"`); output.disposableDropped=true; }
  await source.$disconnect();
  writeFileSync(`${dir}/migration-validation.json`,JSON.stringify(output,null,2));
}
console.log(JSON.stringify({...output,measurements:Object.fromEntries(Object.entries(output.measurements).map(([stage,cases])=>[stage,Object.fromEntries(Object.entries(cases).map(([name,data])=>[name,{n:data.n,median:data.median,p95:data.p95}]))]))},null,2));
