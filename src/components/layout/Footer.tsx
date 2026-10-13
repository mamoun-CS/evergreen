'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from './LanguageContext';
import { Phone, Mail, MapPin, ShieldCheck, Clock, MessageCircle, ExternalLink, Facebook, Instagram, Twitter, Youtube, Linkedin, Globe } from 'lucide-react';

type Family = { label: string; href: string };
type SocialLink = { platform: string; labelAr: string; labelEn: string; url: string; icon?: string | null };
type FooterNavItem = { id: string; labelAr: string; labelEn: string; url: string; order: number; parentId: string | null };
type RootCategory = { id: string; slug: string; nameAr: string; nameEn: string };

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
  whatsapp: MessageCircle,
};

export default function Footer({ settings = {} as any, socialLinks = [] as SocialLink[], footerNavItems = [] as FooterNavItem[], rootCategories = [] as RootCategory[] }: { settings?: any; socialLinks?: SocialLink[]; footerNavItems?: FooterNavItem[]; rootCategories?: RootCategory[] }) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const phone = settings.contactPhone || '0559401774';
  const email = settings.contactEmail || 'info@evergreen.ps';
  const whatsapp = settings.contactWhatsApp || '';

  // Build category links from root categories (dynamic from database)
  const families = rootCategories.length > 0
    ? rootCategories.map((cat) => ({
        label: ar ? cat.nameAr : cat.nameEn,
        href: `/category/${encodeURIComponent(cat.slug)}`,
      }))
    : [];

  // Build info links from footer navigation items (filter for non-category links)
  // We'll use items that don't look like category URLs
  const infoLinks = footerNavItems.filter((item) => 
    !item.parentId && !item.url.startsWith('/category/') && item.url !== '#'
  ).map((item) => ({
    label: ar ? item.labelAr : item.labelEn,
    href: item.url,
  }));

  // Default fallback info links if none configured
  const defaultInfoLinks = ar
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

  const info = infoLinks.length > 0 ? infoLinks : defaultInfoLinks;

  const getPlatformIcon = (platform: string) => {
    const Icon = platformIcons[platform.toLowerCase()];
    return Icon ? <Icon aria-hidden="true" className="h-4 w-4" /> : <Globe aria-hidden="true" className="h-4 w-4" />;
  };

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
          {socialLinks.length > 0 && (
            <div className="flex gap-3 mt-3" aria-label={ar ? 'تواصل اجتماعي' : 'Social media'}>
              {socialLinks.map((link) => (
                <a key={link.platform} href={link.url} target="_blank" rel="noopener noreferrer" className="dg-footer-badge" aria-label={ar ? link.labelAr : link.labelEn}>
                  {getPlatformIcon(link.platform)}
                </a>
              ))}
            </div>
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
          {settings.googleMapsUrl ? (
            <a href={settings.googleMapsUrl} target="_blank" rel="noopener noreferrer"><MapPin aria-hidden="true" />{ar ? 'الموقع على الخريطة' : 'Open in Google Maps'}</a>
          ) : null}
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
