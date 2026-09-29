'use server';
import { validate } from '@/lib/admin-validation';

import { CouponType } from '@prisma/client';
import { IdSchema, ShippingFormSchema, CouponFormSchema } from '@/lib/validation';
import { assertAdmin } from '@/lib/auth';
import { prisma } from '@/lib/admin-prisma';
import { revalidatePath } from 'next/cache';

export async function updateShippingOption(id: string, data: { price: number; isActive: boolean }) {
  await assertAdmin();
  await validate(IdSchema, id);
  
  data = await validate(ShippingFormSchema, data);
  if (!Number.isFinite(data.price) || data.price < 0) throw new Error('Invalid shipping price');
  await prisma.shippingOption.update({ where: { id }, data });
  revalidatePath('/admin/shipping');
  revalidatePath('/checkout');
}

export async function createCoupon(data: { code: string; type: CouponType; value: number; minimumAmount?: number; maximumUses?: number; expiresAt?: string }) {
  await assertAdmin();
  data = await validate(CouponFormSchema, data);
  const code = data.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,64}$/.test(code) || !Number.isFinite(data.value) || data.value <= 0 || (data.type === 'PERCENTAGE' && data.value > 100)) throw new Error('Invalid coupon');
  await prisma.coupon.create({ data: { code, type: data.type, value: data.value, minimumAmount: data.minimumAmount && data.minimumAmount > 0 ? data.minimumAmount : null, maximumUses: data.maximumUses && data.maximumUses > 0 ? Math.floor(data.maximumUses) : null, expiresAt: data.expiresAt ? new Date(data.expiresAt) : null } });
  revalidatePath('/admin/coupons');
}

export async function toggleCoupon(id: string, isActive: boolean) {
  if (typeof isActive !== 'boolean') throw new Error('Invalid status');
  await assertAdmin();
  await validate(IdSchema, id);
  
  await prisma.coupon.update({ where: { id }, data: { isActive } });
  revalidatePath('/admin/coupons');
}
