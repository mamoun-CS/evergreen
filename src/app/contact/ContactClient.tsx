'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/components/layout/LanguageContext';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { Phone, Mail, MapPin, Send, MessageCircle, Clock, Store } from 'lucide-react';

export default function ContactClient({ settings = {} as any }: { settings?: any }) {
  const { lang, t } = useLanguage();
  const ar = lang === 'ar';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [cms, setCms] = useState<any>(null);
  const supportPhone = settings.contactPhone || t.footer.phone;
  const supportEmail = settings.contactEmail || t.footer.email;
  const whatsapp = settings.contactWhatsApp || '';
  const businessHours = ar ? settings.businessHoursAr : settings.businessHoursEn || settings.businessHoursAr;

  React.useEffect(() => {
    fetch('/api/pages/contact').then(res => res.ok ? res.json() : null).then(data => {
      if (data?.page) setCms(data.page);
    }).catch(console.error);
  }, []);

  React.useEffect(() => {
    const productSlug = new URLSearchParams(window.location.search).get('product');
    if (!productSlug) return;
    fetch(`/api/products?slug=${encodeURIComponent(productSlug)}&limit=1`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const product = data?.products?.[0];
        if (!product) return;
        const productName = lang === 'ar' ? product.nameAr : product.nameEn;
        setMessage(lang === 'ar' ? `أرغب بمعرفة سعر المنتج: ${productName}` : `I would like to know the price of: ${productName}`);
      })
      .catch(() => undefined);
  }, [lang]);

  const title = ar ? cms?.titleAr || t.nav.contact : cms?.titleEn || t.nav.contact;
  const content = ar ? cms?.contentAr || 'يسعدنا تواصلك معنا.' : cms?.contentEn || 'We would love to hear from you.';

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState('sending');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message: phone ? `${message}\n${ar ? 'هاتف للتواصل' : 'Contact phone'}: ${phone}` : message }),
      });
      if (!response.ok) throw new Error('Contact request failed');
      setName(''); setEmail(''); setMessage(''); setPhone(''); setState('success');
      // The contact API persists name/email/message; the optional phone is
      // delivered inside the message body so no backend change is needed.
    } catch {
      setState('error');
    }
  };

  const channels = [
    { Icon: Phone, label: ar ? 'هاتف خدمة العملاء' : 'Customer service phone', value: String(supportPhone), href: `tel:${String(supportPhone).replace(/\s/g, '')}` },
    { Icon: Mail, label: ar ? 'البريد الإلكتروني' : 'Email', value: String(supportEmail), href: `mailto:${supportEmail}` },
    { Icon: MapPin, label: ar ? 'العنوان والموقع' : 'Location', value: ar ? settings.addressAr || t.footer.address : settings.addressEn || t.footer.address, href: null },
  ];

  return (
    <div className="pb-14 pt-4">
      <div className="dg-catalog">
        <Breadcrumbs items={ar
          ? [{ label: 'الرئيسية', href: '/' }, { label: title }]
          : [{ label: 'Home', href: '/' }, { label: title }]} />
        <header className="dg-titlebar">
          <p className="dg-kicker">{ar ? 'خدمة العملاء' : 'Customer service'}</p>
          <h1>{title}</h1>
          <p className="dg-lede">{content}</p>
        </header>
      </div>

      <div className="dg-contact-grid">
        <form onSubmit={submit} className="dg-form-card" aria-label={ar ? 'نموذج التواصل' : 'Contact form'}>
          <h2>{ar ? 'أرسل استفساراً مباشراً' : 'Send a direct inquiry'}</h2>
          <p>{ar ? 'نجيب عادة خلال ساعات العمل.' : 'We usually reply within business hours.'}</p>

          <div className="dg-field">
            <label className="dg-field-label" htmlFor="contact-name">{ar ? 'الاسم الكامل *' : 'Full name *'}</label>
            <input id="contact-name" type="text" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
          </div>

          <div className="dg-field">
            <label className="dg-field-label" htmlFor="contact-email">{ar ? 'البريد الإلكتروني *' : 'Email *'}</label>
            <input id="contact-email" type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" dir="ltr" />
          </div>

          <div className="dg-field">
            <label className="dg-field-label" htmlFor="contact-phone">{ar ? 'رقم الهاتف' : 'Phone'}</label>
            <input id="contact-phone" type="tel" maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" dir="ltr" placeholder="05…" />
          </div>

          <div className="dg-field">
            <label className="dg-field-label" htmlFor="contact-message">{ar ? 'الرسالة / الاستفسار *' : 'Message *'}</label>
            <textarea id="contact-message" rows={5} required maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} />
          </div>

          <button type="submit" disabled={state === 'sending'} className="dg-btn dg-btn-primary w-full">
            <Send aria-hidden="true" className="h-4 w-4" />
            <span>{state === 'sending' ? (ar ? 'جارٍ الإرسال...' : 'Sending...') : ar ? 'إرسال الاستفسار' : 'Send inquiry'}</span>
          </button>
          {state === 'success' && <p role="status" className="rounded bg-emerald-50 p-3 text-center text-emerald-800 text-sm font-bold">{ar ? 'تم إرسال استفسارك بنجاح، سنتواصل معك قريبًا.' : 'Your enquiry was sent successfully. We will contact you soon.'}</p>}
          {state === 'error' && <p role="alert" className="rounded bg-red-50 p-3 text-center text-red-700 text-sm font-bold">{ar ? 'تعذر إرسال الاستفسار. يرجى المحاولة لاحقًا.' : 'We could not send your enquiry. Please try again later.'}</p>}
        </form>

        <aside>
          <div className="dg-channel-card">
            <h2 className="!m-0 !border-b !border-gray-100 !pb-3 text-sm font-extrabold text-gray-900">{ar ? 'قنوات التواصل' : 'Contact channels'}</h2>
            <ul className="dg-channel-list mt-1">
              {channels.map(({ Icon, label, value, href }) => (
                <li key={label}>
                  <Icon aria-hidden="true" />
                  <span>
                    <small>{label}</small>
                    {href ? <a href={href} dir="auto">{value}</a> : <span dir="auto">{value}</span>}
                  </span>
                </li>
              ))}
            </ul>
            {whatsapp ? (
              <a className="dg-btn dg-btn-light mt-4" href={`https://wa.me/${String(whatsapp).replace(/[^\d]/g, '')}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden="true" className="h-4 w-4" /> {ar ? 'تواصل عبر واتساب' : 'Chat on WhatsApp'}
              </a>
            ) : null}
          </div>

          <div className="dg-channel-card mt-5">
            <div className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
              <Store aria-hidden="true" className="h-4 w-4 text-brand-gold" />
              <span>{ar ? 'تصفّح المتجر' : 'Browse the shop'}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              {ar ? 'أقسام المنتجات كلها قابلة للتصفح الآن: أواني الزرع، الديكور، العشب الصناعي، الأدوات الاحترافية والمزيد.' : 'All product families are open for browsing: planters, decor, synthetic grass, professional tools and more.'}
            </p>
            <a href="/shop" className="dg-btn dg-btn-dark mt-4">{ar ? 'فتح المتجر' : 'Open the shop'}</a>
          </div>

          <div className="dg-channel-card mt-5" aria-label={ar ? 'ساعات العمل' : 'Business hours'}>
            <div className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
              <Clock aria-hidden="true" className="h-4 w-4 text-brand-gold" />
              <span>{ar ? 'ساعات العمل' : 'Business hours'}</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">{businessHours || (ar ? 'أيام العمل: الأحد — الخميس.' : 'Working days: Sunday — Thursday.')}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
