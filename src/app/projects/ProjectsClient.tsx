'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/components/layout/LanguageContext';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { ArrowLeft, ArrowRight, Store } from 'lucide-react';

interface ProjectsContent {
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  images: string[];
}

export default function ProjectsClient() {
  const { lang, t } = useLanguage();
  const ar = lang === 'ar';
  const Arrow = ar ? ArrowLeft : ArrowRight;
  const [page, setPage] = useState<ProjectsContent | null>(null);

  useEffect(() => {
    fetch('/api/pages/projects').then((response) => response.ok ? response.json() : null)
      .then((data) => setPage(data?.page || null)).catch(() => setPage(null));
  }, []);

  const title = (lang === 'ar' ? page?.titleAr : page?.titleEn) || t.nav.projects;
  const body = ar ? page?.contentAr : page?.contentEn;

  return <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
    <Breadcrumbs items={ar
      ? [{ label: 'الرئيسية', href: '/' }, { label: title }]
      : [{ label: 'Home', href: '/' }, { label: title }]} />
    <header className="dg-titlebar">
      <p className="dg-kicker">{ar ? 'أفكار لحدائق ومساحات خارجية' : 'Garden & balcony inspiration'}</p>
      <h1>{title}</h1>
      {body ? <p className="dg-lede">{body.split('\n')[0]}</p> : (
        <p className="dg-lede">{ar ? 'لكل مساحة خارجية قصة — استلهم الأفكار وشاهد المنتجات كما تُستخدم فعلياً.' : 'Every outdoor space has a story — draw inspiration and see products in real use.'}</p>
      )}
    </header>

    {page ? (
      <div className="mt-6 space-y-6">
        {page.images?.[0] && (
          <div className="relative h-[300px] sm:h-[460px] overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
            <Image src={page.images[0]} alt={title} fill sizes="100vw" className="object-cover" priority />
          </div>
        )}
        <div className="whitespace-pre-wrap rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 text-sm leading-8 text-gray-700 shadow-sm">{body}</div>
        <div className="dg-chiprow">
          <Link href="/shop" className="dg-chip"><Store aria-hidden="true" className="h-3.5 w-3.5" />{ar ? 'اطلع على منتجات المتجر' : 'Browse the catalog'} <Arrow aria-hidden="true" className="h-3.5 w-3.5" /></Link>
          <Link href="/contact" className="dg-chip">{ar ? 'شاركنا مشروعك' : 'Share your project'}</Link>
        </div>
      </div>
    ) : (
      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-8 text-sm text-gray-600 shadow-sm">
        <p>{ar ? 'سيتم نشر تفاصيل المشاريع هنا قريباً.' : 'Project details will be published here soon.'}</p>
        <div className="dg-chiprow">
          <Link className="dg-chip" href="/shop">{ar ? 'تصفّح المتجر' : 'Browse the shop'}</Link>
          <Link className="dg-chip" href="/contact">{t.nav.contactUsBtn}</Link>
        </div>
      </section>
    )}
  </main>;
}
