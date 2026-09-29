'use server';
import { validate } from '@/lib/admin-validation';

import { IdSchema } from '@/lib/validation';
import { assertAdmin } from '@/lib/auth';
import { prisma } from '@/lib/admin-prisma';
import { revalidatePath } from 'next/cache';

export async function toggleCustomerStatus(id: string, isActive: boolean) {
  await assertAdmin();
  await validate(IdSchema, id);
  if (typeof isActive !== 'boolean') throw new Error('Invalid status');
  
  await prisma.user.update({
    where: { id },
    data: { isActive },
  });
  
  revalidatePath('/admin/customers');
  revalidatePath(`/admin/customers/${id}`);
}
