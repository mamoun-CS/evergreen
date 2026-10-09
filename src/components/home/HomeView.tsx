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
type CmsSection = { titleAr?: string | null; titleEn?: string | null; subtitleAr?: string | null; subtitleEn?: string | null; contentAr?: string | null; contentEn?: string | null; imageAr?: string | null; imageEn?: string | null; ctaTextAr?: string | null; ctaTextEn?: string | null; ctaLink?: string | null };
type Product = { id: string; slug: string; sku?: string | null; nameEn: string; nameAr: string; purchaseMode: "PURCHASABLE" | "CONTACT_FOR_PRICE"; basePrice?: number | null; discountPrice?: number | null; currency?: string; images: string[]; brand?: { name: string } | null; isAvailable?: boolean; stockQuantity?: number; warrantyInfoEn?: string | null; warrantyInfoAr?: string | null; ratingAvg?: number | null; ratingCount?: number };
type Brand = { id: string; name: string; logoUrl: string };

export default function HomeView({ categories, content, brands }: { categories: Category[]; content: Record<string, CmsSection>; products: { featured: Product[]; latest: Product[] }; brands: Brand[] }) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const cms = content || {};
  const copy = ar
    ? {
        eyebrow: cms.hero?.subtitleAr || "Ever Green",
        title: cms.hero?.titleAr || "حان الوقت لتحويل الصور إلى واقع",
        description: cms.hero?.contentAr || "منتجات حدائق مختارة بعناية: أواني الزرع، الديكور، العشب الصناعي، الأدوات الاحترافية والمزيد — لمساحة خارجية تليق بكم.",
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
        eyebrow: cms.hero?.subtitleEn || "ever green",
        title: cms.hero?.titleEn || "It is time to turn the images into reality",
        description: cms.hero?.contentEn || "Carefully selected garden products: planters, decor, synthetic grass, professional tools and more — for an outdoor space that matches your ambitions.",
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
  const heroImage = ar ? cms.hero?.imageAr || "/images/background.png" : cms.hero?.imageEn || "/images/background-en.png";
  // Keep the pots hub visible in the limited homepage category shelf. It is a
  // parent category, so opening it leads shoppers to every pot collection.
  const featuredCategories = [...categories].sort((first, second) => {
    const priority = (category: Category) => category.slug === "alawany" ? 0 : 1;
    return priority(first) - priority(second);
  }).slice(0, 8);

  return (
    <main className="home-v2">
      {/* Section 1 — hero */}
      <section className="home-hero">
        <Image src={heroImage} alt="" fill priority sizes="100vw" className="home-hero-image" />
        <div className="home-hero-shade" />
        <div className="home-hero-content">
          <p className="home-kicker"><Leaf aria-hidden="true" />{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className="home-hero-description">{copy.description}</p>
          <div className="home-hero-actions">
            <Link href="/shop" className="home-button home-button-primary">{copy.shop}<Arrow aria-hidden="true" /></Link>
            <Link href="#categories" className="home-button home-button-secondary">{copy.explore}</Link>
          </div>
        </div>
      </section>

      {/* Section 2 — featured categories */}
      <section id="categories" className="home-section">
        <header className="home-heading"><h2>{copy.categories}</h2><p>{copy.categoriesSub}</p></header>
        {categories.length ? (
          <div className="home-category-grid">
            {featuredCategories.map((category) => (
              <Link key={category.id} href={`/category/${encodeURIComponent(category.slug)}`} className="home-category-card">
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

      {/* Section 3 — brand showcase marquee */}
      {brands.length > 0 && (
        <section className="home-section home-brands" aria-label={copy.brands}>
          <header className="home-heading"><h2>{copy.brands}</h2><p>{copy.brandsSub}</p></header>
          <BrandRail brands={brands} ar={ar} />
        </section>
      )}

      {/* Section 4 — supporting editorial content */}
      {cms.promo && (cms.promo.imageAr || cms.promo.imageEn) ? (
        <PromoBand section={cms.promo} ar={ar} arrow={Arrow} />
      ) : (
        <TrustBand ar={ar} />
      )}
    </main>
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
    <section className="home-story-band" aria-label={ar ? "لماذا Ever Green" : "Why Ever Green"}>
      <div className="home-story-copy" style={{ maxWidth: "100%" }}>
        <p className="home-kicker"><Sprout aria-hidden="true" />{ar ? "لماذا Ever Green؟" : "Why Ever Green?"}</p>
        <h2>{ar ? "خدمة تليق بحديقتك من بداية المسار إلى باب المنزل" : "Service your garden deserves, from browsing to doorstep"}</h2>
        <div className="dg-value-grid" style={{ margin: "24px auto", paddingInline: 0 }}>
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
