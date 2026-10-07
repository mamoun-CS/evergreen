'use client';

import Link from 'next/link';
import { Fragment } from 'react';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { useLanguage } from './LanguageContext';

export type Crumb = { label: string; href?: string };

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const { lang } = useLanguage();
  const Arrow = lang === 'ar' ? ChevronLeft : ChevronRight;
  return (
    <nav className="dg-crumbs" aria-label={lang === 'ar' ? 'مسار التنقل' : 'Breadcrumbs'}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <Fragment key={`${item.label}-${index}`}>
            <Link
              href={item.href ?? '#'}
              {...(isLast ? { 'aria-current': 'page' as const } : {})}
              {...(isLast && !item.href ? { 'aria-disabled': true, tabIndex: -1 } : {})}
            >
              {index === 0 ? <Home aria-hidden="true" className="dg-crumbs-sep" /> : null}
              {item.label}
            </Link>
            {!isLast && <Arrow aria-hidden="true" className="dg-crumbs-sep" />}
          </Fragment>
        );
      })}
    </nav>
  );
}
