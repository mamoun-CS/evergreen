'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';
import { useLanguage } from './LanguageContext';

const STORAGE_KEY = 'evergreen_privacy_choice';

export default function CookieConsent() {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try { if (!localStorage.getItem(STORAGE_KEY)) setVisible(true); } catch { /* storage unavailable */ }
  }, []);

  if (!mounted || !visible) return null;

  const choose = (value: 'essential' | 'all') => {
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* ignore */ }
    setVisible(false);
  };

  return (
    <div className="dg-consent" role="region" aria-label={ar ? 'ملاحظة الخصوصية' : 'Privacy notice'}>
      <p>
        <Cookie aria-hidden="true" style={{ width: 14, height: 14, marginInlineEnd: 6, verticalAlign: -2 }} />
        {ar
          ? 'يخزّن هذا الموقع بيانات سلة التسوق، المفضلة ولغة العرض محلياً على جهازك فقط لتشغيل المتجر. لا نستخدم أدوات تتبع خارجية. '
          : 'This store saves your cart, wishlist and language preference locally on your device. No third-party tracking is used. '}
        <Link href="/policies/privacy">{ar ? 'سياسة الخصوصية' : 'Privacy policy'}</Link>
      </p>
      <div className="dg-consent-actions">
        <button type="button" className="dg-btn dg-btn-primary" onClick={() => choose('all')}>{ar ? 'حسناً، موافق' : 'Acknowledge'}</button>
        <button type="button" className="dg-btn dg-btn-light" onClick={() => choose('essential')}>{ar ? 'إغلاق' : 'Dismiss'}</button>
      </div>
    </div>
  );
}
