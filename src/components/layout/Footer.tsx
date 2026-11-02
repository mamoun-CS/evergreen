'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from './LanguageContext';
import { Phone, Mail, MapPin, ShieldCheck, Clock, MessageCircle, ExternalLink, Facebook, Instagram, Twitter, Youtube, Linkedin, Globe } from 'lucide-react';

type Family = { label: string; href: string };
type SocialLink = { platform: string; labelAr: string; labelEn: string; url: string; icon?: string | null };
type FooterNavItem = { id: string; labelAr: string; labelEn: string; url: string; order: number; parentId: string | null };
type RootCategory = { id: string; slug: string; nameAr: string; nameEn: string };

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
);

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
  whatsapp: MessageCircle,
  tiktok: TikTokIcon,
};

export default function Footer({ settings = {} as any, socialLinks = [] as SocialLink[], footerNavItems = [] as FooterNavItem[], rootCategories = [] as RootCategory[] }: { settings?: any; socialLinks?: SocialLink[]; footerNavItems?: FooterNavItem[]; rootCategories?: RootCategory[] }) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const phone = settings.contactPhone || '0597749188';
  const phone2 = '0559401774';
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
          <a href={`tel:${phone2}`}><Phone aria-hidden="true" /><span className="dg-footer-ltr">{phone2}</span></a>
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
