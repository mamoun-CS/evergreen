import 'server-only';

import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { Role } from '@prisma/client';
import { prisma } from './prisma';

const COOKIE_NAME = 'evergreen_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

type SessionPayload = { userId: string; role: Role; expiresAt: number };

function sign(value: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not configured');
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function safeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSessionCookieValue(userId: string, role: Role) {
  const payload = Buffer.from(JSON.stringify({ userId, role, expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function sessionCookie(value: string) {
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

export function clearSessionCookie() {
  return { name: COOKIE_NAME, value: '', httpOnly: true, sameSite: 'strict' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 };
}

export function getSessionPayload(): SessionPayload | null {
  const value = cookies().get(COOKIE_NAME)?.value;
  if (!value) return null;
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;
  
  try {
    if (!safeEquals(signature, sign(payload))) return null;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionPayload;
    if (!parsed.userId || !parsed.role || !Number.isFinite(parsed.expiresAt) || parsed.expiresAt <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const payload = getSessionPayload();
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, name: true, email: true, role: true, isActive: true }
  });
  if (!user || !user.isActive) return null;
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN && user.role !== Role.MANAGER)) {
    return null;
  }
  return user;
}

/** Use in server actions and mutation handlers; layouts may keep using requireAdmin for redirects. */
export async function assertAdmin() {
  const user = await requireAdmin();
  if (!user || user.role === Role.MANAGER) throw new Error('Unauthorized');
  return user;
}
