import { createHash } from 'node:crypto';

type SubmittedItem = { productId?: unknown; variantId?: unknown; quantity?: unknown };
type FingerprintDetails = {
  customerName: string; email: string; phone: string; shippingAddress: string;
  shippingOptionCode: string; couponCode?: string; language?: 'ar' | 'en';
  items: SubmittedItem[]; createAccount?: { password: string };
};

/** Validate and combine item quantities in the same way as order creation. */
export function normalizeCheckoutItems(items: SubmittedItem[]) {
  const requested = new Map<string, { productId: string; variantId?: string; quantity: number }>();
  for (const item of items) {
    if (!item || typeof item.productId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(item.productId)) throw new Error('INVALID_PRODUCT');
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new Error('INVALID_PRODUCT');
    if (item.variantId !== undefined && (typeof item.variantId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(item.variantId))) throw new Error('INVALID_PRODUCT');
    const key = `${item.productId}:${item.variantId || ''}`;
    const total = (requested.get(key)?.quantity || 0) + quantity;
    if (total > 100) throw new Error('INVALID_PRODUCT');
    requested.set(key, { productId: item.productId, variantId: item.variantId as string | undefined, quantity: total });
  }
  return [...requested.values()];
}

/** Call only with the result of parseCheckout. No price, stock or password is stored. */
export function checkoutFingerprint(details: FingerprintDetails, paymentMethod: 'CASH_ON_DELIVERY' | 'LAHZA') {
  const items = normalizeCheckoutItems(details.items).map(item => ({
    productId: item.productId, variantId: item.variantId || null, quantity: item.quantity,
  })).sort((a, b) => a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : (a.variantId || '') < (b.variantId || '') ? -1 : (a.variantId || '') > (b.variantId || '') ? 1 : 0);
  const canonical = JSON.stringify({ version: 1, paymentMethod, customerName: details.customerName,
    email: details.email, phone: details.phone, shippingAddress: details.shippingAddress,
    shippingOptionCode: details.shippingOptionCode, couponCode: details.couponCode || null,
    language: details.language || 'ar', createAccount: Boolean(details.createAccount), items });
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}
