'use server';
import { validate } from '@/lib/admin-validation';

import { IdSchema, NavigationSchema } from '@/lib/validation';
import { assertAdmin } from '@/lib/auth';
import { prisma } from '@/lib/admin-prisma';
import { revalidatePath } from 'next/cache';

export async function createNavItem(data: any) {
  await assertAdmin();
  data = await validate(NavigationSchema, data);
  await prisma.navigationItem.create({ data });
  revalidatePath('/', 'layout');
}

export async function deleteNavItem(id: string) {
  await assertAdmin();
  await validate(IdSchema, id);
  await prisma.navigationItem.delete({ where: { id } });
  revalidatePath('/', 'layout');
}
