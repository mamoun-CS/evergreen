import 'server-only';
import { z } from 'zod';
import { validate as parse } from './validation';
import { getCurrentUser } from './auth';
import { prisma } from './prisma';
import { getClientIp } from './auth-middleware';
import { sendEmail } from './email-service';
export async function validate<T>(schema:z.ZodType<T>,input:unknown):Promise<T> {
 try {return parse(schema,input);}catch(error) {
  const user=await getCurrentUser();
  if(user) {
   await prisma.adminAuditLog.create({data:{userId:user.id,action:'VALIDATION_REJECTED',resourceType:'adminForm',ipAddress:getClientIp()}});
   const count=await prisma.adminAuditLog.count({where:{userId:user.id,action:'VALIDATION_REJECTED',createdAt:{gte:new Date(Date.now()-60000)}}});
   if(count===5)await sendEmail(process.env.ADMIN_EMAIL||'','Repeated admin validation failures','<p>An admin submitted five invalid forms in one minute. Review the admin audit log.</p>');
  }
  throw error;
 }
}
