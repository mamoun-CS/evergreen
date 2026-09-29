import 'server-only';

import { PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { fromMinorUnits, toMinorUnits } from '@/lib/money';
import { LahzaTransaction, verifyLahzaTransaction } from '@/lib/lahza';

function safeGatewayResponse(transaction: LahzaTransaction): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(transaction)) as Prisma.InputJsonValue;
}

function dateOrNow(value: string | null | undefined) {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.valueOf()) ? new Date() : parsed;
}

/** Verify Lahza's source of truth before making any local fulfillment state change. */
export async function verifyAndFinalizePayment(reference: string) {
  const payment = await prisma.payment.findUnique({ where: { reference }, include: { order: true } });
  if (!payment) return { found: false, status: 'UNKNOWN' as const };
  if (payment.status === PaymentStatus.PAID || payment.status === PaymentStatus.REFUNDED || payment.status === PaymentStatus.PARTIALLY_REFUNDED) {
    return { found: true, status: payment.status };
  }

  let transaction: LahzaTransaction;
  try {
    transaction = await verifyLahzaTransaction(reference);
  } catch (error) {
    console.error('Lahza verification failed', { reference, error: error instanceof Error ? error.message : 'unknown' });
    return { found: true, status: payment.status, verificationUnavailable: true };
  }

  const expectedMinor = toMinorUnits(payment.amount);
  const valid = transaction.status === 'success'
    && transaction.reference === payment.reference
    && String(transaction.amount) === expectedMinor
    && transaction.currency === payment.currency;

  if (!valid) {
    const gatewayFailed = ['failed', 'abandoned', 'cancelled'].includes(transaction.status.toLowerCase());
    console.error('Lahza verification mismatch', { reference, gatewayStatus: transaction.status, gatewayAmount: transaction.amount, gatewayCurrency: transaction.currency });
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: gatewayFailed ? PaymentStatus.FAILED : PaymentStatus.PROCESSING, failedAt: gatewayFailed ? new Date() : undefined, gatewayResponse: safeGatewayResponse(transaction) },
    });
    if (gatewayFailed) await releaseInventoryReservation(payment.id);
    return { found: true, status: gatewayFailed ? PaymentStatus.FAILED : PaymentStatus.PROCESSING };
  }

  return finalizeSuccessfulPayment(payment.id, transaction);
}

/**
 * The sole fulfillment transition. The conditional update makes callback/webhook
 * races idempotent; stock was atomically reserved during initialization.
 */
export async function finalizeSuccessfulPayment(paymentId: string, transaction: LahzaTransaction) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { order: { include: { items: true } } } });
    if (!payment) return { found: false, status: 'UNKNOWN' as const };
    if (payment.status === PaymentStatus.PAID) return { found: true, status: PaymentStatus.PAID };

    // A callback may arrive after the scheduler released an expired hold. Reclaim
    // stock atomically where possible; never turn a verified charge into FAILED.
    let fulfillmentNeedsReview = false;
    if (!payment.order.inventoryReserved) {
      const decremented: typeof payment.order.items = [];
      for (const item of payment.order.items) {
        const changed = item.variantId ? await tx.productVariant.updateMany({
          where: { id: item.variantId, productId: item.productId, stock: { gte: item.quantity }, product: { isAvailable: true } },
          data: { stock: { decrement: item.quantity } },
        }) : await tx.product.updateMany({
          where: { id: item.productId, isAvailable: true, variants: { none: {} }, stockQuantity: { gte: item.quantity } },
          data: { stockQuantity: { decrement: item.quantity } },
        });
        if (changed.count !== 1) {
          for (const reserved of decremented) {
            if (reserved.variantId) await tx.productVariant.update({ where: { id: reserved.variantId }, data: { stock: { increment: reserved.quantity } } });
            else await tx.product.update({ where: { id: reserved.productId }, data: { stockQuantity: { increment: reserved.quantity } } });
          }
          fulfillmentNeedsReview = true;
          break;
        }
        decremented.push(item);
      }
    }

    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING, PaymentStatus.FAILED, PaymentStatus.CANCELLED] } },
      data: {
        status: PaymentStatus.PAID,
        providerTransactionId: transaction.id === undefined ? undefined : String(transaction.id),
        channel: transaction.channel || undefined,
        gatewayResponse: safeGatewayResponse(transaction),
        cardLast4: transaction.authorization?.last4 || undefined,
        cardBrand: transaction.authorization?.brand || transaction.authorization?.card_type || undefined,
        bank: transaction.authorization?.bank || undefined,
        paidAt: dateOrNow(transaction.paid_at || transaction.paidAt),
      },
    });
    if (!claimed.count) {
      const current = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
      return { found: true, status: current.status };
    }
    await tx.order.update({
      where: { id: payment.orderId },
      data: {
        // PROCESSING is an explicit paid/manual-review queue, never a false failure.
        status: 'PROCESSING',
        inventoryReserved: false,
        reservationExpiresAt: null,
        fulfillmentNeedsReview,
      },
    });
    if (fulfillmentNeedsReview) console.error('Verified Lahza payment requires fulfillment review: inventory was no longer available', { paymentId: payment.id, orderId: payment.orderId });
    return { found: true, status: PaymentStatus.PAID };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/** Releases a Lahza stock hold exactly once after a terminal non-payment state. */
export async function releaseInventoryReservation(paymentId: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { order: { include: { items: true } } },
    });
    if (!payment || !payment.order.inventoryReserved || (payment.status !== PaymentStatus.FAILED && payment.status !== PaymentStatus.CANCELLED)) return false;
    const released = await tx.order.updateMany({
      where: { id: payment.orderId, inventoryReserved: true, status: 'PENDING' },
      data: { inventoryReserved: false, reservationExpiresAt: null },
    });
    if (!released.count) return false;
    for (const item of payment.order.items) {
      if (item.variantId) await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
      else await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: { increment: item.quantity } } });
      await tx.inventoryAuditLog.create({ data: { productId: item.productId, quantityChange: item.quantity, reason: 'PAYMENT_RESERVATION_RELEASED', orderId: payment.orderId } });
    }
    return true;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/** Intended for a protected scheduler; expires payment sessions and releases their holds. */
export async function releaseExpiredReservations() {
  const expired = await prisma.payment.findMany({
    where: { status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] }, order: { inventoryReserved: true, reservationExpiresAt: { lt: new Date() }, status: 'PENDING' } },
    select: { id: true },
    take: 100,
  });
  let released = 0;
  for (const payment of expired) {
    const changed = await prisma.payment.updateMany({ where: { id: payment.id, status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] } }, data: { status: PaymentStatus.CANCELLED, failedAt: new Date() } });
    if (changed.count && await releaseInventoryReservation(payment.id)) released += 1;
  }
  return released;
}

export async function applyLahzaRefundEvent(reference: string, refund: { status?: string; amount?: number | string; fully_deducted?: boolean; refunded_at?: string }) {
  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) return;
  const state = refund.status?.toLowerCase();
  const status = state === 'processed'
    ? (refund.fully_deducted ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED)
    : state === 'failed' ? PaymentStatus.PAID : PaymentStatus.REFUND_PENDING;
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status, refundedAmount: refund.amount === undefined ? undefined : fromMinorUnits(refund.amount), refundedAt: state === 'processed' ? dateOrNow(refund.refunded_at) : undefined },
  });
}
