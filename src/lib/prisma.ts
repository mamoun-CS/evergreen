import { PrismaClient } from '@prisma/client';
import { pooledDatabaseUrl } from './prisma-config';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = pooledDatabaseUrl({ DATABASE_URL: process.env.DATABASE_URL, PRISMA_CONNECTION_LIMIT: process.env.PRISMA_CONNECTION_LIMIT });
export const prisma = globalForPrisma.prisma ?? new PrismaClient(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined);

// One client per Node process, including production workers. Next's dev
// reloader would otherwise open a new pool on every file change.
globalForPrisma.prisma = prisma;
