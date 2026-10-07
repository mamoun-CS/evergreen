'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from './LanguageContext';

type Suggestion = { id: string; slug: string; sku?: string | null; nameEn: string; nameAr: string; images: string[] };

export function productImageSrc(image?: string | null) {
  if (!image) return '/images/logo.jpg';
  return image.startsWith('/uploads/products/evg-product-') ? image.replace('/uploads/products/', '/products/') : image;
}

export default function SearchAutocomplete({ autoFocusFlag = false, compact = false }: { autoFocusFlag?: boolean; compact?: boolean }) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputId = React.useId();

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) { setItems([]); setOpen(false); return; }
    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      fetch(`/api/products?search=${encodeURIComponent(term)}&limit=6`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : { products: [] }))
        .then((data) => { setItems((data.products || []) as Suggestion[]); setOpen(true); setActiveIndex(-1); })
        .catch(() => { /* canceled or network error: keep silent */ });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    if (term) { setOpen(false); window.location.href = `/shop?search=${encodeURIComponent(term)}`; }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') { setOpen(false); return; }
    if (event.key === 'ArrowDown' && items.length) { event.preventDefault(); setActiveIndex((i) => Math.min(i + 1, items.length - 1)); }
    if (event.key === 'ArrowUp' && items.length) { event.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
  };

  return (
    <div ref={boxRef} className="dg-search" style={compact ? { height: 46 } : undefined}>
      <form className="flex flex-1 items-center" role="search" onSubmit={submit}>
        <input
          id={'q' + inputId}
          autoFocus={autoFocusFlag}
          type="search"
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls={'list' + inputId}
          aria-activedescendant={activeIndex >= 0 && items[activeIndex] ? 'opt' + inputId + items[activeIndex].id : undefined}
          aria-label={ar ? 'ابحث باسم المنتج أو الكود' : 'Search by product name or SKU'}
          placeholder={ar ? 'ابحث باسم المنتج أو الكود...' : 'Search by product name or SKU...'}
          value={query}
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && items.length && setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <button type="submit" aria-label={ar ? 'بحث' : 'Search'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        </button>
      </form>
      {open && (
        <div className="dg-suggest" role="presentation">
          {items.length > 0 ? (
            <ul id={'list' + inputId} role="listbox">
              {items.map((item, index) => (
                <li key={item.id} role="option" aria-selected={index === activeIndex} id={'opt' + inputId + item.id}>
                  <Link href={`/products/${item.slug}`} onClick={() => setOpen(false)}>
                    <span className="dg-suggest-thumb">
                      <Image src={productImageSrc(item.images?.[0])} alt="" fill sizes="42px" />
                    </span>
                    <span>
                      <b>{ar ? item.nameAr : item.nameEn}</b>
                      {item.sku ? <small dir="ltr">{item.sku}</small> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul><li role="option" aria-selected={false} className="px-3 py-2 text-xs text-gray-600">{ar ? 'لا نتائج مطابقة' : 'No matches found'}</li></ul>
          )}
          {query.trim().length >= 2 && (
            <Link className="dg-suggest-foot" href={`/shop?search=${encodeURIComponent(query.trim())}`} onClick={() => setOpen(false)}>
              {ar ? `عرض كل النتائج لـ «${query.trim()}»` : `View all results for “${query.trim()}”`}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
