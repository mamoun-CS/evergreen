import { requirePermission } from '@/lib/auth-middleware';
export default async function Layout({children}: {children:React.ReactNode}) { await requirePermission('read', 'product'); return <>{children}</>; }
