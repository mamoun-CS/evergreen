'use client';

import { FormEvent, useState } from 'react';
import { LockKeyhole, Leaf } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/components/cart/CartContext';

export default function LoginPage() {
  const router = useRouter();
  const { syncCart } = useCart();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(''); setLoading(true);
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Unable to sign in.');
      }
      const data = await response.json();
      await syncCart();
      if (data.redirectUrl) {
        router.replace(data.redirectUrl);
      } else {
        router.replace('/');
      }
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return <main className="min-h-[65vh] flex items-center justify-center bg-emerald-50 px-4 py-12 sm:py-20"><section className="mx-auto w-full max-w-md rounded-2xl border border-emerald-100 bg-white p-6 shadow-xl shadow-emerald-950/10 sm:p-8">
    <div className="mb-7 text-center"><div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-800"><Leaf aria-hidden="true" /></div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Ever Green</p><h1 className="mt-2 text-2xl font-extrabold text-slate-900">تسجيل الدخول</h1><p className="mt-2 text-sm leading-6 text-slate-600">الرجاء إدخال بياناتك للمتابعة.</p></div>
    <form onSubmit={submit} className="space-y-4">
      <div><label htmlFor="email" className="mb-1.5 block text-sm font-bold text-slate-800">البريد الإلكتروني</label><input id="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200" /></div>
      <div><label htmlFor="password" className="mb-1.5 block text-sm font-bold text-slate-800">كلمة المرور</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200" /></div>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={loading} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-bold text-white transition hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"><LockKeyhole aria-hidden="true" className="h-4 w-4" />{loading ? 'جارٍ الدخول...' : 'تسجيل الدخول'}</button>
    </form><p className="mt-5 text-center text-sm text-slate-600"><Link href="/forgot-password" className="font-bold text-emerald-700 hover:underline">نسيت كلمة المرور؟</Link></p><p className="mt-2 text-center text-sm text-slate-600">ليس لديك حساب؟ <Link href="/register" className="font-bold text-emerald-700 hover:underline">أنشئ حسابًا</Link></p>
  </section></main>;
}
