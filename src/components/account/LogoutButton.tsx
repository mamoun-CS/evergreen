'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/cart/CartContext';

export default function LogoutButton() {
  const router = useRouter();
  const { clearCart } = useCart();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    clearCart();
    router.replace('/login');
    router.refresh();
  }

  return <button onClick={logout} className="mt-4 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-right text-sm font-medium text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"><LogOut aria-hidden="true" className="h-5 w-5" />تسجيل الخروج</button>;
}
