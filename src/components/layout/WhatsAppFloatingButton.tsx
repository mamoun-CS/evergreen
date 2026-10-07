'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useLanguage } from './LanguageContext';

export default function WhatsAppFloatingButton({ phone }: { phone?: string | null }) {
  const { lang } = useLanguage();
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, '');
  return (
    <a
      className="dg-fab dg-fab-whatsapp"
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={lang === 'ar' ? 'تواصل عبر واتساب' : 'Chat on WhatsApp'}
    >
      <MessageCircle aria-hidden="true" />
    </a>
  );
}
