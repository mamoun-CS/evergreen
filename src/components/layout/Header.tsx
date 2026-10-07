'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import useSWR from 'swr';
import { usePathname } from 'next/navigation';
import { useLanguage } from './LanguageContext';
import { useCart } from '../cart/CartContext';
import { useWishlist } from '@/components/wishlist/WishlistContext';
import SearchAutocomplete from './SearchAutocomplete';
import CatalogMegaMenu from './CatalogMegaMenu';
import type { MegaCategory } from './CatalogMegaMenu';
import { Phone, Menu, X, UserRound, Truck, Heart, ShoppingCart, ChevronDown } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => (res.ok ? res.json() : { categories: [] }));

type NavItem = { label: string; href: string; optional?: boolean };

export default function Header({ settings = {} as any }: { settings?: any }) {
  const pathname = usePathname();
  const { lang, toggleLanguage } = useLanguage();
  const { cart, setIsCartOpen } = useCart();
  const wishlist = useWishlist();
  const [megaOpen, setMegaOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const ar = lang === 'ar';
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const phone = settings.contactPhone || '0559401774';

  const { data } = useSWR<{ categories: MegaCategory[] }>(drawerOpen ? '/api/categories' : null, fetcher, { revalidateOnFocus: false });
  const drawerCategories: MegaCategory[] = data?.categories ?? [];

  const navItems: NavItem[] = ar
    ? [
        { label: 'الرئيسية', href: '/' },
        { label: 'المتجر', href: '/shop' },
        { label: 'عروض خاصة', href: '/shop?discounted=true', optional: true },
        { label: 'أفكار ومشاريع', href: '/projects' },
        { label: 'من نحن', href: '/about' },
        { label: 'تواصل معنا', href: '/contact' },
      ]
    : [
        { label: 'Home', href: '/' },
        { label: 'Shop', href: '/shop' },
        { label: 'Offers', href: '/shop?discounted=true', optional: true },
        { label: 'Inspiration', href: '/projects' },
        { label: 'About us', href: '/about' },
        { label: 'Contact', href: '/contact' },
      ];
  const flagship: NavItem = ar
    ? { label: 'العشب الصناعي', href: '/shop?category=alashb-alsnaay' }
    : { label: 'Synthetic Grass', href: '/shop?category=alashb-alsnaay' };

  const isActive = (href: string) => (href === '/'
    ? pathname === '/'
    : pathname === href || (href === '/shop' && pathname.startsWith('/products')));

  useEffect(() => {
    setMegaOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMegaOpen(false); setDrawerOpen(false); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const navLink = (item: NavItem) => (
    <li key={item.href} className={item.optional ? 'dg-nav-optional' : undefined}>
      <Link href={item.href} className={isActive(item.href) ? 'active' : ''}>{item.label}</Link>
    </li>
  );

  return (
    <header className="eg-header">
      {/* 1 — customer service phone area */}
      <div className="dg-topbar">
        <div className="dg-container dg-topbar-in">
          <a className="dg-topbar-phone" href={`tel:${phone.replace(/\s/g, '')}`}>
            <Phone aria-hidden="true" />
            <span>{ar ? 'خدمة العملاء:' : 'Customer service:'}</span>
            <b dir="ltr">{phone}</b>
          </a>
          <span className="dg-topbar-delivery"><Truck aria-hidden="true" /> {ar ? 'توصيل إلى جميع مناطق فلسطين' : 'Delivery across Palestine'}</span>
        </div>
      </div>

      {/* 2 — centered brand masthead with search */}
      <div className="dg-masthead">
        <div className="dg-container dg-masthead-in">
          <div className="dg-quick">
            <Link href="/account" aria-label={ar ? 'حسابي' : 'My account'}>
              <UserRound aria-hidden="true" /><span className="dg-quick-label">{ar ? 'حسابي' : 'Account'}</span>
            </Link>
            <Link href="/account/wishlist" aria-label={ar ? 'قائمة الرغبات' : 'Wishlist'}>
              <Heart aria-hidden="true" /><span className="dg-quick-label">{ar ? 'المفضلة' : 'Wishlist'}</span>
              {wishlist.ids.length > 0 && <i>{wishlist.ids.length}</i>}
            </Link>
            <button type="button" onClick={() => setIsCartOpen(true)} aria-label={ar ? 'سلة التسوق' : 'Shopping cart'}>
              <ShoppingCart aria-hidden="true" />
              {cartCount > 0 && <i>{cartCount}</i>}
            </button>
            <button type="button" onClick={toggleLanguage} aria-label={ar ? 'Switch to English' : 'التبديل إلى العربية'}>
              <span className="dg-quick-label">{ar ? 'EN' : 'ع'}</span>
            </button>
          </div>
          <Link href="/" className="dg-logo" aria-label={settings.storeNameAr || 'Ever Green'}>
            <span className="dg-logo-mark">
              <Image src={settings.logoUrl || '/images/logo.jpg'} alt={ar ? 'Ever Green لتحف وديكورات الحدائق' : 'Ever Green Garden Ornaments'} fill priority sizes="(max-width:900px) 54px, 88px" />
            </span>
          </Link>
          <div className="dg-masthead-search">
            <SearchAutocomplete />
          </div>
        </div>
      </div>

      {/* 3 — dark horizontal navigation rail with catalog mega menu */}
      <nav className="dg-nav" aria-label={ar ? 'التنقل الرئيسي' : 'Main navigation'} onMouseLeave={() => setMegaOpen(false)}>
        <div className="dg-container dg-nav-in">
          <ul className="dg-nav-links">
            {navLink(navItems[0])}
            {navLink(navItems[1])}
            <li onMouseEnter={() => setMegaOpen(true)}>
              <button type="button" onClick={() => setMegaOpen((open) => !open)} aria-haspopup="true" aria-expanded={megaOpen} aria-controls="dg-catalog-mega">
                {ar ? 'الأقسام' : 'Categories'} <ChevronDown aria-hidden="true" style={megaOpen ? { transform: 'rotate(180deg)', transition: 'transform .18s' } : { transition: 'transform .18s' }} />
              </button>
              <span id="dg-catalog-mega">
                {megaOpen && <CatalogMegaMenu open onClose={() => setMegaOpen(false)} />}
              </span>
            </li>
            <li><Link href={flagship.href} className={isActive(flagship.href) ? 'active' : ''}>{flagship.label}</Link></li>
            {navItems.slice(2).map(navLink)}
          </ul>
          <div className="dg-mobile-tools">
            <button type="button" className="dg-menu" onClick={() => setDrawerOpen(true)} aria-label={ar ? 'فتح القائمة' : 'Open menu'} aria-expanded={drawerOpen}>
              <Menu aria-hidden="true" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="dg-drawer" role="dialog" aria-modal="true" aria-label={ar ? 'قائمة التنقل' : 'Navigation menu'}>
          <button type="button" className="dg-drawer-backdrop" aria-label={ar ? 'إغلاق' : 'Close'} onClick={() => setDrawerOpen(false)} style={{ cursor: 'default' }} />
          <div className="dg-drawer-panel" dir={ar ? 'rtl' : 'ltr'}>
            <div className="dg-drawer-head">
              <b>{ar ? 'Ever Green' : 'Ever Green'}</b>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label={ar ? 'إغلاق القائمة' : 'Close menu'}><X aria-hidden="true" /></button>
            </div>
            <div className="dg-drawer-body">
              <SearchAutocomplete compact />
              <nav className="mt-4">
                <ul className="dg-drawer-nav">
                  {navItems.slice(0, 2).map((item) => (
                    <li key={item.href}><Link href={item.href} onClick={() => setDrawerOpen(false)}>{item.label}</Link></li>
                  ))}
                  <li>
                    <button type="button" className="dg-drawer-catbtn" onClick={() => setCatsOpen((open) => !open)} aria-expanded={catsOpen}>
                      <span>{ar ? 'الأقسام' : 'Categories'}</span>
                      <ChevronDown aria-hidden="true" style={catsOpen ? { transform: 'rotate(180deg)' } : undefined} />
                    </button>
                  </li>
                  {catsOpen && (
                    <li>
                      <ul className="dg-drawer-catlist">
                        {drawerCategories.slice(0, 12).map((category) => (
                          <li key={category.id}>
                            <Link href={`/category/${encodeURIComponent(category.slug)}`} onClick={() => setDrawerOpen(false)}>
                              {ar ? category.nameAr : category.nameEn}
                            </Link>
                          </li>
                        ))}
                        <li><Link href="/category" onClick={() => setDrawerOpen(false)}>{ar ? 'كل الأقسام' : 'All categories'}</Link></li>
                      </ul>
                    </li>
                  )}
                  <li><Link href={flagship.href} onClick={() => setDrawerOpen(false)}>{flagship.label}</Link></li>
                  {navItems.slice(2).map((item) => (
                    <li key={item.href}><Link href={item.href} onClick={() => setDrawerOpen(false)}>{item.label}</Link></li>
                  ))}
                  <li><Link href="/account" onClick={() => setDrawerOpen(false)}>{ar ? 'حسابي' : 'My account'}</Link></li>
                  <li><Link href="/account/wishlist" onClick={() => setDrawerOpen(false)}>{ar ? 'قائمة الرغبات' : 'Wishlist'}</Link></li>
                </ul>
              </nav>
            </div>
            <div className="dg-drawer-foot">
              <a href={`tel:${phone.replace(/\s/g, '')}`} dir="ltr"><Phone aria-hidden="true" />{phone}</a>
              <button type="button" onClick={toggleLanguage} className="text-sm font-extrabold text-primary">
                {ar ? 'English' : 'عربي'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
