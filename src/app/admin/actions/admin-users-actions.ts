'use server';
import { validate } from '@/lib/admin-validation';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requirePermission, getClientIp } from '@/lib/auth-middleware';
import { AdminUserSchema, IdSchema } from '@/lib/validation';
import { sendEmail } from '@/lib/email-service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
export async function requestAdminCode() {
 const user=await requirePermission('update','admins');
 const code=crypto.randomInt(100000,1000000).toString();
 const challenge=await prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
  const recent=await tx.adminChallenge.findFirst({where:{userId:user.id,createdAt:{gte:new Date(Date.now()-60000)}}});
  if(recent) throw new Error('Wait one minute before requesting another code');
  await tx.adminChallenge.updateMany({where:{userId:user.id,usedAt:null},data:{usedAt:new Date()}});
  return tx.adminChallenge.create({data:{userId:user.id,codeHash:crypto.createHash('sha256').update(code).digest('hex'),expiresAt:new Date(Date.now()+600000)}});
 });
 const sent=await sendEmail(user.email,'Confirm admin account change',`<p>Your one-time code is <strong>${code}</strong>. It expires in 10 minutes.</p>`);
 if(!sent) {await prisma.adminChallenge.update({where:{id:challenge.id},data:{usedAt:new Date()}});throw new Error('Verification email could not be sent');}
}
async function verifyCode(userId:string,code:unknown) {
 const success=await prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
  const c=await tx.adminChallenge.findFirst({where:{userId,usedAt:null,expiresAt:{gt:new Date()},attempts:{lt:5}},orderBy:{createdAt:'desc'}});
  if(!c) return false;
  const valid=typeof code==='string' && /^\d{6}$/.test(code) && crypto.timingSafeEqual(Buffer.from(c.codeHash,'hex'),crypto.createHash('sha256').update(code).digest());
  await tx.adminChallenge.update({where:{id:c.id},data:{attempts:{increment:1},usedAt:valid?new Date():undefined}});
  return valid;
 });
 if(!success) throw new Error('Invalid or expired confirmation code');
}
export async function createAdmin(input: unknown, code?:unknown) {
 const user=await requirePermission('create','admins');const data=await validate(AdminUserSchema,input);await verifyCode(user.id,code);
 const passwordHash=await bcrypt.hash(data.password,12);
 await prisma.$transaction(async tx=>{const created=await tx.user.create({data:{name:data.name,email:data.email.toLowerCase(),role:data.role,passwordHash}});await tx.adminAuditLog.create({data:{userId:user.id,action:'ADMIN_CREATED',resourceType:'user',resourceId:created.id,newData:{name:created.name,email:created.email,role:created.role},ipAddress:getClientIp()}});});
 revalidatePath('/admin/admins');
}
export async function updateAdminStatus(id:string,isActive:boolean,code?:unknown) {await changeAdmin(id,{isActive:await validate(z.boolean(),isActive)},code);}
export async function updateAdminRole(id:string,role:unknown,code?:unknown) {await changeAdmin(id,{role:await validate(z.enum(['ADMIN','SUPER_ADMIN','MANAGER']),role)},code);}
async function changeAdmin(id:string,data:{isActive?:boolean;role?:'ADMIN'|'SUPER_ADMIN'|'MANAGER'},code:unknown) {
 const user=await requirePermission('update','admins');await validate(IdSchema,id);if(id===user.id)throw new Error('Cannot change your own access');await verifyCode(user.id,code);
 await prisma.$transaction(async tx=>{const old=await tx.user.findUniqueOrThrow({where:{id}});if(old.role==='CUSTOMER')throw new Error('Not an admin account');await tx.user.update({where:{id},data});await tx.adminAuditLog.create({data:{userId:user.id,action:'ADMIN_UPDATED',resourceType:'user',resourceId:id,oldData:{role:old.role,isActive:old.isActive},newData:data,ipAddress:getClientIp()}});});revalidatePath('/admin/admins');
}
