import 'server-only';

import { verifyLahzaSignature } from './payment-utils';
import { getLahzaConfig as readLahzaConfig } from './lahza-config';
export { isLahzaConfigured } from './lahza-config';
export function getLahzaConfig() { return readLahzaConfig(); }

export interface LahzaTransaction {
  id?: number | string;
  reference: string;
  amount: number | string;
  currency: string;
  status: string;
  channel?: string | null;
  gateway_response?: string | null;
  paid_at?: string | null;
  paidAt?: string | null;
  authorization?: {
    authorization_code?: string | null;
    last4?: string | null;
    brand?: string | null;
    card_type?: string | null;
    bank?: string | null;
  } | null;
}

interface LahzaApiResponse<T> { status: boolean; message: string; data: T }

export interface LahzaInitializeResponse {
  authorization_url: string;
  access_code?: string;
  reference: string;
}

export interface LahzaRefundResponse {
  id?: number | string;
  status?: string;
  amount?: number | string;
  currency?: string;
}

async function lahzaFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { secret, baseUrl } = getLahzaConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null) as LahzaApiResponse<T> | null;
  if (!response.ok || !body?.status || !body.data) {
    throw new Error(`Lahza request failed (${response.status}).`);
  }
  return body.data;
}

export function initializeLahzaTransaction(input: {
  email: string; mobile: string; amount: string; currency: string; reference: string;
  callbackUrl: string; metadata: Record<string, string>;
}) {
  return lahzaFetch<LahzaInitializeResponse>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({ email: input.email, mobile: input.mobile, amount: input.amount, currency: input.currency, reference: input.reference, callback_url: input.callbackUrl, metadata: JSON.stringify(input.metadata) }),
  });
}

export function verifyLahzaTransaction(reference: string) {
  return lahzaFetch<LahzaTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

export function createLahzaRefund(input: { transaction: string; amount?: string; currency: string; customerNote?: string; merchantNote?: string }) {
  return lahzaFetch<LahzaRefundResponse>('/refund', {
    method: 'POST',
    body: JSON.stringify({ transaction: input.transaction, amount: input.amount, currency: input.currency, customer_note: input.customerNote, merchant_note: input.merchantNote }),
  });
}

export function verifyLahzaWebhookSignature(rawBody: string, signature: string | null): boolean {
  return verifyLahzaSignature(Buffer.from(rawBody), signature || '', process.env.LAHZA_SECRET_KEY || '');
}
