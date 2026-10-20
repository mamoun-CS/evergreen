import 'server-only';

import { orderConfirmation } from './email-templates/order-confirmation';
import { adminNotification } from './email-templates/admin-notification';
import { enqueueNotification, processNotificationOutbox } from './notification-outbox';
import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sumLineItems } from '@/lib/money';
import { checkoutFingerprint, normalizeCheckoutItems } from '@/lib/checkout-fingerprint';

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

export type CheckoutIdentity = { key: string; guestSecret?: string };
export function validCheckoutKey(key: string | null): key is string {
  return !!key && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key);
}

export async function createReservedOrder(details: CheckoutDetails, paymentMethod: 'CASH_ON_DELIVERY' | 'LAHZA', userId?: string, identity?: CheckoutIdentity) {
  const keyHash = identity && crypto.createHash('sha256').update(identity.key.toLowerCase()).digest('hex');
  const fingerprint = identity && checkoutFingerprint(details, paymentMethod);
  const owner = userId ? `user:${userId}` : identity?.guestSecret ? `guest:${crypto.createHash('sha256').update(identity.guestSecret.toLowerCase()).digest('hex')}` : null;
  const findAttempt = async () => {
    if (!keyHash) return null;
    const attempt = await prisma.checkoutAttempt.findUnique({ where: { keyHash }, include: { order: true } });
    if (!attempt) return null;
    if (attempt.ownerId !== owner) throw new Error('CHECKOUT_CONFLICT');
    if (attempt.fingerprint !== fingerprint) throw new Error('CHECKOUT_CONFLICT');
    if (!attempt.order) throw new Error('CHECKOUT_PENDING');
    return { ...attempt.order, replayed: true, keyHash, paymentInitState: attempt.paymentInitState, authorizationUrl: attempt.authorizationUrl };
  };
  const existing = await findAttempt();
  if (existing) return existing;
  const requested = normalizeCheckoutItems(details.items);
  const isLahza = paymentMethod === 'LAHZA';
  const reservationExpiresAt = isLahza ? new Date(Date.now() + 20 * 60 * 1000) : undefined;
  const preference = userId ? await prisma.user.findUnique({where:{id:userId},select:{language:true}}) : null;
  let order;
  try {
  order = await prisma.$transaction(async (tx) => {
    if (keyHash && fingerprint) await tx.checkoutAttempt.create({ data: { keyHash, fingerprint, ownerId: owner, paymentInitState: isLahza ? 'INITIALIZING' : 'COD' } });
    const productIds = [...new Set(requested.map((item) => item.productId))];
    const products = await tx.product.findMany({ where: { id: { in: productIds } }, include: { variants: true } });
    if (products.length !== productIds.length) throw new Error('UNAVAILABLE_PRODUCT');
    const items = requested.map((requestedItem) => {
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
      include: { items: { include: { product: true } } },
    });
    if (isLahza) await tx.inventoryAuditLog.createMany({ data: items.map((item) => ({ productId: item.productId, quantityChange: -item.quantity, reason: 'ORDER_RESERVED', orderId: createdOrder.id })) });
    if (keyHash) {
      await tx.checkoutAttempt.update({ where: { keyHash }, data: { orderId: createdOrder.id } });
      if (isLahza) await tx.payment.create({ data: { orderId: createdOrder.id, reference: `PAY-${createdOrder.orderNumber}-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`, amount: createdOrder.totalAmount, currency: createdOrder.currency } });
    }

    if (!isLahza) {
      await enqueueNotification(tx, {
        orderId: createdOrder.id,
        eventType: 'ORDER_CREATED',
        recipientRole: 'CUSTOMER',
        recipient: createdOrder.email,
        subject: `Evergreen — ${createdOrder.orderNumber}`,
        htmlContent: orderConfirmation(createdOrder),
      });
      await enqueueNotification(tx, {
        orderId: createdOrder.id,
        eventType: 'ORDER_CREATED',
        recipientRole: 'ADMIN',
        recipient: process.env.ADMIN_EMAIL || 'admin@example.test',
        subject: `New order ${createdOrder.orderNumber}`,
        htmlContent: adminNotification(createdOrder),
      });
    } else {
      await enqueueNotification(tx, {
        orderId: createdOrder.id,
        eventType: 'ORDER_CREATED',
        recipientRole: 'CUSTOMER',
        recipient: createdOrder.email,
        subject: `Evergreen — ${createdOrder.orderNumber}`,
        htmlContent: orderConfirmation(createdOrder),
      });
    }

    return { ...createdOrder, replayed: false, keyHash, paymentInitState: isLahza ? 'INITIALIZING' : 'COD', authorizationUrl: null };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000, maxWait: 15000 });
  } catch (error) {
    if (keyHash && error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2034' || (error.code === 'P2002' && Array.isArray(error.meta?.target) && error.meta.target.includes('keyHash')))) {
      const winner = await findAttempt();
      if (winner) return winner;
      throw new Error('CHECKOUT_PENDING');
    }
    throw error;
  }

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

  // Safe post-commit outbox dispatch. Transaction is already committed.
  // Delivery failures remain retryable in the outbox table.
  await processNotificationOutbox({ limit: 10 }).catch(() => {});
  return order;
}
