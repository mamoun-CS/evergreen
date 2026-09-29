import 'server-only';

import crypto from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'evergreen_admin_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

type SessionPayload = { email: string; expiresAt: number };

function config() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!email || !password || !secret || secret.length < 32) return null;
  return { email, password, secret };
}

function sign(value: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function safeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAdminConfigured() {
  return config() !== null;
}

export function validAdminCredentials(email: string, password: string) {
  const admin = config();
  return Boolean(admin && safeEquals(email.trim().toLowerCase(), admin.email) && safeEquals(password, admin.password));
}

export function createAdminSession(email: string) {
  const admin = config();
  if (!admin) throw new Error('Admin account is not configured.');
  const payload = Buffer.from(JSON.stringify({ email, expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 })).toString('base64url');
  return `${payload}.${sign(payload, admin.secret)}`;
}

export function adminSessionCookie(value: string) {
  return {
    name: COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  } as const;
}

export function clearedAdminSessionCookie() {
  return { name: COOKIE_NAME, value: '', httpOnly: true, sameSite: 'strict' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 };
}

export function getAdminSession(): SessionPayload | null {
  const admin = config();
  const value = cookies().get(COOKIE_NAME)?.value;
  if (!admin || !value) return null;
  const [payload, signature] = value.split('.');
  if (!payload || !signature || !safeEquals(signature, sign(payload, admin.secret))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionPayload;
    if (parsed.email !== admin.email || !Number.isFinite(parsed.expiresAt) || parsed.expiresAt <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
