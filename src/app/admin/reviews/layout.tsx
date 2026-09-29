import { requirePermission } from '@/lib/auth-middleware';
export default async function ReviewsLayout({ children }: { children: React.ReactNode }) {
  await requirePermission('read', 'review');
  return <>{children}</>;
}
