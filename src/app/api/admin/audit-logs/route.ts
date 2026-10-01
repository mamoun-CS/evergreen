import { NextRequest,NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { auditFilters,csvCell } from '@/lib/audit-filters';
export async function GET(req:NextRequest) {
try {await requirePermission('read','auditLog');}catch{return NextResponse.json({error:'Forbidden'},{status:403});}
 try {
 const rows=await prisma.adminAuditLog.findMany({where:auditFilters(req.nextUrl.searchParams),orderBy:{createdAt:'desc'},take:1000});
 if(req.nextUrl.searchParams.get('format')==='csv') return new NextResponse([['User','Action','Resource','ID','IP','Time','Before','After'].map(csvCell).join(','),...rows.map(r=>[r.userId,r.action,r.resourceType,r.resourceId,r.ipAddress,r.createdAt.toISOString(),JSON.stringify(r.oldData),JSON.stringify(r.newData)].map(csvCell).join(','))].join('\r\n'),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="audit-logs.csv"','Cache-Control':'no-store'}});
 return NextResponse.json({rows},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Invalid filters'},{status:400});}
}
