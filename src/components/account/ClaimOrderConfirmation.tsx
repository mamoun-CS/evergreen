'use client';
import { useEffect, useRef, useState } from 'react';

export default function ClaimOrderConfirmation() {
  const credentials = useRef<{ orderNumber: string; token: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const orderNumber = fragment.get('order'); const token = fragment.get('token');
    window.history.replaceState(null, '', '/claim-order');
    if (orderNumber && /^[A-Za-z0-9_-]{1,100}$/.test(orderNumber) && token && /^[A-Za-z0-9_-]{43}$/.test(token)) credentials.current = { orderNumber, token };
    setReady(credentials.current !== null);
  }, []);
  async function confirm() {
    if (!credentials.current) return;
    setBusy(true); setMessage('');
    try {
      const { orderNumber, token } = credentials.current;
      const response = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}/claim-account`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'confirm', token }), cache: 'no-store',
      });
      const data = await response.json();
      if (response.ok) { credentials.current = null; window.location.assign('/account/orders'); return; }
      setMessage(data.error || 'تعذر تأكيد الطلب. / Unable to confirm.');
    } catch { setMessage('تعذر تأكيد الطلب. حاول لاحقًا. / Unable to confirm. Try later.'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-xl space-y-4 px-4 py-12" dir="rtl">
    <h1 className="text-2xl font-bold">تأكيد ملكية الطلب / Confirm order ownership</h1>
    <p>سجّل الدخول بالحساب الذي طلب الرابط، ثم اضغط تأكيد. فتح الرابط وحده لا يربط الطلب.</p>
    <a href="/login" target="_blank" rel="noopener noreferrer" className="block font-bold text-emerald-800 underline">تسجيل الدخول في تبويب آخر / Sign in in another tab</a>
    <button disabled={!ready || busy} onClick={confirm} className="min-h-11 rounded bg-emerald-800 px-5 font-bold text-white disabled:opacity-50">{busy ? 'جارٍ التأكيد…' : 'تأكيد ربط الطلب / Confirm claim'}</button>
    {!ready && <p>افتح رابط التحقق من البريد. / Open the verification link from your email.</p>}
    {message && <p role="status">{message}</p>}
    <a href="/account/orders" className="block underline">طلباتي وطلب رابط جديد / My orders and request a new link</a>
  </main>;
}
