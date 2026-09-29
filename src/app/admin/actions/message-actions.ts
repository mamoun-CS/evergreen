'use server';
import { validate } from '@/lib/admin-validation';

import { IdSchema } from '@/lib/validation';
import { assertAdmin } from '@/lib/auth';
import { prisma } from '@/lib/admin-prisma';
import { revalidatePath } from 'next/cache';

export async function updateMessageStatus(id: string, status: string) {
  await assertAdmin();
  await validate(IdSchema, id);
  if (!['NEW','READ','RESOLVED','ARCHIVED'].includes(status)) throw new Error('Invalid status');
  await prisma.contactInquiry.update({
    where: { id },
    data: { status },
  });
  revalidatePath('/admin/messages');
}

export async function deleteMessage(id: string) {
  await assertAdmin();
  await validate(IdSchema, id);
  await prisma.contactInquiry.delete({
    where: { id },
  });
  revalidatePath('/admin/messages');
}
