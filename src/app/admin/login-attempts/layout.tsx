import { requirePermission } from '@/lib/auth-middleware';
export default async function Layout({children}: {children:React.ReactNode}) { await requirePermission('read', 'settings'); return <>{children}</>; }
