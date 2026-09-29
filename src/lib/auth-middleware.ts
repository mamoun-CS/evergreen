import 'server-only';
import { headers } from 'next/headers';
import { getCurrentUser } from './auth';
import { canAccess } from './rbac';
import { prisma } from './prisma';
export function getClientIp(h: Pick<Headers, 'get'> = headers()) {
  // Enable only behind a proxy that overwrites this header; never trust arbitrary forwarded chains.
  const header = process.env.TRUSTED_IP_HEADER;
  return header ? (h.get(header)?.split(',')[0].trim().slice(0, 100) || 'unknown') : 'unknown';
}
export async function requirePermission(action: string, resource: string) {
  const user = await getCurrentUser();
  if (!user || !canAccess(user, action, resource)) {
    console.warn('Unauthorized admin access', { userId: user?.id, action, resource, ip: getClientIp(), timestamp: new Date().toISOString() });
    throw new Error('Forbidden');
  }
  return user;
}
export async function logAdminAction(data: { userId: string; action: string; resourceType: string; resourceId?: string; oldData?: object; newData?: object }) {
  return prisma.adminAuditLog.create({ data: { ...data, oldData: data.oldData ? JSON.parse(JSON.stringify(data.oldData)) : undefined, newData: data.newData ? JSON.parse(JSON.stringify(data.newData)) : undefined, ipAddress: getClientIp() } });
}
