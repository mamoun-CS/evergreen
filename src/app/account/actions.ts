'use server';

import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateProfile(data: { name?: unknown; phone?: unknown; language?: unknown }) {
  const user = await requireUser();
  if (!user) throw new Error('Unauthorized');
  if (data.language !== undefined && !['ar', 'en'].includes(String(data.language))) throw new Error('Invalid language');
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
  if (!name || name.length > 120 || phone.length > 40) throw new Error('Invalid profile details');

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      language: data.language as string | undefined,
      phone: phone || null,
    }
  });

  revalidatePath('/account/profile');
}
