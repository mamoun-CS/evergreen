import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/storefront';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: 'تواصل معنا | Ever Green',
  description: 'اتصل بفريق خدمة عملاء Ever Green عبر الهاتف أو البريد الإلكتروني أو نموذج الاستفسار المباشر — نخدم جميع مناطق فلسطين.',
  alternates: { canonical: '/contact' },
};

export default async function ContactPage() {
  const settings: any = await getSiteSettings();
  return <ContactClient settings={settings} />;
}
