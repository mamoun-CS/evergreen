export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'CUSTOMER';
/**
 * Super Admin is the general manager/security owner. Admin is an operational
 * administrator. Manager is deliberately limited to read-only order/customer work.
 * New admin routes must be added to pageResource instead of falling back to settings.
 */
const operationalResources = new Set(['dashboard', 'product', 'category', 'application', 'brand', 'productVariant', 'specification', 'order', 'customer', 'coupon', 'contactInquiry', 'payment', 'review', 'upload', 'shipping', 'inventory', 'alert', 'recoveryCampaign']);
export function canAccess(user: { role: string }, action: string, resource: string): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'MANAGER') return action === 'read' && ['order', 'customer'].includes(resource);
  return user.role === 'ADMIN' && operationalResources.has(resource) && !['deleteMany', 'updateMany'].includes(action);
}
export function pageResource(path: string) {
  const segment = path.split('/')[2] || '';
  if (!segment) return 'dashboard';
  return ({
    orders: 'order', customers: 'customer', products: 'product', categories: 'category', applications: 'application', brands: 'brand', coupons: 'coupon', messages: 'contactInquiry', payments: 'payment', reviews: 'review',
    shipping: 'shipping', inventory: 'inventory', alerts: 'alert', 'recovery-campaigns': 'recoveryCampaign',
    settings: 'settings', content: 'content', 'audit-logs': 'auditLog', 'email-logs': 'emailLog', 'login-attempts': 'loginAttempt', admins: 'admins',
  } as Record<string, string>)[segment] || 'unknown';
}
