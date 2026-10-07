'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from './LanguageContext';
import { Phone, Mail, MapPin, ShieldCheck, Clock, MessageCircle, ExternalLink } from 'lucide-react';

type Family = { label: string; href: string };

export default function Footer({ settings = {} as any }: { settings?: any }) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const phone = settings.contactPhone || '0559401774';
  const email = settings.contactEmail || 'info@evergreen.ps';
  const whatsapp = settings.contactWhatsApp || '';

  const families: Family[] = ar
    ? [
        { label: 'العشب الصناعي', href: '/category/alashb-alsnaay' },
        { label: 'أسوار البامبو', href: '/category/aswar-alkhyzran' },
        { label: 'خلطات الزراعة', href: '/category/khltat-alzra' },
        { label: 'الري الغزيرات', href: '/category/mntjat-alry-mn-altytanywm' },
        { label: 'أدوات احترافية', href: '/category/aladwat-almhnya' },
        { label: 'حصى الأنهار', href: '/category/hsa-alnhr' },
        { label: 'التوف والأحجار', href: '/category/altwf-walahjar' },
        { label: 'المدرجات', href: '/category/almdrjat' },
        { label: 'أواني الزرع', href: '/category/planters' },
        { label: 'الديكور', href: '/category/decoration' },
      ]
    : [
        { label: 'Synthetic Grass', href: '/category/alashb-alsnaay' },
        { label: 'Bamboo Fences', href: '/category/aswar-alkhyzran' },
        { label: 'Planting Mixes', href: '/category/khltat-alzra' },
        { label: 'Irrigation Products', href: '/category/mntjat-alry-mn-altytanywm' },
        { label: 'Professional Tools', href: '/category/aladwat-almhnya' },
        { label: 'River Pebbles', href: '/category/hsa-alnhr' },
        { label: 'Tuff & Stepping Stones', href: '/category/altwf-walahjar' },
        { label: 'Terraces', href: '/category/almdrjat' },
        { label: 'Planters', href: '/category/planters' },
        { label: 'Decoration', href: '/category/decoration' },
      ];

  const info: Family[] = ar
    ? [
        { label: 'من نحن', href: '/about' },
        { label: 'أفكار ومشاريع', href: '/projects' },
        { label: 'مقارنة المنتجات', href: '/compare' },
        { label: 'سياسة الخصوصية', href: '/policies/privacy' },
        { label: 'سياسة الاسترجاع والاسترداد', href: '/policies/refunds' },
        { label: 'سياسة الشحن', href: '/policies/shipping' },
        { label: 'تواصل معنا', href: '/contact' },
      ]
    : [
        { label: 'About us', href: '/about' },
        { label: 'Inspiration & projects', href: '/projects' },
        { label: 'Compare products', href: '/compare' },
        { label: 'Privacy policy', href: '/policies/privacy' },
        { label: 'Return & refund policy', href: '/policies/refunds' },
        { label: 'Shipping policy', href: '/policies/shipping' },
        { label: 'Contact us', href: '/contact' },
      ];

  return (
    <footer className="eg-footer dg-footer">
      <div className="dg-footer-in">
        <div>
          <div className="dg-footer-brand">
            <span>
              <Image src={settings.logoUrl || '/images/logo.jpg'} alt={ar ? settings.storeNameAr || 'Ever Green' : settings.storeNameEn || 'Ever Green'} fill sizes="48px" className="object-contain" />
            </span>
            <b dir={ar ? 'rtl' : 'ltr'}>{ar ? settings.storeNameAr || 'Ever Green لتحف وديكورات الحدائق' : settings.storeNameEn || 'EVER GREEN Garden Ornaments & Outdoor Decor'}</b>
          </div>
          <p className="dg-footer-small">{ar ? settings.footerAboutAr : settings.footerAboutEn || settings.footerAboutAr}</p>
          <span className="dg-footer-badge"><ShieldCheck aria-hidden="true" /> {ar ? 'منتجات مختارة بعناية' : 'Carefully selected products'}</span>
          {whatsapp && (
            <a className="dg-footer-badge" href={`https://wa.me/${whatsapp.replace(/[^\d]/g, '')}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden="true" /> {ar ? 'واتساب: فريق الشركة' : 'WhatsApp: our team'}
            </a>
          )}
        </div>

        <nav aria-label={ar ? 'الأقسام' : 'Products'}>
          <h3>{ar ? 'الأقسام' : 'Products'}</h3>
          {families.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>

        <nav aria-label={ar ? 'معلومات المتجر' : 'Information'}>
          <h3>{ar ? 'معلومات' : 'Information'}</h3>
          {info.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>

        <div aria-label={ar ? 'تواصل معنا' : 'Contact'}>
          <h3>{ar ? 'تواصل معنا' : 'Contact'}</h3>
          <p className="dg-footer-small"><MapPin aria-hidden="true" />{ar ? settings.addressAr : settings.addressEn || settings.addressAr}</p>
          <a href={`tel:${phone.replace(/\s/g, '')}`}><Phone aria-hidden="true" /><span className="dg-footer-ltr">{phone}</span></a>
          <a href={`mailto:${email}`}><Mail aria-hidden="true" /><span className="dg-footer-ltr">{email}</span></a>
          {settings.businessHoursAr ? (
            <p className="dg-footer-small"><Clock aria-hidden="true" />{ar ? settings.businessHoursAr : settings.businessHoursEn || settings.businessHoursAr}</p>
          ) : null}
          <a href="/contact" className="mt-3 inline-flex items-center gap-2">
            {ar ? 'أرسل استفساراً' : 'Send an inquiry'} <ExternalLink aria-hidden="true" style={{ width: 13, height: 13 }} />
          </a>
        </div>
      </div>
      <div className="dg-footer-bottom">{ar ? settings.copyrightTextAr : settings.copyrightTextEn || settings.copyrightTextAr}</div>
    </footer>
  );
}
