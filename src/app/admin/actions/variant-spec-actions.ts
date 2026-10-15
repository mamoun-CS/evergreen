'use server';
import { validate } from '@/lib/admin-validation';

import { IdSchema, VariantSchema, SpecSchema } from '@/lib/validation';
import { assertAdmin } from '@/lib/auth';
import { prisma } from '@/lib/admin-prisma';
import { revalidatePath, revalidateTag } from 'next/cache';

export type VariantInput = {
  productId: string;
  titleEn: string;
  titleAr: string;
  sku?: string;
  price?: number;
  stock: number;
  options?: Record<string, any>;
};

export async function createVariant(data: VariantInput) {
  await assertAdmin();
  data = await validate(VariantSchema, data);
  await prisma.productVariant.create({ data: { ...data, sku: data.sku || null } });
  revalidatePath('/products', 'layout');
  revalidateTag('products');
  revalidatePath(`/admin/products/${data.productId}`);
}

export async function updateVariant(id: string, productId: string, data: Partial<VariantInput>) {
  await assertAdmin();
  data = await validate(VariantSchema.partial(), data);
  await validate(IdSchema, id);
  const { productId: ignoredProductId, ...changes } = data;
  await prisma.productVariant.update({ where: { id, productId }, data: {
    ...changes,
    ...(Object.hasOwn(changes, 'sku') ? { sku: changes.sku || null } : {}),
    ...(Object.hasOwn(changes, 'price') ? { price: changes.price ?? null } : {}),
  } });
  revalidatePath('/products', 'layout');
  revalidateTag('products');
  revalidatePath(`/admin/products/${productId}`);
}

export async function deleteVariant(id: string, productId: string) {
  await assertAdmin();
  await validate(IdSchema, id);
  await prisma.productVariant.delete({ where: { id, productId } });
  revalidatePath('/products', 'layout');
  revalidateTag('products');
  revalidatePath(`/admin/products/${productId}`);
}

export type SpecInput = {
  productId: string;
  keyEn: string;
  keyAr: string;
  valueEn: string;
  valueAr: string;
  groupEn?: string;
  groupAr?: string;
};

export async function createSpec(data: SpecInput) {
  await assertAdmin();
  data = await validate(SpecSchema, data);
  await prisma.specification.create({ data });
  revalidatePath('/products', 'layout');
  revalidateTag('products');
  revalidatePath(`/admin/products/${data.productId}`);
}

export async function deleteSpec(id: string, productId: string) {
  await assertAdmin();
  await validate(IdSchema, id);
  await prisma.specification.delete({ where: { id, productId } });
  revalidatePath('/products', 'layout');
  revalidateTag('products');
  revalidatePath(`/admin/products/${productId}`);
}

export async function updateSpec(id: string, productId: string, data: SpecInput) {
  await assertAdmin();
  await validate(IdSchema, id);
  const parsed = await validate(SpecSchema, { ...data, productId });
  await prisma.specification.update({ where: { id, productId }, data: parsed });
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath('/products', 'layout');
  revalidateTag('products');
}
