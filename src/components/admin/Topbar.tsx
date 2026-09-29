'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, ExternalLink, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';

export default function Topbar({ user }: { user: { name: string; role: string; email: string } }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <><header className="flex min-h-16 items-center justify-between border-b border-emerald-100 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={() => setMenuOpen(true)} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-700 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-700 lg:hidden" aria-label="فتح القائمة">
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-slate-900">أهلاً، {user.name}</p>
          <p className="hidden text-xs text-slate-500 sm:block">إدارة متجر Evergreen</p>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <Link href="/" target="_blank" className="flex min-h-11 items-center gap-2 rounded-lg px-2.5 text-sm font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 sm:px-3">
          <ExternalLink aria-hidden="true" className="h-4 w-4" /><span className="hidden sm:inline">عرض المتجر</span>
        </Link>
        <button type="button" onClick={handleLogout} className="flex min-h-11 items-center gap-2 rounded-lg px-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-700 sm:px-3">
          <LogOut aria-hidden="true" className="h-4 w-4" /><span className="hidden sm:inline">خروج</span>
        </button>
      </div>
    </header>{menuOpen && <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="قائمة الإدارة"><button type="button" className="absolute inset-0 bg-slate-950/45" onClick={() => setMenuOpen(false)} aria-label="إغلاق القائمة" /><div className="relative h-full w-72 shadow-2xl"><Sidebar role={user.role} onClose={() => setMenuOpen(false)} /></div></div>}</>
  );
}
