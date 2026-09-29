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
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Ever Green | تحف وديكورات الحدائق | Garden Ornaments & Outdoor Decor',
  description: "اكتشف تشكيلة Ever Green من تحف وديكورات الحدائق، النوافير، التماثيل، الأصص، الإضاءة والإكسسوارات الخارجية. Discover Ever Green's collection of garden ornaments, outdoor decor, fountains, statues, planters, lighting and garden accessories.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: { title: 'Ever Green | Garden Ornaments & Outdoor Decor', description: "Discover Ever Green's collection of garden ornaments, outdoor decor, fountains, statues, planters, lighting and garden accessories.", type:'website' },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings: any = await prisma.siteSettings.findUnique({ where: { id: 'global' } }) || {};
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen flex flex-col antialiased bg-white">
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@type':'Organization','name':settings.storeNameEn || 'Ever Green','url':process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000','logo':settings.logoUrl || '/images/logo.jpg','email':settings.contactEmail || undefined,'telephone':settings.contactPhone || undefined,'address':settings.addressEn || undefined}).replace(/</g,'\\u003c')}} />
        <LanguageProvider>
          <CartProvider>
            <WishlistProvider>
              <CompareProvider>
                <Header settings={settings} />
                <main className="flex-1 w-full">
                  {children}
                </main>
                <Footer settings={settings} />
                <CartDrawer />
                <CompareBar />
              </CompareProvider>
            </WishlistProvider>
          </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
