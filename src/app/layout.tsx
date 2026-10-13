import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/components/layout/LanguageContext';
import { CartProvider } from '@/components/cart/CartContext';
import { WishlistProvider } from '@/components/wishlist/WishlistContext';
import { CompareProvider } from '@/components/compare/CompareContext';
import CompareBar from '@/components/compare/CompareBar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import BackToTopButton from '@/components/layout/BackToTopButton';
import WhatsAppFloatingButton from '@/components/layout/WhatsAppFloatingButton';
import AccessibilityToolbar from '@/components/layout/AccessibilityToolbar';
import CookieConsent from '@/components/layout/CookieConsent';
import { headers } from 'next/headers';
import { getSiteSettings, getSocialLinks, getAnnouncementBar, getNavigationItems, getFooterNavigationItems, getRootCategories } from '@/lib/storefront';
import { getCurrentUser } from '@/lib/auth';
import { AuthProvider } from '@/components/auth/AuthContext';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const titleEn = settings.storeNameEn || 'Ever Green';
  const titleAr = settings.storeNameAr || 'Ever Green';
  return {
    title: { default: `${titleEn} | Garden Ornaments & Outdoor Decor`, template: `%s` },
    description: settings.footerAboutEn || "Discover Ever Green's collection of garden ornaments, outdoor decor, fountains, statues, planters, lighting and garden accessories.",
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
    icons: settings.faviconUrl ? { icon: settings.faviconUrl, shortcut: settings.faviconUrl } : undefined,
    openGraph: { title: titleEn, description: settings.footerAboutEn || undefined, type: 'website' },
    other: {
      'x-title-ar': `${titleAr} | تحف وديكورات الحدائق`,
      'x-title-en': `${titleEn} | Garden Ornaments & Outdoor Decor`,
      'x-description-ar': settings.footerAboutAr || '',
      'x-description-en': settings.footerAboutEn || '',
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings: any = await getSiteSettings();
  const socialLinks: any = await getSocialLinks();
  const announcementBars: any = await getAnnouncementBar();
  const navigationItems: any = await getNavigationItems();
  const footerNavigationItems: any = await getFooterNavigationItems();
  const rootCategories: any = await getRootCategories();
  const nonce = headers().get('x-csp-nonce') || undefined;
  const user = await getCurrentUser();
  const isAuthenticated = !!user;
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen flex flex-col antialiased bg-white">
        <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@type':'Organization','name':settings.storeNameEn || 'Ever Green','url':process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000','logo':settings.logoUrl || '/images/logo.jpg','email':settings.contactEmail || undefined,'telephone':settings.contactPhone || undefined,'address':settings.addressEn || undefined}).replace(/</g,'\\u003c')}} />
        <LanguageProvider>
          <AuthProvider isAuthenticated={isAuthenticated}>
            <CartProvider>
              <WishlistProvider>
                <CompareProvider>
                  <Header settings={settings} announcementBars={announcementBars} navigationItems={navigationItems} />
                  <main className="flex-1 w-full">
                    {children}
                  </main>
                  <Footer settings={settings} socialLinks={socialLinks} footerNavItems={footerNavigationItems} rootCategories={rootCategories} />
                  <CartDrawer />
                  <CompareBar />
                  <BackToTopButton />
                  <WhatsAppFloatingButton phone={settings.contactWhatsApp} />
                  <AccessibilityToolbar />
                  <CookieConsent />
                </CompareProvider>
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
