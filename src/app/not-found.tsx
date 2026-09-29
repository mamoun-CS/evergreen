import Link from 'next/link';

export default function NotFound() {
  return <main dir="auto" className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
    <p className="text-sm font-bold text-emerald-700">404</p>
    <h1 className="text-2xl font-extrabold text-slate-900">الصفحة غير موجودة / Page not found</h1>
    <p className="text-sm text-slate-600">قد يكون الرابط قديماً أو غير صحيح. / This link may be outdated or incorrect.</p>
    <div className="flex gap-3"><Link className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-bold text-white" href="/">الرئيسية / Home</Link><Link className="rounded-lg border border-emerald-800 px-4 py-2 text-sm font-bold text-emerald-900" href="/shop">المتجر / Shop</Link></div>
  </main>;
}
