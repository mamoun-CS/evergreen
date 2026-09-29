'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/layout/LanguageContext';

interface ProjectsContent {
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  images: string[];
}

export default function ProjectsPage() {
  const { lang, t } = useLanguage();
  const [page, setPage] = useState<ProjectsContent | null>(null);

  useEffect(() => {
    fetch('/api/pages/projects').then((response) => response.ok ? response.json() : null)
      .then((data) => setPage(data?.page || null)).catch(() => setPage(null));
  }, []);

  return <main className="mx-auto max-w-7xl space-y-6 px-4 py-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <header className="border-b border-gray-200 pb-4">
      <h1 className="text-2xl font-extrabold text-gray-900">{(lang === 'ar' ? page?.titleAr : page?.titleEn) || t.nav.projects}</h1>
    </header>
    {page ? <>
      {page.images?.[0] && <img src={page.images[0]} alt={(lang === 'ar' ? page.titleAr : page.titleEn)} className="max-h-[460px] w-full rounded-2xl object-cover" />}
      <div className="whitespace-pre-wrap text-sm leading-8 text-gray-700">{lang === 'ar' ? page.contentAr : page.contentEn}</div>
    </> : <section className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
      <p>{lang === 'ar' ? 'سيتم نشر تفاصيل المشاريع هنا قريباً.' : 'Project details will be published here soon.'}</p>
      <Link className="mt-4 inline-flex rounded-lg bg-brand-dark px-4 py-2 font-bold text-white" href="/contact">{t.nav.contactUsBtn}</Link>
    </section>}
  </main>;
}
