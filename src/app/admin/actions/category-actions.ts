'use server';
import { validate } from '@/lib/admin-validation';

import { IdSchema, CategoryFormSchema } from '@/lib/validation';
import { assertAdmin } from '@/lib/auth';
import { prisma } from '@/lib/admin-prisma';
import { revalidatePath } from 'next/cache';

export async function createCategory(data: { nameEn: string; nameAr: string; slug: string; parentId?: string }) {
  await assertAdmin();
  data = await validate(CategoryFormSchema, data);
  await prisma.category.create({
    data: {
      nameEn: data.nameEn,
      nameAr: data.nameAr,
      slug: data.slug,
      parentId: data.parentId || null,
    },
  });
  revalidatePath('/admin/categories');
}

export async function updateCategory(id: string, data: { nameEn: string; nameAr: string; slug: string; parentId?: string }) {
  await assertAdmin();
  data = await validate(CategoryFormSchema, data);
  await validate(IdSchema, id);
  if (data.parentId === id) throw new Error('Cannot set category as its own parent');
  
  await prisma.category.update({
    where: { id },
    data: {
      nameEn: data.nameEn,
      nameAr: data.nameAr,
      slug: data.slug,
      parentId: data.parentId || null,
    },
  });
  revalidatePath('/admin/categories');
}

export async function deleteCategory(id: string) {
  await assertAdmin();
  await validate(IdSchema, id);
  const children = await prisma.category.findMany({ where: { parentId: id } });
  if (children.length > 0) throw new Error('Cannot delete a category with subcategories');
  
  await prisma.category.delete({
    where: { id },
  });
  revalidatePath('/admin/categories');
}
