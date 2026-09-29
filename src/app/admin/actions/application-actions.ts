'use server';
import { validate } from '@/lib/admin-validation';

import { IdSchema, ApplicationFormSchema } from '@/lib/validation';
import { assertAdmin } from '@/lib/auth';
import { prisma } from '@/lib/admin-prisma';
import { revalidatePath } from 'next/cache';

export async function createApplication(data: { nameEn: string; nameAr: string; slug: string }) {
  await assertAdmin();
  data = await validate(ApplicationFormSchema, data);
  await prisma.application.create({
    data,
  });
  revalidatePath('/admin/applications');
}

export async function updateApplication(id: string, data: { nameEn: string; nameAr: string; slug: string }) {
  await assertAdmin();
  data = await validate(ApplicationFormSchema, data);
  await validate(IdSchema, id);
  await prisma.application.update({
    where: { id },
    data,
  });
  revalidatePath('/admin/applications');
}

export async function deleteApplication(id: string) {
  await assertAdmin();
  await validate(IdSchema, id);
  await prisma.application.delete({
    where: { id },
  });
  revalidatePath('/admin/applications');
}
