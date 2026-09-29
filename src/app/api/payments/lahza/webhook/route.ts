import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { applyLahzaRefundEvent, verifyAndFinalizePayment } from '@/lib/payment-lifecycle';
import { verifyLahzaSignature } from '@/lib/payment-utils';
import { prisma } from '@/lib/prisma';
import { getClientIp } from '@/lib/auth-middleware';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
 const raw=Buffer.from(await req.arrayBuffer());
 const valid=verifyLahzaSignature(raw,req.headers.get('x-lahza-signature') || '',process.env.LAHZA_SECRET_KEY || '');
 const ipAddress=getClientIp(req.headers);
 const key=crypto.createHash('sha256').update(raw).digest('hex');
 let logId: string | undefined;
 try {
  const log=await prisma.webhookLog.create({data:{eventKey:key,ipAddress,valid,status:valid?'RECEIVED':'INVALID_SIGNATURE'}}); logId=log.id;
  if (!valid) return NextResponse.json({error:'Invalid signature'},{status:401});
  let event;
  try {event=JSON.parse(raw.toString('utf8'));} catch {await prisma.webhookLog.update({where:{id:logId},data:{status:'INVALID_JSON'}});return NextResponse.json({error:'Invalid JSON'},{status:400});}
  const reference=event?.data?.reference || event?.data?.transaction?.reference;
  if (typeof reference!=='string' || !/^[A-Za-z0-9.=_-]{8,150}$/.test(reference) || typeof event?.event!=='string') {await prisma.webhookLog.update({where:{id:logId},data:{status:'INVALID_EVENT'}});return NextResponse.json({error:'Invalid event'},{status:400});}
  await prisma.webhookLog.update({where:{id:logId},data:{reference,event:event.event.slice(0,100)}});
  const eventKey = event.event === 'charge.success' ? `charge:${reference}` : key;
  const duplicate=await prisma.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${eventKey}))`;
   if(await tx.webhookReceipt.findUnique({where:{key:eventKey}})) return true;
   if(event.event==='charge.success') {
    const result=await verifyAndFinalizePayment(reference);
    if(!result.found || ('verificationUnavailable' in result && result.verificationUnavailable) || result.status!=='PAID') throw new Error('Payment verification incomplete');
    await tx.payment.updateMany({where:{reference,idempotencyKey:null},data:{idempotencyKey:`charge:${reference}`}});
   } else if(['refund.pending','refund.processing','refund.processed','refund.failed'].includes(event.event)) await applyLahzaRefundEvent(reference,event.data);
   await tx.webhookReceipt.create({data:{key:eventKey}});
   return false;
  },{timeout:25000});
  await prisma.webhookLog.update({where:{id:logId},data:{status:duplicate?'DUPLICATE':'PROCESSED'}});
  return NextResponse.json(duplicate?{error:'Already processed'}:{received:true},{status:duplicate?409:200});
 } catch(error) {
  console.error('Webhook failed',{key,ipAddress,timestamp:new Date().toISOString(),error});
  if(logId) await prisma.webhookLog.update({where:{id:logId},data:{status:'FAILED'}}).catch(()=>{});
  return NextResponse.json({error:'Temporary webhook processing failure'},{status:500});
 }
}
