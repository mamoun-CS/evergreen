import type { LahzaTransaction } from './lahza';

/** Persist only reconciliation fields; gateway responses may contain credentials or customer data. */
export function paymentGatewaySnapshot(transaction: LahzaTransaction) {
  return {
    reference: transaction.reference,
    status: transaction.status,
    amount: transaction.amount,
    currency: transaction.currency,
    ...(transaction.id != null ? { id: String(transaction.id) } : {}),
    ...(transaction.channel ? { channel: transaction.channel } : {}),
    ...(transaction.paid_at ? { paid_at: transaction.paid_at } : {}),
    ...(transaction.paidAt ? { paidAt: transaction.paidAt } : {}),
  };
}
