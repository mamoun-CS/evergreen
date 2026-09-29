export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'CUSTOMER';
const managed = new Set(['dashboard', 'product', 'category', 'application', 'brand', 'productVariant', 'specification', 'order', 'customer', 'coupon', 'contactInquiry', 'payment', 'review', 'upload']);
export function canAccess(user: { role: string }, action: string, resource: string): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'MANAGER') return action === 'read' && ['order', 'customer'].includes(resource);
  return user.role === 'ADMIN' && managed.has(resource) && !['deleteMany', 'updateMany'].includes(action);
}
export function pageResource(path: string) {
  const segment = path.split('/')[2] || '';
  if (!segment) return 'dashboard';
  return ({ orders: 'order', customers: 'customer', products: 'product', categories: 'category', applications: 'application', brands: 'brand', coupons: 'coupon', messages: 'contactInquiry', payments: 'payment', reviews: 'review' } as Record<string, string>)[segment] || 'settings';
}
