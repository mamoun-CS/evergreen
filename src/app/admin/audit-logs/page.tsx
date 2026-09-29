import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-middleware';
import { auditFilters } from '@/lib/audit-filters';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Record<string,string>}) {
 await requirePermission('read','settings');const params=new URLSearchParams(searchParams);const rows=await prisma.adminAuditLog.findMany({where:auditFilters(params),orderBy:{createdAt:'desc'},take:100});params.set('format','csv');
 return <div className="p-6 space-y-6"><h1 className="text-2xl font-bold">Admin audit log</h1><form className="flex flex-wrap gap-3">{['userId','action','resourceType','from','to'].map(k=><label key={k}>{k}<input name={k} type={['from','to'].includes(k)?'date':'text'} defaultValue={searchParams[k]} className="block border rounded p-2"/></label>)}<button className="border rounded p-3">Filter</button></form><a className="underline" href={`/api/admin/audit-logs?${params}`}>Export CSV (up to 1,000 records)</a><p>Latest 100 matching actions</p><div className="space-y-3">{rows.map(r=><article key={r.id} className="border rounded bg-white p-4"><p className="font-bold">{r.action} · {r.resourceType} · {r.resourceId}</p><p>{r.userId} · {r.ipAddress} · {r.createdAt.toISOString()}</p><details><summary>View changes</summary><pre className="whitespace-pre-wrap break-all">{JSON.stringify({before:r.oldData,after:r.newData},null,2)}</pre></details></article>)}</div></div>;
}
