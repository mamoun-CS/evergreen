import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-middleware';
import { resetLoginLimit } from './actions';
export const dynamic='force-dynamic';
export default async function Page() {
 await requirePermission('read','settings');await prisma.loginAttempt.deleteMany({where:{createdAt:{lt:new Date(Date.now()-90*86400000)}}});const rows=await prisma.loginAttempt.findMany({orderBy:{createdAt:'desc'},take:100});
 return <div className="p-6 space-y-4"><h1 className="text-2xl font-bold">Login attempts</h1><form action={resetLoginLimit} className="flex gap-3"><label>IP to reset<input required name="ip" maxLength={100} className="block border p-2 rounded"/></label><button className="border rounded p-3">Reset limit</button></form>{rows.map(r=><article key={r.id} className="bg-white border rounded p-4"><p>{r.email} · {r.ipAddress}</p><p>{r.success?'Success':r.failureReason} · {r.createdAt.toISOString()}</p></article>)}</div>;
}
