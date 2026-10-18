import ClaimOrderConfirmation from '@/components/account/ClaimOrderConfirmation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'تأكيد ملكية الطلب', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default function ClaimOrderPage() { return <ClaimOrderConfirmation />; }
