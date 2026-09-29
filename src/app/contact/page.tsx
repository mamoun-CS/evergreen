'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/components/layout/LanguageContext';
import { Phone, Mail, MapPin, Send } from 'lucide-react';

export default function ContactPage() {
  const { lang, t } = useLanguage();
  const ar = lang === 'ar';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [cms, setCms] = useState<any>(null);
  
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
        body: JSON.stringify({ name, email, message }),
      });
      if (!response.ok) throw new Error('Contact request failed');
      setName(''); setEmail(''); setMessage(''); setState('success');
    } catch {
      setState('error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8 pb-12">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-extrabold text-gray-900">
          {title}
        </h1>
        {cms?.contentAr && cms?.contentEn && (
          <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{content}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
          <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
            معلومات الاتصال المباشر
          </h2>

          <ul className="space-y-4 text-xs">
            <li className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-brand-gold flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-gray-900 block">العنوان والموقع:</span>
                <span className="text-gray-600">{t.footer.address}</span>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-brand-gold flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-gray-900 block">الهاتف المباشر / الواتساب:</span>
                <span className="text-gray-600 dir-ltr inline-block">{t.footer.phone}</span>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-brand-gold flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-gray-900 block">البريد الإلكتروني:</span>
                <a href={`mailto:${t.footer.email}`} className="text-gray-600 hover:text-brand-navy cursor-pointer transition-colors">
                  {t.footer.email}
                </a>
              </div>
            </li>
          </ul>
        </div>

        <form onSubmit={submit} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4 text-xs">
          <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
            إرسال استفسار مباشر
          </h2>

          <div>
            <label className="block font-bold text-gray-700 mb-1">الاسم الكامل *</label>
            <input type="text" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-navy focus:outline-none" />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">البريد الإلكتروني *</label>
            <input type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-navy focus:outline-none" />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">الرسالة / الاستفسار *</label>
            <textarea rows={4} required maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-navy focus:outline-none" />
          </div>

          <button type="submit" disabled={state === 'sending'} className="w-full py-2.5 bg-brand-navy text-white font-bold rounded hover:bg-slate-800 disabled:opacity-60 flex items-center justify-center gap-2">
            <Send className="w-4 h-4 text-brand-gold" />
            <span>{state === 'sending' ? 'جارٍ الإرسال...' : 'إرسال الاستفسار'}</span>
          </button>
          {state === 'success' && <p role="status" className="rounded bg-emerald-50 p-2 text-emerald-800">{lang === 'ar' ? 'تم إرسال استفسارك بنجاح، سنتواصل معك قريبًا.' : 'Your enquiry was sent successfully. We will contact you soon.'}</p>}
          {state === 'error' && <p role="alert" className="rounded bg-red-50 p-2 text-red-700">{lang === 'ar' ? 'تعذر إرسال الاستفسار. يرجى المحاولة لاحقًا.' : 'We could not send your enquiry. Please try again later.'}</p>}
        </form>
      </div>
    </div>
  );
}
