import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// One client per Node process, including production workers. Next's dev
// reloader would otherwise open a new pool on every file change.
globalForPrisma.prisma = prisma;
