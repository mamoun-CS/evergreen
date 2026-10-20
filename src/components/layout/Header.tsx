'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useLanguage } from './LanguageContext';
import { useCart } from '../cart/CartContext';
import { useWishlist } from '@/components/wishlist/WishlistContext';
import { useAuth } from '@/components/auth/AuthContext';
import SearchAutocomplete from './SearchAutocomplete';
import CatalogMegaMenu from './CatalogMegaMenu';
import type { MegaCategory } from './CatalogMegaMenu';
import { Phone, Menu, X, UserRound, BadgeCheck, Truck, Heart, ShoppingCart, ChevronDown, Megaphone, X as XIcon } from 'lucide-react';

type NavItem = { id: string; labelAr: string; labelEn: string; url: string; order: number; children?: Array<{ id: string; labelAr: string; labelEn: string; url: string; order: number }> };
type TransformedNavItem = { id: string; label: string; href: string; children?: Array<{ label: string; href: string }> };
type AnnouncementBar = { textAr: string; textEn: string; linkUrl?: string | null; linkTextAr?: string | null; linkTextEn?: string | null; backgroundColor?: string | null; textColor?: string | null };

export default function Header({ settings = {} as any, announcementBars = [] as AnnouncementBar[], navigationItems = [] as NavItem[], rootCategories = [] as MegaCategory[] }: { settings?: any; announcementBars?: AnnouncementBar[]; navigationItems?: NavItem[]; rootCategories?: MegaCategory[] }) {
  const pathname = usePathname();
  const { lang, toggleLanguage } = useLanguage();
  const { cart, setIsCartOpen } = useCart();
  const wishlist = useWishlist();
  const isAuthenticated = useAuth();
  const [megaOpen, setMegaOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const ar = lang === 'ar';
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const phone = settings.contactPhone || '0559401774';

  // Get the first active announcement bar (they're already ordered)
  const activeAnnouncement = announcementBars.length > 0 ? announcementBars[0] : null;
  const announcementText = ar ? activeAnnouncement?.textAr : activeAnnouncement?.textEn;
  const announcementLinkUrl = activeAnnouncement?.linkUrl;
  const announcementLinkText = ar ? activeAnnouncement?.linkTextAr : activeAnnouncement?.linkTextEn;
  const announcementBgColor = activeAnnouncement?.backgroundColor || '#0f5132';
  const announcementTextColor = activeAnnouncement?.textColor || '#ffffff';

  const drawerCategories = rootCategories;

  // Use database navigation items, with fallbacks for required structural items
  const dbNavItems = navigationItems.length > 0 ? navigationItems : [
    { id: 'home', labelAr: 'الرئيسية', labelEn: 'Home', url: '/', order: 0, children: [] },
    { id: 'shop', labelAr: 'المتجر', labelEn: 'Shop', url: '/shop', order: 1, children: [] },
    { id: 'categories', labelAr: 'الأقسام', labelEn: 'Categories', url: '#', order: 2, children: [] },
    { id: 'flagship', labelAr: 'العشب الصناعي', labelEn: 'Synthetic Grass', url: '/shop?category=alashb-alsnaay', order: 3, children: [] },
    { id: 'projects', labelAr: 'أفكار ومشاريع', labelEn: 'Inspiration', url: '/projects', order: 4, children: [] },
    { id: 'about', labelAr: 'من نحن', labelEn: 'About us', url: '/about', order: 5, children: [] },
    { id: 'contact', labelAr: 'تواصل معنا', labelEn: 'Contact', url: '/contact', order: 6, children: [] },
  ];

  // Build nav items for the current language
  const navItems = dbNavItems.map((item) => ({
    id: item.id,
    label: ar ? item.labelAr : item.labelEn,
    href: item.url,
    children: item.children?.map((child) => ({
      label: ar ? child.labelAr : child.labelEn,
      href: child.url,
    })) || [],
  }));

  // Find special items by URL pattern
  const homeItem = navItems.find((item) => item.href === '/') || navItems[0];
  const shopItem = navItems.find((item) => item.href === '/shop') || navItems[1];
  const categoriesItem = navItems.find((item) => item.id === 'categories' || item.href === '#');
  const flagshipItem = navItems.find((item) => item.id === 'flagship' || item.href?.includes('alashb-alsnaay'));
  const otherItems = navItems.filter((item) => 
    item.id !== 'home' && 
    item.id !== 'shop' && 
    item.id !== 'categories' && 
    item.id !== 'flagship'
  );

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

  const navLink = (item: TransformedNavItem) => (
    <li key={item.id} className={item.id === 'offers' ? 'dg-nav-optional' : undefined}>
      <Link href={item.href} className={isActive(item.href) ? 'active' : ''}>{item.label}</Link>
    </li>
  );

  return (
    <header className="eg-header">
      {/* Announcement Bar */}
      {activeAnnouncement && (
        <div className="dg-announcement-bar" style={{ backgroundColor: announcementBgColor, color: announcementTextColor }}>
          <div className="dg-container dg-announcement-bar-in">
            <Megaphone aria-hidden="true" className="h-4 w-4" />
            <span className="dg-announcement-text">{announcementText}</span>
            {announcementLinkUrl && announcementLinkText && (
              <Link href={announcementLinkUrl} className="dg-announcement-link" style={{ color: announcementTextColor }}>
                {announcementLinkText} <XIcon aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}

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
            <Link href="/account" aria-label={ar ? (isAuthenticated ? 'حسابي، تم تسجيل الدخول' : 'حسابي') : (isAuthenticated ? 'My account, signed in' : 'My account')} title={ar ? (isAuthenticated ? 'تم تسجيل الدخول' : 'حسابي') : (isAuthenticated ? 'Signed in' : 'My account')}>
              {isAuthenticated ? <BadgeCheck className="dg-account-signed-in" aria-hidden="true" /> : <UserRound aria-hidden="true" />}
              <span className="dg-quick-label">{ar ? 'حسابي' : 'Account'}</span>
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
            {homeItem && navLink(homeItem)}
            {shopItem && navLink(shopItem)}
            {categoriesItem && (
              <li onMouseEnter={() => setMegaOpen(true)}>
                <button type="button" onClick={() => setMegaOpen((open) => !open)} aria-haspopup="true" aria-expanded={megaOpen} aria-controls="dg-catalog-mega">
                  {categoriesItem.label} <ChevronDown aria-hidden="true" style={megaOpen ? { transform: 'rotate(180deg)', transition: 'transform .18s' } : { transition: 'transform .18s' }} />
                </button>
                <span id="dg-catalog-mega">
                  {megaOpen && <CatalogMegaMenu categories={rootCategories} open onClose={() => setMegaOpen(false)} />}
                </span>
              </li>
            )}
            {flagshipItem && <li><Link href={flagshipItem.href} className={isActive(flagshipItem.href) ? 'active' : ''}>{flagshipItem.label}</Link></li>}
            {otherItems.map(navLink)}
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
                  {homeItem && <li key={homeItem.id}><Link href={homeItem.href} onClick={() => setDrawerOpen(false)}>{homeItem.label}</Link></li>}
                  {shopItem && <li key={shopItem.id}><Link href={shopItem.href} onClick={() => setDrawerOpen(false)}>{shopItem.label}</Link></li>}
                  <li>
                    <button type="button" className="dg-drawer-catbtn" onClick={() => setCatsOpen((open) => !open)} aria-expanded={catsOpen}>
                      {categoriesItem?.label || (ar ? 'الأقسام' : 'Categories')}
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
                  {flagshipItem && <li key={flagshipItem.id}><Link href={flagshipItem.href} onClick={() => setDrawerOpen(false)}>{flagshipItem.label}</Link></li>}
                  {otherItems.map((item) => (
                    <li key={item.id}><Link href={item.href} onClick={() => setDrawerOpen(false)}>{item.label}</Link></li>
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
