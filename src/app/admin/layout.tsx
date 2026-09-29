import AdminFormValidation from '@/components/admin/AdminFormValidation';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import Sidebar from '@/components/admin/Sidebar';
import Topbar from '@/components/admin/Topbar';
import AdminChrome from '@/components/admin/AdminChrome';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AdminChrome /><AdminFormValidation />
      <div className="hidden lg:block lg:flex-shrink-0">
        <Sidebar role={user.role} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={{ name: user.name, role: user.role, email: user.email }} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
