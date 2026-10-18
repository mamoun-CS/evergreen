import nextEnv from '@next/env';
import { PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'node:fs';
nextEnv.loadEnvConfig(process.cwd());
const url = new URL(process.env.DATABASE_URL);
if (!['localhost','127.0.0.1','[::1]'].includes(url.hostname)) throw new Error('Local database required');
url.searchParams.set('connection_limit','1');
const db = new PrismaClient({datasources:{db:{url:url.toString()}}});
try {
  const result = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const table = await tx.$queryRawUnsafe("SELECT to_regclass('public._prisma_migrations')::text AS migration_table");
    const history = table[0].migration_table ? await tx.$queryRawUnsafe('SELECT migration_name, checksum, finished_at, rolled_back_at, applied_steps_count FROM _prisma_migrations ORDER BY started_at') : [];
    const capacity = await tx.$queryRawUnsafe("SELECT current_setting('max_connections') AS maximum,current_setting('superuser_reserved_connections') AS reserved,count(*) FILTER(WHERE state='active')::int AS active,count(*) FILTER(WHERE state='idle')::int AS idle,count(*) FILTER(WHERE state='idle in transaction')::int AS idle_in_transaction FROM pg_stat_activity");
    const permissions = await tx.$queryRawUnsafe('SELECT rolcreatedb,rolsuper FROM pg_roles WHERE rolname=current_user');
    const extension = await tx.$queryRawUnsafe("SELECT name,installed_version FROM pg_available_extensions WHERE name='pg_trgm'");
    return { history, capacity, permissions, extension };
  });
  mkdirSync('artifacts/performance-phase25',{recursive:true});
  writeFileSync('artifacts/performance-phase25/database-status.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
} finally { await db.$disconnect(); }
