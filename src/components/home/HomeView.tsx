"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Headphones,
  Leaf,
  Truck,
} from "lucide-react";
import { useLanguage } from "@/components/layout/LanguageContext";
import ProductCard from "@/components/product/ProductCard";

type Category = { id: string; slug: string; nameAr: string; nameEn: string; image?: string | null };
type CmsSection = { titleAr?: string | null; titleEn?: string | null; subtitleAr?: string | null; subtitleEn?: string | null; contentAr?: string | null; contentEn?: string | null; imageAr?: string | null; imageEn?: string | null; ctaTextAr?: string | null; ctaTextEn?: string | null; ctaLink?: string | null };
type Product = { id: string; slug: string; sku?: string | null; nameEn: string; nameAr: string; purchaseMode: "PURCHASABLE" | "CONTACT_FOR_PRICE"; basePrice?: number | null; discountPrice?: number | null; currency?: string; images: string[]; brand?: { name: string } | null; isAvailable?: boolean; stockQuantity?: number; warrantyInfoEn?: string | null; warrantyInfoAr?: string | null; ratingAvg?: number | null; ratingCount?: number };

export default function HomeView({ categories, content, products }: { categories: Category[]; content: Record<string, CmsSection>; products: { featured: Product[]; latest: Product[] } }) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const cms = content || {};
  const copy = ar
    ? {
        eyebrow: cms.hero?.subtitleAr || "ديكورات خارجية مختارة بعناية",
        title: cms.hero?.titleAr || "كل ما تحتاجه لحديقة أكثر جمالًا",
        description: cms.hero?.contentAr || "تحف وديكورات مختارة بعناية لتضيف لمسة مختلفة لكل مساحة خارجية.",
        shop: "تسوّق الآن",
        explore: "استكشف الأقسام",
        categories: "تسوّق حسب الفئة",
        categoriesSub: "قطع منتقاة لتمنح مساحتك الخارجية طابعًا متفردًا.",
        all: "عرض الكل",
        featured: "منتجات مختارة",
        featuredSub: "مختارات جاهزة لمساحتك الخارجية.",
        latest: "أحدث المنتجات",
        latestSub: "اكتشف ما وصل حديثًا إلى المتجر.",
        trustTitle: "ثقة تمتد إلى باب حديقتك",
      }
    : {
        eyebrow: cms.hero?.subtitleEn || "Thoughtfully selected outdoor decor",
        title: cms.hero?.titleEn || "Everything you need for a more beautiful garden",
        description: cms.hero?.contentEn || "Thoughtfully selected ornaments and decor for a distinctive outdoor space.",
        shop: "Shop now",
        explore: "Explore categories",
        categories: "Shop by category",
        categoriesSub: "Selected pieces for an outdoor space with character.",
        all: "View all",
        featured: "Selected products",
        featuredSub: "Ready picks for your outdoor space.",
        latest: "Latest products",
        latestSub: "Discover what has recently arrived in store.",
        trustTitle: "Confidence, delivered to your garden",
      };
  const Arrow = ar ? ArrowLeft : ArrowRight;
  const trusts = ar
    ? [
        [Truck, "توصيل", "إلى مناطق فلسطين"],
        [Leaf, "لحديقتك ومساحتك الخارجية", "تسوّق من الكتالوج"],
        [Headphones, "خدمة العملاء", "تواصل معنا عند الحاجة"],
      ]
    : [
        [Truck, "Delivery", "Across Palestine"],
        [Leaf, "Garden & outdoor living", "Shop the catalogue"],
        [Headphones, "Customer service", "Contact us when you need us"],
      ];
  const heroImage = ar ? cms.hero?.imageAr || "/images/background.png" : cms.hero?.imageEn || "/images/background-en.png";
  return (
    <main className="home-v2">
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
      <section id="categories" className="home-section">
        <header className="home-heading"><h2>{copy.categories}</h2><p>{copy.categoriesSub}</p></header>
        {categories.length ? (
          <div className="home-category-grid">
            {categories.slice(0, 8).map((category) => (
              <Link key={category.id} href={`/category/${encodeURIComponent(category.slug)}`} className="home-category-card">
                <span className="home-category-image">
                  <Image src={category.image || "/images/background.png"} alt="" fill sizes="(max-width: 760px) 50vw, (max-width: 1100px) 33vw, 25vw" className="object-cover" />
                </span>
                <span className="home-category-overlay" />
                <span className="home-category-copy">
                  <strong>{ar ? category.nameAr : category.nameEn}</strong>
                  <small>{copy.shop}<Arrow aria-hidden="true" /></small>
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
      <ProductShelf title={copy.featured} subtitle={copy.featuredSub} products={products.featured} all={copy.all} arrow={Arrow} ar={ar} accent />
      {cms.promo && (cms.promo.imageAr || cms.promo.imageEn) && <PromoBand section={cms.promo} ar={ar} arrow={Arrow} />}
      <ProductShelf title={copy.latest} subtitle={copy.latestSub} products={products.latest} all={copy.all} arrow={Arrow} ar={ar} />
      <section className="home-trust home-section" aria-label={copy.trustTitle}>
        {trusts.map(([Icon, title, description]) => {
          const TrustIcon = Icon as typeof Truck;
          return (
            <article key={title as string} className="home-trust-item">
              <TrustIcon aria-hidden="true" />
              <div><h3>{title as string}</h3><p>{description as string}</p></div>
            </article>
          );
        })}
      </section>
      <nav className="home-section flex flex-wrap justify-center gap-x-5 gap-y-2 pt-6 text-sm font-bold text-emerald-800" aria-label={ar ? "سياسات المتجر" : "Store policies"}>
        <Link href="/policies/privacy">{ar ? "سياسة الخصوصية" : "Privacy policy"}</Link>
        <Link href="/policies/refunds">{ar ? "سياسة الاسترجاع والاسترداد" : "Return & refund policy"}</Link>
        <Link href="/policies/shipping">{ar ? "سياسة الشحن" : "Shipping policy"}</Link>
      </nav>
    </main>
  );
}

function ProductShelf({ title, subtitle, products, all, arrow: Arrow, ar, accent = false }: { title: string; subtitle: string; products: Product[]; all: string; arrow: typeof ArrowLeft; ar: boolean; accent?: boolean }) {
  return <section className={`home-section ${accent ? "home-products-accent" : ""}`}>
    <div className="home-section-top"><header className="home-heading home-heading-start"><h2>{title}</h2><p>{subtitle}</p></header><Link href="/shop" className="home-text-link">{all}<Arrow aria-hidden="true" /></Link></div>
    {products.length ? <div className="home-product-grid">{products.map((product) => <ProductCard key={product.id} product={product} variant="featured" />)}</div> : <div className="home-empty"><Leaf aria-hidden="true" /><span>{ar ? "ستظهر المنتجات هنا عند توفرها." : "Products will appear here when available."}</span><Link href="/shop" className="home-text-link">{all}<Arrow aria-hidden="true" /></Link></div>}
  </section>;
}

function PromoBand({ section, ar, arrow: Arrow }: { section: CmsSection; ar: boolean; arrow: typeof ArrowLeft }) {
  const image = ar ? section.imageAr : section.imageEn;
  const title = ar ? section.titleAr : section.titleEn;
  const copy = ar ? section.contentAr : section.contentEn;
  const action = ar ? section.ctaTextAr : section.ctaTextEn;
  if (!image) return null;
  return <section className="home-story-band"><div className="home-story-poster"><Image src={image} alt="" fill sizes="(max-width: 760px) 100vw, 430px" className="object-cover" /></div><div className="home-story-copy">{section.subtitleAr || section.subtitleEn ? <p className="home-kicker">{ar ? section.subtitleAr : section.subtitleEn}</p> : null}{title ? <h2>{title}</h2> : null}{copy ? <p>{copy}</p> : null}{action && section.ctaLink ? <Link href={section.ctaLink} className="home-button">{action}<Arrow aria-hidden="true" /></Link> : null}</div></section>;
}
