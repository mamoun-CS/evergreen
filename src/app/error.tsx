'use client';

import Link from 'next/link';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main dir="auto" className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
    <h1 className="text-2xl font-extrabold text-slate-900">حدث خطأ غير متوقع / Something went wrong</h1>
    <p className="text-sm text-slate-600">يرجى المحاولة مرة أخرى. / Please try again.</p>
    <div className="flex flex-wrap justify-center gap-3"><button onClick={reset} className="min-h-11 rounded-lg bg-emerald-800 px-4 text-sm font-bold text-white">إعادة المحاولة / Try again</button><Link className="min-h-11 rounded-lg border border-emerald-800 px-4 py-2 text-sm font-bold text-emerald-900" href="/">الرئيسية / Home</Link><Link className="min-h-11 rounded-lg border border-emerald-800 px-4 py-2 text-sm font-bold text-emerald-900" href="/shop">المتجر / Shop</Link></div>
  </main>;
}
