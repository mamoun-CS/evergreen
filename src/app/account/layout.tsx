import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import Link from 'next/link';
import { User, Package, Settings, LayoutDashboard, Heart } from 'lucide-react';
import LogoutButton from '@/components/account/LogoutButton';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <aside className="md:col-span-1">
            <nav className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 border-b border-slate-100 pb-4">
                <p className="font-bold text-slate-900">{user.name}</p>
                <p className="text-sm text-slate-500">{user.email}</p>
                {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
                  <span className="inline-block mt-2 rounded bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                    {user.role === 'ADMIN' ? 'مدير النظام' : 'مدير'}
                  </span>
                )}
              </div>
              <Link href="/account" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-700">
                <User className="h-5 w-5" /> نظرة عامة
              </Link>
              
              {(user.role === 'ADMIN' || user.role === 'MANAGER' || user.role === 'SUPER_ADMIN') && (
                <Link href={user.role === 'MANAGER' ? '/admin/orders' : '/admin'} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100">
                  <LayoutDashboard className="h-5 w-5" /> لوحة التحكم للإدارة
                </Link>
              )}
              <Link href="/account/orders" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-700"><Package className="h-5 w-5" /> طلباتي</Link>
              {/* Wishlist APIs intentionally authorize customer accounts only. Keep the link aligned with that policy. */}
              {user.role === 'CUSTOMER' && <Link href="/account/wishlist" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-700"><Heart className="h-5 w-5" /> المفضلة</Link>}

              <Link href="/account/profile" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-700">
                <Settings className="h-5 w-5" /> إعدادات الحساب
              </Link>
              <LogoutButton />
            </nav>
          </aside>
          <main className="md:col-span-3">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
