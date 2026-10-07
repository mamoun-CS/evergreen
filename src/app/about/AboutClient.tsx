'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/components/layout/LanguageContext';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { ShieldCheck, Sprout, Truck, Headset, ChevronLeft, ArrowRight, FileText } from 'lucide-react';

export default function AboutClient() {
  const { lang, t } = useLanguage();
  const ar = lang === 'ar';
  const [cms, setCms] = React.useState<any>(null);

  React.useEffect(() => {
    fetch('/api/pages/about').then(res => res.ok ? res.json() : null).then(data => {
      if (data?.page) setCms(data.page);
    }).catch(console.error);
  }, []);

  const title = ar ? cms?.titleAr || t.nav.aboutUs : cms?.titleEn || t.nav.aboutUs;
  const content = ar
    ? cms?.contentAr || 'في Ever Green نختار مجموعة متنوعة من تحف وديكورات الحدائق التي تجمع بين الجمال والجودة، لنساعدك في تحويل المساحات الخارجية إلى أماكن أكثر أناقة وتميزًا.'
    : cms?.contentEn || 'At Ever Green, we offer a carefully selected collection of garden ornaments and outdoor decor that combines beauty and quality, helping you transform outdoor spaces into elegant and distinctive environments.';
  const Arrow = ar ? ChevronLeft : ArrowRight;

  const values = ar
    ? [
        { Icon: Sprout, title: 'تشكيلة واسعة', body: 'عائلات منتجات تغطي كل زاوية من مساحتك الخارجية: أواني الزرع، الديكور، العشب الصناعي، الأدوات الاحترافية والمزيد.' },
        { Icon: Truck, title: 'توصيل لجميع مناطق فلسطين', body: 'وصلنا بطلبك أينما كانت حديقتك، بخطط شحن واضحة ومعلَنة.' },
        { Icon: Headset, title: 'فريق خدمة عملاء', body: 'رد فوري عبر الهاتف أو نموذج التواصل على استفساراتك حول المنتجات والتوفر.' },
        { Icon: FileText, title: 'سياسات واضحة', body: 'شحن، استرجاع وخصوصية منشورة على الموقع وتنطبق على كل طلب.' },
      ]
    : [
        { Icon: Sprout, title: 'Wide selection', body: 'Product families covering every corner of your outdoor space: planters, decor, synthetic grass, professional tools and more.' },
        { Icon: Truck, title: 'Delivery across Palestine', body: 'Your order reaches your garden wherever it is, with clear published shipping plans.' },
        { Icon: Headset, title: 'Customer service team', body: 'Quick answers by phone or the contact form for any product or availability question.' },
        { Icon: FileText, title: 'Clear policies', body: 'Shipping, returns and privacy are published on the site and apply to every order.' },
      ];

  return (
    <div className="pb-14 pt-4 space-y-8">
      <div className="dg-about-hero" style={{ marginTop: 0 }}>
        <div className="dg-about-copy">
          <Breadcrumbs items={ar
            ? [{ label: 'الرئيسية', href: '/' }, { label: title }]
            : [{ label: 'Home', href: '/' }, { label: title }]} />
          <h1 className="mt-4">{title}</h1>
          <div className="dg-kicker"><Sprout aria-hidden="true" className="h-4 w-4" /> {ar ? 'Ever Green لتحف وديكورات الحدائق' : 'Ever Green Garden Ornaments & Outdoor Decor'}</div>
          <p>{content}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/shop" className="dg-btn dg-btn-dark">{ar ? 'تصفّح المتجر' : 'Browse the shop'} <Arrow aria-hidden="true" className="h-4 w-4" /></Link>
            <Link href="/contact" className="dg-btn dg-btn-light">{ar ? 'تواصل معنا' : 'Contact us'}</Link>
          </div>
        </div>
        <div className="dg-about-poster">
          <Image
            src={cms?.images?.[0] || '/images/background.png'}
            alt={title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 620px"
            className="object-cover"
          />
        </div>
      </div>

      <section aria-label={ar ? 'قيم الشركة' : 'Company values'}>
        <div className="dg-value-grid">
          {values.map(({ Icon, title: vTitle, body }) => (
            <div key={vTitle} className="dg-value-card">
              <i><Icon aria-hidden="true" /></i>
              <h3>{vTitle}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="dg-catalog">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <ShieldCheck aria-hidden="true" className="h-5 w-5 text-brand-gold" />
            <h2 className="text-base font-bold text-gray-900">{ar ? 'قصة الشركة' : 'Our story'}</h2>
          </div>
          <p className="pt-4 text-sm leading-loose text-gray-700 whitespace-pre-wrap">{content}</p>
        </div>
      </section>
    </div>
  );
}
