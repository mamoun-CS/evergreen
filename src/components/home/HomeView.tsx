"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Headphones,
  Leaf,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useLanguage } from "@/components/layout/LanguageContext";

type Category = { id: string; slug: string; nameAr: string; nameEn: string; image?: string | null };
type CmsSection = { titleAr?: string | null; titleEn?: string | null; subtitleAr?: string | null; subtitleEn?: string | null; contentAr?: string | null; contentEn?: string | null; imageAr?: string | null; imageEn?: string | null };

export default function HomeView({ categories, content }: { categories: Category[]; content: Record<string, CmsSection> }) {
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
        trustTitle: "Confidence, delivered to your garden",
      };
  const Arrow = ar ? ArrowLeft : ArrowRight;
  const trusts = ar
    ? [
        [Truck, "توصيل موثوق", "إلى جميع المناطق"],
        [CreditCard, "دفع آمن", "خيارات متعددة"],
        [Headphones, "دعم متخصص", "نحن هنا لمساعدتك"],
        [RotateCcw, "إرجاع سهل", "سياسة واضحة"],
        [ShieldCheck, "قطع منتقاة", "جودة نثق بها"],
      ]
    : [
        [Truck, "Reliable delivery", "Across supported areas"],
        [CreditCard, "Secure payment", "Multiple options"],
        [Headphones, "Dedicated support", "Here to help"],
        [RotateCcw, "Easy returns", "A clear policy"],
        [ShieldCheck, "Selected pieces", "Quality we trust"],
      ];
  const heroImage = ar ? cms.hero?.imageAr || "/images/background.png" : cms.hero?.imageEn || "/images/background-en.png";
  return (
    <main className="home-v2">
      <section className="home-hero" style={{ backgroundImage: `url(${heroImage})` }}>
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
                <span className="home-category-image" style={{ backgroundImage: `url(${category.image || "/images/background.png"})` }} />
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
