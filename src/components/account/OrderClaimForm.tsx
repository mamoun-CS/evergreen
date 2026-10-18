'use client';
import { FormEvent, useState } from 'react';

export default function OrderClaimForm() {
  const [orderNumber, setOrderNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderNumber.trim())}/claim-account`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request' }), cache: 'no-store',
      });
      const data = await response.json();
      setMessage(response.ok ? data.message : data.error || 'تعذر إرسال الطلب. حاول لاحقًا.');
    } catch { setMessage('تعذر إرسال الطلب. حاول لاحقًا. / Unable to send. Try later.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mb-6 space-y-3 rounded-lg border border-slate-200 p-4">
    <h2 className="font-bold">ربط طلب سابق / Link a guest order</h2>
    <p className="text-sm text-slate-600">أدخل رقم طلبك السابق. يلزم تأكيد من بريد الطلب قبل ظهوره في حسابك.</p>
    <label className="block text-sm font-semibold" htmlFor="claim-order-number">رقم الطلب / Order number</label>
    <input id="claim-order-number" required maxLength={100} pattern="[A-Za-z0-9_-]+" value={orderNumber} onChange={event => setOrderNumber(event.target.value)} className="min-h-11 w-full rounded border border-slate-300 px-3" dir="ltr" />
    <button disabled={busy} className="min-h-11 rounded bg-emerald-800 px-4 text-sm font-bold text-white disabled:opacity-60">{busy ? 'جارٍ الإرسال…' : 'إرسال رابط التحقق / Send verification link'}</button>
    {message && <p role="status" className="text-sm">{message}</p>}
  </form>;
}
