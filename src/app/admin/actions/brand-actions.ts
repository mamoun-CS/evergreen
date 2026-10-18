'use server';
import { validate } from '@/lib/admin-validation';

import { IdSchema, BrandFormSchema } from '@/lib/validation';
import { assertAdmin } from '@/lib/auth';
import { prisma } from '@/lib/admin-prisma';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function createBrand(data: { name: string; description?: string; logoUrl?: string }) {
  await assertAdmin();
  data = await validate(BrandFormSchema, data);
  await prisma.brand.create({
    data,
  });
  revalidatePath('/admin/brands');
  revalidateTag('products');
}

export async function updateBrand(id: string, data: { name: string; description?: string; logoUrl?: string }) {
  await assertAdmin();
  data = await validate(BrandFormSchema, data);
  await validate(IdSchema, id);
  await prisma.brand.update({
    where: { id },
    data,
  });
  revalidatePath('/admin/brands');
  revalidateTag('products');
}

export async function deleteBrand(id: string) {
  await assertAdmin();
  await validate(IdSchema, id);
  const products = await prisma.product.count({ where: { brandId: id } });
  if (products > 0) throw new Error('Cannot delete a brand with assigned products');
  
  await prisma.brand.delete({
    where: { id },
  });
  revalidatePath('/admin/brands');
  revalidateTag('products');
}
