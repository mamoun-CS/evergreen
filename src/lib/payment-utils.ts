import crypto from 'node:crypto';
export function verifyLahzaSignature(body: Buffer, signature: string, secret: string): boolean {
  if (!secret || !/^[a-fA-F0-9]{64}$/.test(signature)) return false;
  const expected = crypto.createHmac('sha256', secret).update(body).digest();
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), expected);
}
