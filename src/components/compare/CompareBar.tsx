'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { useCompare } from './CompareContext';
import { useLanguage } from '@/components/layout/LanguageContext';

export default function CompareBar() {
  const { items, remove, clear, notice } = useCompare();
  const { lang } = useLanguage();
  if (!items.length && !notice) return null;
  return <aside className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white p-3 shadow-xl" dir={lang === 'ar' ? 'rtl' : 'ltr'} aria-live="polite">
    {notice ? <p role="status" className="text-sm font-semibold text-amber-800">{notice}</p> : <><div className="flex flex-wrap gap-2">{items.map((item) => <span key={item.slug} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-950">{lang === 'ar' ? item.nameAr : item.nameEn}<button onClick={() => remove(item.slug)} aria-label={lang === 'ar' ? 'إزالة' : 'Remove'}><X className="h-3 w-3" /></button></span>)}</div><div className="flex items-center gap-2"><button onClick={clear} className="rounded px-2 py-2 text-xs font-bold text-slate-600">{lang === 'ar' ? 'مسح' : 'Clear'}</button><Link href="/compare" className="min-h-10 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-bold text-white">{lang === 'ar' ? `قارن (${items.length})` : `Compare (${items.length})`}</Link></div></>}
  </aside>;
}
