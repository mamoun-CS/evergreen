import 'server-only';

import { notifyOrderCreated } from './email-service';
import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sumLineItems } from '@/lib/money';

export type SubmittedItem = { productId?: unknown; variantId?: unknown; quantity?: unknown };
export type CheckoutDetails = { customerName: string; email: string; phone: string; shippingAddress: string; shippingOptionCode: string; couponCode?: string; language?: 'ar' | 'en'; items: SubmittedItem[]; createAccount?: { password: string } };

export function validText(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

export function parseCheckout(body: unknown): CheckoutDetails | null {
  if (!body || typeof body !== 'object') return null;
  const candidate = body as Record<string, unknown>;
  if (!validText(candidate.customerName, 120) || !validText(candidate.email, 254) || !validText(candidate.phone, 40) || !validText(candidate.shippingAddress, 500) || !validText(candidate.shippingOptionCode, 50) || !Array.isArray(candidate.items) || candidate.items.length === 0 || candidate.items.length > 50) return null;
  if (typeof candidate.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email.trim())) return null;
  return {
    customerName: (candidate.customerName as string).trim(), email: (candidate.email as string).trim().toLowerCase(),
    phone: (candidate.phone as string).trim(), shippingAddress: (candidate.shippingAddress as string).trim(), shippingOptionCode: (candidate.shippingOptionCode as string).trim(),
    couponCode: typeof candidate.couponCode === 'string' && candidate.couponCode.trim() ? candidate.couponCode.trim().toUpperCase().slice(0, 64) : undefined,
    language: candidate.language === 'en' ? 'en' : 'ar',
    items: candidate.items,
    createAccount: candidate.createAccount && typeof (candidate.createAccount as any).password === 'string' && (candidate.createAccount as any).password.length >= 10 ? { password: (candidate.createAccount as any).password } : undefined,
  };
}

export async function createReservedOrder(details: CheckoutDetails, paymentMethod: 'CASH_ON_DELIVERY' | 'LAHZA', userId?: string) {
  const requested = new Map<string, { productId: string; variantId?: string; quantity: number }>();
  for (const item of details.items) {
    if (typeof item.productId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(item.productId)) throw new Error('INVALID_PRODUCT');
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new Error('INVALID_PRODUCT');
    if (item.variantId !== undefined && (typeof item.variantId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(item.variantId))) throw new Error('INVALID_PRODUCT');
    const key = `${item.productId}:${item.variantId || ''}`;
    const existing = requested.get(key);
    requested.set(key, { productId: item.productId, variantId: item.variantId as string | undefined, quantity: (existing?.quantity || 0) + quantity });
    if ((existing?.quantity || 0) + quantity > 100) throw new Error('INVALID_PRODUCT');
  }
  if ([...requested.values()].some((item) => item.quantity > 100)) throw new Error('INVALID_PRODUCT');
  const productIds = [...new Set([...requested.values()].map((item) => item.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } }, include: { variants: true } });
  if (products.length !== productIds.length) throw new Error('UNAVAILABLE_PRODUCT');
  const items = [...requested.values()].map((requestedItem) => {
    const product = products.find((entry) => entry.id === requestedItem.productId)!;
    const variant = requestedItem.variantId ? product.variants.find((entry) => entry.id === requestedItem.variantId) : null;
    const price = variant?.price ?? product.discountPrice ?? product.basePrice;
    const stock = variant ? variant.stock : product.stockQuantity;
    if (product.purchaseMode !== 'PURCHASABLE' || !product.isAvailable || !price || stock < requestedItem.quantity || (product.variants.length > 0 && !variant) || (!product.variants.length && requestedItem.variantId)) throw new Error('UNAVAILABLE_PRODUCT');
    return { productId: product.id, variantId: variant?.id, quantity: requestedItem.quantity, price };
  });
  const currency = products[0]?.currency || 'ILS';
  if (products.some((product) => product.currency !== currency)) throw new Error('CURRENCY_MISMATCH');
  const itemsSubtotal = sumLineItems(items);
  const isLahza = paymentMethod === 'LAHZA';
  const reservationExpiresAt = isLahza ? new Date(Date.now() + 20 * 60 * 1000) : undefined;
  const preference = userId ? await prisma.user.findUnique({where:{id:userId},select:{language:true}}) : null;
  const order = await prisma.$transaction(async (tx) => {
    const shipping = await tx.shippingOption.findFirst({ where: { code: details.shippingOptionCode, isActive: true } });
    if (!shipping) throw new Error('INVALID_SHIPPING_OPTION');
    let discountAmount = new Prisma.Decimal(0);
    let couponCode: string | undefined;
    if (details.couponCode) {
      const coupon = await tx.coupon.findUnique({ where: { code: details.couponCode } });
      const now = new Date();
      if (!coupon || !coupon.isActive || (coupon.startsAt && coupon.startsAt > now) || (coupon.expiresAt && coupon.expiresAt < now) || (coupon.minimumAmount && itemsSubtotal.lessThan(coupon.minimumAmount)) || (coupon.maximumUses !== null && coupon.usesCount >= coupon.maximumUses)) throw new Error('INVALID_COUPON');
      discountAmount = coupon.type === 'PERCENTAGE' ? itemsSubtotal.mul(coupon.value).div(100) : coupon.value;
      if (discountAmount.greaterThan(itemsSubtotal)) discountAmount = itemsSubtotal;
      const claimed = await tx.coupon.updateMany({ where: { id: coupon.id, usesCount: coupon.maximumUses === null ? undefined : { lt: coupon.maximumUses } }, data: { usesCount: { increment: 1 } } });
      if (claimed.count !== 1) throw new Error('INVALID_COUPON');
      couponCode = coupon.code;
    }
    const totalAmount = itemsSubtotal.plus(shipping.price).minus(discountAmount);

    for (const item of items) {
      if (isLahza) {
        const changed = item.variantId
          ? await tx.productVariant.updateMany({ where: { id: item.variantId, productId: item.productId, stock: { gte: item.quantity }, product: { isAvailable: true, purchaseMode: 'PURCHASABLE' } }, data: { stock: { decrement: item.quantity } } })
          : await tx.product.updateMany({ where: { id: item.productId, isAvailable: true, purchaseMode: 'PURCHASABLE', stockQuantity: { gte: item.quantity }, variants: { none: {} } }, data: { stockQuantity: { decrement: item.quantity } } });
        if (changed.count !== 1) throw new Error('UNAVAILABLE_PRODUCT');
      } else {
        const currentStock = item.variantId
          ? await tx.productVariant.findFirst({ where: { id: item.variantId, productId: item.productId, stock: { gte: item.quantity }, product: { isAvailable: true, purchaseMode: 'PURCHASABLE' } }, select: { id: true } })
          : await tx.product.findFirst({ where: { id: item.productId, isAvailable: true, purchaseMode: 'PURCHASABLE', stockQuantity: { gte: item.quantity }, variants: { none: {} } }, select: { id: true } });
        if (!currentStock) throw new Error('UNAVAILABLE_PRODUCT');
      }
    }

    const createdOrder = await tx.order.create({
      data: {
        orderNumber: `ORD-${crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
        userId,
        customerName: details.customerName, email: details.email, phone: details.phone, shippingAddress: details.shippingAddress,
        shippingMethod: shipping.code, shippingAmount: shipping.price, discountAmount, couponCode,
        totalAmount, currency, paymentMethod, requiresAdminConfirmation: !isLahza, language: preference?.language || details.language || 'ar',
        paymentAccessToken: crypto.randomBytes(32).toString('base64url'),
        inventoryReserved: isLahza,
        reservationExpiresAt,
        items: { create: items.map(({ productId, variantId, quantity, price }) => ({ productId, variantId, quantity, price })) },
      },
      select: { id: true, orderNumber: true, totalAmount: true, currency: true, paymentAccessToken: true },
    });
    if (isLahza) await tx.inventoryAuditLog.createMany({ data: items.map((item) => ({ productId: item.productId, quantityChange: -item.quantity, reason: 'ORDER_RESERVED', orderId: createdOrder.id })) });
    return createdOrder;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  if (details.createAccount && !userId) {
    try {
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(details.createAccount.password, 12);
      const newUser = await prisma.user.create({
        data: {
          email: details.email,
          name: details.customerName,
          phone: details.phone,
          passwordHash,
          role: 'CUSTOMER',
        }
      });
      await prisma.order.update({ where: { id: order.id }, data: { userId: newUser.id } });
    } catch (err) {
      console.error('Failed to create account during checkout', err);
    }
  }

  await notifyOrderCreated(order.id);
  return order;
}
