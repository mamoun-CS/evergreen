import { PrismaClient } from '@prisma/client';
import { applyCatalogCategories } from '../prisma/catalog-categories';

const prisma = new PrismaClient();
applyCatalogCategories(prisma)
  .then(() => console.log('Applied approved category hierarchy, including General.'))
  .catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());

