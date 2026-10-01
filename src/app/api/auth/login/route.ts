import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSessionCookieValue, sessionCookie } from '@/lib/auth';
import { getClientIp } from '@/lib/auth-middleware';
import { loginLimit } from '@/lib/rate-limit';
import { consumeRateLimit, rateLimitConfig, rateLimitResponseHeaders } from '@/lib/rate-limit';
import { sendLoginAlert } from '@/lib/email-alerts';
export async function POST(request: NextRequest) {
 const ipAddress=getClientIp(request.headers);
 const body=await request.json().catch(()=>null);
 const email=typeof body?.email==='string' ? body.email.trim().toLowerCase().slice(0,254) : '';
 const password=typeof body?.password==='string' ? body.password : '';
 try {
 const rateLimit = await consumeRateLimit(`login:${ipAddress}:${email || 'invalid'}`, rateLimitConfig.auth.maximum, rateLimitConfig.auth.windowMs);
 if (!rateLimit.allowed) return NextResponse.json({error:'Too many attempts. Please try again later.'},{status:429,headers:rateLimitResponseHeaders(rateLimit)});
 const result=await prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${ipAddress}))`;
  const failures=await tx.loginAttempt.findMany({where:{ipAddress,success:false,failureReason:'invalid_credentials',createdAt:{gte:new Date(Date.now()-7200000)}},orderBy:{createdAt:'desc'},take:100});
  const retryAfter=loginLimit(failures);
  if (retryAfter) { await tx.loginAttempt.create({data:{email,ipAddress,success:false,failureReason:'rate_limited'}}); return {retryAfter}; }
  const user=email && password.length<=128 ? await tx.user.findUnique({where:{email}}) : null;
  const valid=!!(user?.isActive && password && await bcrypt.compare(password,user.passwordHash));
  await tx.loginAttempt.create({data:{email,ipAddress,success:valid,failureReason:valid?null:'invalid_credentials'}});
  // NOTE: loginAttempt.deleteMany intentionally removed from this transaction.
  // Deleting old rows on every login extends a serializable transaction unnecessarily.
  // Old record cleanup happens asynchronously below instead.
  if (!valid || !user) return {failures:failures.length+1};
  await tx.user.update({where:{id:user.id},data:{lastLoginAt:new Date()}});
  return {user};
 },{timeout:15000});
 // Cleanup stale login attempts asynchronously — outside the hot-path transaction.
 // Fire-and-forget: failure here is non-critical.
 prisma.loginAttempt.deleteMany({where:{createdAt:{lt:new Date(Date.now()-90*86400000)}}}).catch(()=>{});
 if ('retryAfter' in result) return NextResponse.json({error:'Too many attempts. Please try again later.'},{status:429,headers:{'Retry-After':String(result.retryAfter)}});
 if (!result.user) { if (result.failures===4 || result.failures===10) await sendLoginAlert(ipAddress,email,result.failures); return NextResponse.json({error:'Invalid email or password.'},{status:401}); }
 const response=NextResponse.json({success:true,redirectUrl:result.user.role==='CUSTOMER'?'/account':result.user.role==='MANAGER'?'/admin/orders':'/admin'});
 response.cookies.set(sessionCookie(createSessionCookieValue(result.user.id,result.user.role)));
 return response;
 } catch(error) {console.error('Login failed',error);return NextResponse.json({error:'Login unavailable'},{status:503});}
}
