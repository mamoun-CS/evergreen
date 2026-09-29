'use server';
import { prisma } from '@/lib/prisma';
import { requirePermission,getClientIp } from '@/lib/auth-middleware';
import { revalidatePath } from 'next/cache';
export async function resetLoginLimit(form:FormData) {
 const user=await requirePermission('update','settings');const ip=String(form.get('ip')||'').slice(0,100);if(!ip)throw new Error('IP required');
 await prisma.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${ip}))`;await tx.loginAttempt.updateMany({where:{ipAddress:ip,failureReason:'invalid_credentials'},data:{failureReason:'admin_reset'}});await tx.adminAuditLog.create({data:{userId:user.id,action:'LOGIN_LIMIT_RESET',resourceType:'loginAttempt',newData:{ip},ipAddress:getClientIp()}});});revalidatePath('/admin/login-attempts');
}
