'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Language, Direction, translations } from '@/lib/i18n';

interface LanguageContextType {
  lang: Language;
  dir: Direction;
  t: typeof translations['ar'];
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('ar');
  const [dir, setDirState] = useState<Direction>('rtl');

  useEffect(() => {
    const syncDocument = (language: Language) => {
      const direction = language === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.dir = direction;
      document.documentElement.lang = language;
      document.documentElement.dataset.locale = language;
    };
    const savedLang = localStorage.getItem('evergreen_lang') as Language;
    if (savedLang === 'en' || savedLang === 'ar') {
      setLangState(savedLang);
      setDirState(savedLang === 'ar' ? 'rtl' : 'ltr');
      syncDocument(savedLang);
    } else {
      syncDocument('ar');
    }
  }, []);

  const setLanguage = (newLang: Language) => {
    setLangState(newLang);
    const newDir = newLang === 'ar' ? 'rtl' : 'ltr';
    setDirState(newDir);
    localStorage.setItem('evergreen_lang', newLang);
    document.documentElement.dir = newDir;
    document.documentElement.lang = newLang;
    document.documentElement.dataset.locale = newLang;
  };

  const toggleLanguage = () => {
    setLanguage(lang === 'ar' ? 'en' : 'ar');
  };

  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, dir, t, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
