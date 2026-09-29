'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
type Order = {id:string;orderNumber:string;customerName:string;total:string;createdAt:string;items:string;held:boolean};
export default function PendingOrders({orders}:{orders:Order[]}) {
 const router=useRouter(); const [selected,setSelected]=useState<string[]>([]); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const [reasons,setReasons]=useState<Record<string,string>>({});
 async function review(ids:string[],action:string) {
  setBusy(true);setMessage('');const errors:string[]=[];
  for(const id of ids) {try { const res=await fetch(`/api/admin/orders/${id}/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:reasons[id]})});const data=await res.json();if(!res.ok)errors.push(`${orders.find(o=>o.id===id)?.orderNumber}: ${data.error}`); }catch{errors.push('Connection failed');}}
  setMessage(errors.join('; ') || 'Updated successfully');setSelected([]);setBusy(false);router.refresh();
 }
 return <div className="space-y-4"><p role="status">{message}</p><button className="rounded bg-emerald-700 p-3 text-white disabled:opacity-50" disabled={busy||!selected.length} onClick={()=>review(selected,'confirm')}>Confirm selected ({selected.length})</button>{orders.length===0&&<p>No orders awaiting approval.</p>}{orders.map(o=><article key={o.id} className="rounded-xl border bg-white p-5 space-y-3"><label className="flex gap-3 font-bold"><input type="checkbox" checked={selected.includes(o.id)} onChange={e=>setSelected(e.target.checked?[...selected,o.id]:selected.filter(i=>i!==o.id))}/>{o.orderNumber} — {o.customerName}</label><p>{o.items}</p><p>{o.total} · Received {new Date(o.createdAt).toLocaleString()}{o.held?' · On hold':''}</p><label className="block">Rejection reason<input className="block w-full border rounded p-2" maxLength={1000} value={reasons[o.id]||''} onChange={e=>setReasons({...reasons,[o.id]:e.target.value})}/></label><div className="flex flex-wrap gap-3"><button disabled={busy} onClick={()=>review([o.id],'confirm')} className="bg-emerald-700 text-white rounded p-3">Confirm</button><button disabled={busy||!reasons[o.id]?.trim()} onClick={()=>review([o.id],'reject')} className="bg-red-700 text-white rounded p-3 disabled:opacity-50">Reject</button><button disabled={busy} onClick={()=>review([o.id],'hold')} className="border rounded p-3">Hold for review</button></div></article>)}</div>;
}
