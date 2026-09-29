import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-middleware';
export const dynamic='force-dynamic';
export default async function Page() {
 await requirePermission('read','settings');const rows=await prisma.emailLog.findMany({orderBy:{createdAt:'desc'},take:100});
 return <div className="p-6 space-y-4"><h1 className="text-2xl font-bold">Email delivery history</h1><p>Latest 100 deliveries</p>{rows.map(r=><article key={r.id} className="bg-white border rounded p-4"><h2 className="font-bold">{r.subject}</h2><p>{r.recipient} · {r.status} · Attempts: {r.attempts}</p><p>{r.createdAt.toISOString()}</p>{r.error&&<p className="text-red-700">{r.error}</p>}</article>)}</div>;
}
