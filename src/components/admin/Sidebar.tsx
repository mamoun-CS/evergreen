'use client';

import { canAccess, pageResource } from '@/lib/rbac';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, ClipboardList, CreditCard, FileText, Globe, LayoutDashboard, Megaphone, MessageSquare, Package, Search, Settings, ShoppingBag, Tags, Ticket, Truck, Users, X } from 'lucide-react';

const groups = [
  { label: 'الرئيسية', items: [{ name: 'نظرة عامة', href: '/admin', icon: LayoutDashboard }] },
  { label: 'متابعة المبيعات', items: [{ name: 'COD approvals', href: '/admin/orders/pending', icon: ClipboardList }, { name: 'الطلبات', href: '/admin/orders', icon: ShoppingBag }, { name: 'المدفوعات', href: '/admin/payments', icon: CreditCard }, { name: 'العملاء', href: '/admin/customers', icon: Users }, { name: 'Abandoned Carts', href: '/admin/recovery-campaigns', icon: ShoppingBag }, { name: 'الرسائل', href: '/admin/messages', icon: MessageSquare }] },
  { label: 'إدارة المتجر', items: [{ name: 'المنتجات', href: '/admin/products', icon: Package }, { name: 'تقييمات المنتجات', href: '/admin/reviews', icon: MessageSquare }, { name: 'الأقسام', href: '/admin/categories', icon: Box }, { name: 'العلامات التجارية', href: '/admin/brands', icon: Tags }, { name: 'الشحن والاستلام', href: '/admin/shipping', icon: Truck }, { name: 'كوبونات الخصم', href: '/admin/coupons', icon: Ticket }, { name: 'Inventory Logs', href: '/admin/inventory', icon: ClipboardList }, { name: 'Alerts', href: '/admin/alerts', icon: FileText }] },
  { label: 'الموقع', items: [{ name: 'محتوى الصفحة الرئيسية', href: '/admin/content/home', icon: LayoutDashboard }, { name: 'الشريط الإعلاني', href: '/admin/content/announcement-bar', icon: Megaphone }, { name: 'البنرات', href: '/admin/content/banners', icon: Globe }, { name: 'روابط التواصل الاجتماعي', href: '/admin/content/social-links', icon: Globe }, { name: 'التنقل', href: '/admin/content/navigation', icon: LayoutDashboard }, { name: 'الصفحات (من نحن، تواصل، مشاريع)', href: '/admin/content/about', icon: FileText }, { name: 'السياسات', href: '/admin/content/policies', icon: FileText }, { name: 'إدارة السيو (SEO)', href: '/admin/content/seo', icon: Search }, { name: 'الإعدادات', href: '/admin/settings', icon: Settings }] },
];

export default function Sidebar({ onClose, role }: { onClose?: () => void; role: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-72 flex-col bg-emerald-950 text-white" aria-label="التنقل الإداري">
      <div className="flex h-20 items-center justify-between border-b border-emerald-900 px-6"><div><p className="text-lg font-extrabold tracking-wide text-white">EVER GREEN</p><p className="mt-0.5 text-xs text-emerald-300">إدارة المتجر</p></div>{onClose && <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-lg text-emerald-100 hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-white lg:hidden" aria-label="إغلاق القائمة"><X aria-hidden="true" className="h-5 w-5" /></button>}</div>
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {groups.map((group) => <section key={group.label} className="mb-6"><h2 className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-400">{group.label}</h2><div className="space-y-1">{group.items.filter(item=>canAccess({role},'read',pageResource(item.href))).map((item) => { const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`)); return <Link key={item.href} href={item.href} onClick={onClose} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-white ${active ? 'bg-emerald-700 text-white shadow-sm' : 'text-emerald-100 hover:bg-emerald-900 hover:text-white'}`}><item.icon aria-hidden="true" className="h-5 w-5 shrink-0" />{item.name}</Link>; })}</div></section>)}
      </nav>
    </aside>
  );
}
