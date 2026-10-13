"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Leaf,
  Sprout,
  Truck,
  ShieldCheck,
  Headset,
} from "lucide-react";
import { useLanguage } from "@/components/layout/LanguageContext";

type Category = { id: string; slug: string; nameAr: string; nameEn: string; image?: string | null };
type CmsSection = { 
  key: string;
  type: string;
  titleAr?: string | null; 
  titleEn?: string | null; 
  subtitleAr?: string | null; 
  subtitleEn?: string | null; 
  contentAr?: string | null; 
  contentEn?: string | null; 
  imageAr?: string | null; 
  imageEn?: string | null; 
  ctaTextAr?: string | null; 
  ctaTextEn?: string | null; 
  ctaLink?: string | null;
  isActive?: boolean;
  order?: number;
};
type Product = { id: string; slug: string; sku?: string | null; nameEn: string; nameAr: string; purchaseMode: "PURCHASABLE" | "CONTACT_FOR_PRICE"; basePrice?: number | null; discountPrice?: number | null; currency?: string; images: string[]; brand?: { name: string } | null; isAvailable?: boolean; stockQuantity?: number; warrantyInfoEn?: string | null; warrantyInfoAr?: string | null; ratingAvg?: number | null; ratingCount?: number };
type Brand = { id: string; name: string; logoUrl: string };
type Banner = { id: string; titleAr?: string | null; titleEn?: string | null; subtitleAr?: string | null; subtitleEn?: string | null; imageUrl: string; mobileImageUrl?: string | null; ctaTextAr?: string | null; ctaTextEn?: string | null; ctaUrl?: string | null };

export default function HomeView({ categories, content, brands, banners = [] }: { categories: Category[]; content: Record<string, CmsSection>; products: { featured: Product[]; latest: Product[] }; brands: Brand[]; banners?: Banner[] }) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const cms = content || {};
  
  const activeSections = Object.values(cms)
    .filter((section) => section.isActive !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const managed = activeSections.length > 0;
  const heroSection = activeSections.find((section) => section.type === 'HERO' || section.key === 'hero') || (!managed ? cms.hero : undefined);
  const heroImage = ar ? heroSection?.imageAr || "/images/background.png" : heroSection?.imageEn || "/images/background-en.png";
  const copy = ar
    ? {
        eyebrow: heroSection?.subtitleAr || "Ever Green",
        title: heroSection?.titleAr || "حان الوقت لتحويل الصور إلى واقع",
        description: heroSection?.contentAr || "منتجات حدائق مختارة بعناية: أواني الزرع، الديكور، العشب الصناعي، الأدوات الاحترافية والمزيد — لمساحة خارجية تليق بكم.",
        shop: "تصفّح المتجر",
        explore: "استكشف الأقسام",
        categories: "الأقسام الرئيسية",
        categoriesSub: "رؤوايا عائلات منتجنا كاملة بخطوة واحدة.",
        all: "عرض الكل",
        brands: "علاماتنا التجارية",
        brandsSub: "شركاء مختارون بعناية لحديقتك.",
        contact: "تواصل معنا",
      }
    : {
        eyebrow: heroSection?.subtitleEn || "ever green",
        title: heroSection?.titleEn || "It is time to turn the images into reality",
        description: heroSection?.contentEn || "Carefully selected garden products: planters, decor, synthetic grass, professional tools and more — for an outdoor space that matches your ambitions.",
        shop: "Shop now",
        explore: "Explore categories",
        categories: "Featured Categories",
        categoriesSub: "A first look at our main product families.",
        all: "View all",
        brands: "Our Brands",
        brandsSub: "Carefully selected partners for your garden.",
        contact: "Contact us",
      };
  const Arrow = ar ? ArrowLeft : ArrowRight;
  
  // Keep the pots hub visible in the limited homepage category shelf. It is a
  // parent category, so opening it leads shoppers to every pot collection.
  const featuredCategories = [...categories].sort((first, second) => {
    const priority = (category: Category) => category.slug === "alawany" ? 0 : 1;
    return priority(first) - priority(second);
  }).slice(0, 8);

  const sectionsToRender = managed ? activeSections : [
    { key: 'hero', type: 'HERO', isActive: true, order: 0 },
    { key: 'categories', type: 'CATEGORIES', titleAr: copy.categories, titleEn: copy.categories, subtitleAr: copy.categoriesSub, subtitleEn: copy.categoriesSub, isActive: true, order: 1 },
    { key: 'brands', type: 'BRANDS', titleAr: copy.brands, titleEn: copy.brands, subtitleAr: copy.brandsSub, subtitleEn: copy.brandsSub, isActive: true, order: 2 },
    { key: 'promo', type: 'PROMO', isActive: true, order: 3 },
  ] as CmsSection[];

  return (
    <main className="home-v2">
      {sectionsToRender.map((section) => {
        if (section.type === 'HERO' || section.key === 'hero') {
          const sectionImage = ar ? section.imageAr || heroImage : section.imageEn || heroImage;
          const sectionTitle = ar ? section.titleAr || copy.title : section.titleEn || copy.title;
          const sectionEyebrow = ar ? section.subtitleAr || copy.eyebrow : section.subtitleEn || copy.eyebrow;
          const sectionBody = ar ? section.contentAr || copy.description : section.contentEn || copy.description;
          return (
            <section key={section.key} className="home-hero">
              <Image src={sectionImage} alt="" fill priority sizes="100vw" className="home-hero-image" />
              <div className="home-hero-shade" />
              <div className="home-hero-content">
                <p className="home-kicker"><Leaf aria-hidden="true" />{sectionEyebrow}</p>
                <h1>{sectionTitle}</h1>
                <p className="home-hero-description">{sectionBody}</p>
                <div className="home-hero-actions">
                  <Link href={section.ctaLink || '/shop'} className="home-button home-button-primary">{ar ? section.ctaTextAr || copy.shop : section.ctaTextEn || copy.shop}<Arrow aria-hidden="true" /></Link>
                  <Link href="#categories" className="home-button home-button-secondary">{copy.explore}</Link>
                </div>
              </div>
            </section>
          );
        }
        switch (section.type) {
          case 'BANNERS':
            return <BannerStrip key={section.key} banners={banners} ar={ar} arrow={Arrow} />;
          case 'CATEGORIES':
            return (
              <section key={section.key} id="categories" className="home-section">
                <header className="home-heading">
                  <h2>{ar ? section.titleAr : section.titleEn}</h2>
                  <p>{ar ? section.subtitleAr : section.subtitleEn}</p>
                </header>
                {categories.length ? (
                  <div className="home-category-grid">
                    {featuredCategories.map((category) => (
                      <Link key={category.id} href={`/category/${encodeURIComponent(category.slug)}`} className="home-category-card" title={ar ? category.nameAr : category.nameEn}>
                        <span className="home-category-image">
                          <Image src={category.image || "/images/background.png"} alt="" fill sizes="(max-width: 760px) 50vw, (max-width: 1100px) 33vw, 25vw" className="object-cover" />
                        </span>
                        <span className="home-category-overlay" />
                        <span className="home-category-copy">
                          <strong>{ar ? category.nameAr : category.nameEn}</strong>
                          <small>{copy.all}<Arrow aria-hidden="true" /></small>
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="home-empty">
                    <Leaf aria-hidden="true" />
                    <span>{ar ? "ستظهر الأقسام هنا عند إضافة كتالوج المتجر." : "Categories will appear here when the store catalogue is available."}</span>
                    <Link href="/shop" className="home-text-link">{copy.all}<ArrowLeft aria-hidden="true" /></Link>
                  </div>
                )}
              </section>
            );
          case 'BRANDS':
            return brands.length > 0 && (
              <section key={section.key} className="home-section home-brands" aria-label={(ar ? section.titleAr : section.titleEn) || undefined}>
                <header className="home-heading">
                  <h2>{ar ? section.titleAr : section.titleEn}</h2>
                  <p>{ar ? section.subtitleAr : section.subtitleEn}</p>
                </header>
                <BrandRail brands={brands} ar={ar} />
              </section>
            );
          case 'PROMO':
            return (section.imageAr || section.imageEn) ? (
              <PromoBand key={section.key} section={section} ar={ar} arrow={Arrow} />
            ) : (
              <TrustBand key={section.key} ar={ar} />
            );
          case 'TEXT':
            return (
              <section key={section.key} className="home-story-band">
                <div className="home-story-copy">
                  {section.subtitleAr || section.subtitleEn ? <p className="home-kicker">{ar ? section.subtitleAr : section.subtitleEn}</p> : null}
                  {section.titleAr || section.titleEn ? <h2>{ar ? section.titleAr : section.titleEn}</h2> : null}
                  {section.contentAr || section.contentEn ? <p>{ar ? section.contentAr : section.contentEn}</p> : null}
                  {(section.ctaTextAr || section.ctaTextEn) && section.ctaLink ? (
                    <Link href={section.ctaLink} className="home-text-link mt-4">
                      {ar ? section.ctaTextAr : section.ctaTextEn}
                      <Arrow aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
              </section>
            );
          default:
            return null;
        }
      })}
      {managed && !sectionsToRender.some((section) => section.type === 'BANNERS') ? <BannerStrip banners={banners} ar={ar} arrow={Arrow} /> : null}
    </main>
  );
}

function BannerStrip({ banners, ar, arrow: Arrow }: { banners: Banner[]; ar: boolean; arrow: typeof ArrowLeft }) {
  if (!banners.length) return null;
  return (
    <section className="home-section" aria-label={ar ? 'البنرات' : 'Banners'}>
      <div className="grid gap-4">
        {banners.map((banner) => {
          const title = ar ? banner.titleAr : banner.titleEn;
          const subtitle = ar ? banner.subtitleAr : banner.subtitleEn;
          const action = ar ? banner.ctaTextAr : banner.ctaTextEn;
          return (
            <article key={banner.id} className="relative overflow-hidden rounded-2xl min-h-[220px] md:min-h-[360px]">
              <picture>
                {banner.mobileImageUrl ? <source media="(max-width: 760px)" srcSet={banner.mobileImageUrl} /> : null}
                <img src={banner.imageUrl} alt={title || ''} className="absolute inset-0 h-full w-full object-cover" />
              </picture>
              <div className="relative z-10 flex min-h-[220px] flex-col justify-end bg-gradient-to-t from-black/70 to-transparent p-6 text-white md:min-h-[360px] md:p-10">
                {title ? <h2 className="text-2xl font-extrabold md:text-4xl">{title}</h2> : null}
                {subtitle ? <p className="mt-2 max-w-xl text-sm md:text-base">{subtitle}</p> : null}
                {action && banner.ctaUrl ? <Link href={banner.ctaUrl} className="home-text-link mt-4 text-white">{action}<Arrow aria-hidden="true" /></Link> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function BrandRail({ brands, ar }: { brands: Brand[]; ar: boolean }) {
  const strip = brands.map((brand) => (
    <Link role="listitem" key={brand.id} href={`/shop?brand=${encodeURIComponent(brand.id)}`} className="home-brand-mark dg-rail-item" aria-label={ar ? `تسوّق منتجات ${brand.name}` : `Shop ${brand.name}`}>
      <Image src={brand.logoUrl} alt={brand.name} fill sizes="190px" className="object-contain" />
    </Link>
  ));
  return (
    <div className="dg-marquee">
      <div className="dg-marquee-track" role="list">
        {strip}
        <span aria-hidden="true" style={{ display: "contents" }}>{strip}</span>
      </div>
    </div>
  );
}

function PromoBand({ section, ar, arrow: Arrow }: { section: CmsSection; ar: boolean; arrow: typeof ArrowLeft }) {
  const image = ar ? section.imageAr : section.imageEn;
  const title = ar ? section.titleAr : section.titleEn;
  const body = ar ? section.contentAr : section.contentEn;
  const action = ar ? section.ctaTextAr : section.ctaTextEn;
  if (!image) return null;
  return (
    <section className="home-story-band">
      <div className="home-story-poster"><Image src={image} alt="" fill sizes="(max-width: 760px) 100vw, 430px" className="object-cover" /></div>
      <div className="home-story-copy">
        {section.subtitleAr || section.subtitleEn ? <p className="home-kicker">{ar ? section.subtitleAr : section.subtitleEn}</p> : null}
        {title ? <h2>{title}</h2> : null}
        {body ? <p>{body}</p> : null}
        <div className="home-hero-actions">
          <Link href="/shop" className="home-button home-button-primary">{ar ? "تصفّح المتجر" : "Shop now"}<Arrow aria-hidden="true" /></Link>
          <Link href="/contact" className="home-button home-button-light">{ar ? "تواصل معنا" : "Contact us"}</Link>
        </div>
        {action && section.ctaLink ? <Link href={section.ctaLink} className="home-text-link mt-4">{action}<Arrow aria-hidden="true" /></Link> : null}
      </div>
    </section>
  );
}

function TrustBand({ ar }: { ar: boolean }) {
  const items = [
    { Icon: Sprout, title: ar ? "تشكيلة واسعة" : "Wide selection", body: ar ? "عائلات منتجات تغطي كل مساحتك الخارجية." : "Product families covering every outdoor space." },
    { Icon: Truck, title: ar ? "توصيل لجميع مناطق فلسطين" : "Nationwide delivery", body: ar ? "شحن إلى حيث تكون حديقتك." : "Shipping to wherever your garden is." },
    { Icon: Headset, title: ar ? "فريق خدمة العملاء" : "Customer service team", body: ar ? "رد سريع على استفساراتك عبر الهاتف أو النموذج." : "Quick answers by phone or contact form." },
    { Icon: ShieldCheck, title: ar ? "سياسات واضحة" : "Clear policies", body: ar ? "شحن، استرجاع وخصوصية بخطوات واضحة." : "Shipping, refunds and privacy made clear." },
  ];
  return (
    <section className="home-story-band home-story-band--benefits" aria-label={ar ? "لماذا Ever Green" : "Why Ever Green"}>
      <div className="home-story-copy">
        <p className="home-kicker"><Sprout aria-hidden="true" />{ar ? "لماذا Ever Green؟" : "Why Ever Green?"}</p>
        <h2>{ar ? "خدمة تليق بحديقتك من بداية المسار إلى باب المنزل" : "Service your garden deserves, from browsing to doorstep"}</h2>
        <div className="dg-value-grid">
          {items.map(({ Icon, title: t, body: b }) => (
            <div key={t} className="dg-value-card">
              <i><Icon aria-hidden="true" /></i>
              <h3>{t}</h3>
              <p>{b}</p>
            </div>
          ))}
        </div>
        <div className="home-hero-actions">
          <Link href="/shop" className="home-button home-button-primary">{ar ? "تصفّح المتجر" : "Shop now"}</Link>
          <Link href="/contact" className="home-button home-button-light">{ar ? "تواصل معنا" : "Contact us"}</Link>
        </div>
      </div>
    </section>
  );
}
