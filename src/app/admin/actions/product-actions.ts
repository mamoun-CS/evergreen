'use server';
import { validate } from '@/lib/admin-validation';

import { IdSchema, ProductFormSchema } from '@/lib/validation';
import { assertAdmin } from '@/lib/auth';
import { prisma } from '@/lib/admin-prisma';
import { revalidatePath, revalidateTag } from 'next/cache';
import { PurchaseMode } from '@prisma/client';
import { removeUnusedImages, remove } from '@/lib/storage';

export type ProductInput = {
  nameEn: string;
  nameAr: string;
  slug: string;
  sku?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  purchaseMode: PurchaseMode;
  basePrice?: number;
  discountPrice?: number;
  currency: string;
  isAvailable: boolean;
  isFeatured: boolean;
  stockQuantity: number;
  material?: string;
  color?: string;
  style?: string;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  weightKg?: number;
  images: string[];
  datasheetUrl?: string;
  manualUrl?: string;
  warrantyInfoEn?: string;
  warrantyInfoAr?: string;
  countryOfOrigin?: string;
  brandId?: string;
  seriesModel?: string;
  categories: string[];
  applications: string[];
};

export async function createProduct(data: ProductInput) {
  await assertAdmin();
  data = await validate(ProductFormSchema, data);
  const { categories, applications, ...productData } = data;
  
  const created = await prisma.product.create({
    data: {
      ...productData,
      categories: { connect: categories.map((id) => ({ id })) },
      applications: { connect: applications.map((id) => ({ id })) },
    },
  });
  revalidatePath('/admin/products');
  revalidateTag('products');
  revalidateTag('categories');
  return created;
}

import { logInventoryChange } from '@/lib/inventory-management';

export async function updateProduct(id: string, data: ProductInput) {
  await assertAdmin();
  data = await validate(ProductFormSchema, data);
  await validate(IdSchema, id);
  const { categories, applications, ...productData } = data;
  
  const oldProduct = await prisma.product.findUnique({ where: { id } });
  
  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...productData,
      categories: { set: categories.map((id) => ({ id })) },
      applications: { set: applications.map((id) => ({ id })) },
    },
  });

  if (oldProduct) await removeUnusedImages(oldProduct.images, data.images);

  if (oldProduct && oldProduct.stockQuantity !== data.stockQuantity) {
    const diff = data.stockQuantity - oldProduct.stockQuantity;
    await logInventoryChange(id, diff, 'ADMIN_ADJUSTMENT', undefined, 'admin'); // We don't have session.userId here easily, just string for now
  }

  revalidatePath('/admin/products');
  revalidateTag('products');
  revalidateTag('categories');
  revalidatePath(`/admin/products/${id}`);
  return updated;
}

export async function deleteProduct(id: string) {
  await assertAdmin();
  await validate(IdSchema, id);
  // Keep products with order history available for historical records.
  const product = await prisma.product.findUnique({
    where: { id },
    include: { _count: { select: { orderItems: true } } }
  });
  
  if (product && product._count.orderItems > 0) {
    // Soft delete/archive logic (set isAvailable to false)
    await prisma.product.update({
      where: { id },
      data: { isAvailable: false },
    });
  } else {
    // Hard delete
    try {
      await prisma.product.delete({ where: { id } });
    } catch (error) {
      if ((error as { code?: string })?.code !== 'P2003') throw error;
      await prisma.product.update({ where: { id }, data: { isAvailable: false } });
    }
    if (product) await Promise.all(product.images.map((url) => remove(url).catch(() => undefined)));
  }
  revalidatePath('/admin/products');
  revalidateTag('products');
  revalidateTag('categories');
}
