'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Accessibility, X } from 'lucide-react';
import { useLanguage } from './LanguageContext';

type Prefs = { large: boolean; links: boolean; contrast: boolean; noanim: boolean };
const STORAGE_KEY = 'evergreen_a11y';

function apply(prefs: Prefs) {
  const root = document.documentElement;
  root.classList.toggle('eg-a11y-lg', prefs.large);
  root.classList.toggle('eg-a11y-links', prefs.links);
  root.classList.toggle('eg-a11y-contrast', prefs.contrast);
  root.classList.toggle('eg-a11y-noanim', prefs.noanim);
}

export default function AccessibilityToolbar() {
  const { lang, dir } = useLanguage();
  const ar = lang === 'ar';
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ large: false, links: false, contrast: false, noanim: false });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Prefs;
        setPrefs(parsed);
        apply(parsed);
      }
    } catch { /* ignore corrupt storage */ }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const update = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    apply(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  };

  const toggle = (key: keyof Prefs) => (
    <div className="dg-a11y-row">
      <span>{ar ? { large: 'تكبير الخط', links: 'إبراز الروابط', contrast: 'تباين عالٍ', noanim: 'إيقاف الحركة' }[key] : { large: 'Larger text', links: 'Underline links', contrast: 'High contrast', noanim: 'Stop animations' }[key]}</span>
      <button
        type="button"
        aria-pressed={prefs[key]}
        onClick={() => update({ [key]: !prefs[key] } as Partial<Prefs>)}
        aria-label={ar ? `تبديل: ${key}` : `Toggle: ${key}`}
      >
        {ar ? { large: 'أ', links: 'ر', contrast: 'ت', noanim: 'ح' }[key] : { large: 'A+', links: 'U', contrast: 'C', noanim: 'M' }[key]}
      </button>
    </div>
  );

  return (
    <>
      <button
        type="button"
        className="dg-a11y-fab"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="eg-a11y-panel"
        aria-label={ar ? 'إعدادات إمكانية الوصول' : 'Accessibility settings'}
      >
        <Accessibility aria-hidden="true" />
      </button>
      {open && (
        <div ref={panelRef} id="eg-a11y-panel" className="dg-a11y-panel" role="dialog" aria-modal="true" aria-label={ar ? 'أدوات إمكانية الوصول' : 'Accessibility tools'} tabIndex={-1} dir={dir}>
          <div className="dg-a11y-head">
            <span>{ar ? 'إمكانية الوصول' : 'Accessibility'}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label={ar ? 'إغلاق' : 'Close'}><X aria-hidden="true" /></button>
          </div>
          <div className="dg-a11y-body">
            {toggle('large')}
            {toggle('links')}
            {toggle('contrast')}
            {toggle('noanim')}
            <button
              type="button"
              className="dg-btn dg-btn-light mt-4 w-full"
              onClick={() => { const reset = { large: false, links: false, contrast: false, noanim: false }; setPrefs(reset); apply(reset); try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } }}
            >
              {ar ? 'إعادة تعيين' : 'Reset all'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
