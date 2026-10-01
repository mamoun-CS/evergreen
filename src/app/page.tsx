"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Headphones,
  Leaf,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useLanguage } from "@/components/layout/LanguageContext";
import ProductCard from "@/components/product/ProductCard";

type Category = { id: string; slug: string; nameAr: string; nameEn: string; parentId?: string | null; image?: string | null };
type Product = React.ComponentProps<typeof ProductCard>["product"];
const rotate = <T,>(items: T[], start: number) =>
  items.length <= 4
    ? items
    : Array.from(
        { length: 4 },
        (_, index) => items[(start + index) % items.length],
      );

export default function HomePage() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [cms, setCms] = useState<any>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [newest, setNewest] = useState<Product[]>([]);
  const [offers, setOffers] = useState<Product[]>([]);
  const [catalog, setCatalog] = useState<
    (Product & { categories?: Category[] })[]
  >([]);
  const [start, setStart] = useState(0);
  useEffect(() => {
    void (async () => {
      try {
        const [options, featuredRes, newestRes, offersRes, catalogRes, cmsRes] =
          await Promise.all([
            fetch("/api/categories"),
            fetch("/api/products?featured=true&sort=featured&limit=8"),
            fetch("/api/products?sort=newest&limit=8"),
            fetch("/api/products?discounted=true&limit=8"),
            fetch("/api/products?sort=newest&limit=60"),
            fetch("/api/homepage"),
          ]);
        if (options.ok) setCategories((await options.json()).categories || []);
        if (featuredRes.ok)
          setFeatured((await featuredRes.json()).products || []);
        if (newestRes.ok) setNewest((await newestRes.json()).products || []);
        if (offersRes.ok) setOffers((await offersRes.json()).products || []);
        if (catalogRes.ok) setCatalog((await catalogRes.json()).products || []);
        if (cmsRes.ok) setCms((await cmsRes.json()).content || {});
      } catch (error) {
        console.error("Unable to load homepage data", error);
      }
    })();
  }, []);
  const copy = ar
    ? {
        eyebrow: cms.hero?.subtitleAr || "ديكورات خارجية مختارة بعناية",
        title: cms.hero?.titleAr || "كل ما تحتاجه لحديقة أكثر جمالًا",
        description:
          cms.hero?.contentAr ||
          "تحف وديكورات مختارة بعناية لتضيف لمسة مختلفة لكل مساحة خارجية.",
        shop: "تسوّق الآن",
        explore: "استكشف الأقسام",
        categories: "تسوّق حسب الفئة",
        categoriesSub: "قطع منتقاة لتمنح مساحتك الخارجية طابعًا متفردًا.",
        featured: "مختارات مميزة",
        featuredSub: "قطع مختارة بعناية لحديقتك",
        newest: "وصل حديثًا",
        newestSub: "أحدث الإضافات إلى مجموعتنا",
        offers: "عروض مختارة",
        offersSub: "أسعار خاصة لفترة محدودة",
        all: "عرض الكل",
        empty: "ستظهر القطع المختارة هنا قريبًا.",
        story: cms.story?.titleAr || "لمسة مختلفة لكل حديقة",
        storyBody:
          cms.story?.contentAr ||
          "نختار قطعًا تجمع بين الجمال والجودة لتمنح المساحات الخارجية طابعًا أكثر أناقة وتميزًا.",
        storyCta: "اكتشف قصتنا",
        final: cms.final?.titleAr || "حديقتك تستحق لمسة مختلفة",
        finalBody:
          cms.final?.contentAr ||
          "اكتشف مجموعتنا واختر القطع التي تناسب مساحتك وذوقك.",
        start: "ابدأ التسوق",
        trustTitle: "ثقة تمتد إلى باب حديقتك",
      }
    : {
        eyebrow: cms.hero?.subtitleEn || "Thoughtfully selected outdoor decor",
        title:
          cms.hero?.titleEn ||
          "Everything you need for a more beautiful garden",
        description:
          cms.hero?.contentEn ||
          "Thoughtfully selected ornaments and decor for a distinctive outdoor space.",
        shop: "Shop now",
        explore: "Explore categories",
        categories: "Shop by category",
        categoriesSub: "Selected pieces for an outdoor space with character.",
        featured: "Featured collection",
        featuredSub: "Thoughtfully selected for your garden",
        newest: "New arrivals",
        newestSub: "The latest additions to our collection",
        offers: "Selected offers",
        offersSub: "Special prices for a limited time",
        all: "View all",
        empty: "Selected pieces will appear here soon.",
        story: cms.story?.titleEn || "A unique touch for every garden",
        storyBody:
          cms.story?.contentEn ||
          "We select pieces that unite beauty and quality, giving outdoor spaces a more elegant and distinctive character.",
        storyCta: "Discover our story",
        final: cms.final?.titleEn || "Your garden deserves a unique touch",
        finalBody:
          cms.final?.contentEn ||
          "Explore our collection and choose pieces that complement your space and style.",
        start: "Start shopping",
        trustTitle: "Confidence, delivered to your garden",
      };
  const Arrow = ar ? ArrowLeft : ArrowRight;
  const shownFeatured = useMemo(
    () => rotate(featured, start),
    [featured, start],
  );
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
  const heroImage = ar
    ? cms.hero?.imageAr || "/images/background.png"
    : cms.hero?.imageEn || "/images/background-en.png";
  const storyImage = ar
    ? cms.story?.imageAr || "/images/background.png"
    : cms.story?.imageEn || "/images/background-en.png";
  const imageForCategory = (category: Category) =>
    catalog.find((product) =>
      product.categories?.some((item) => item.slug === category.slug),
    )?.images?.[0] || category.image || "/images/background.png";
  return (
    <main className="home-v2">
      <section
        className="home-hero"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="home-hero-shade" />
        <div className="home-hero-content">
          <p className="home-kicker">
            <Leaf aria-hidden="true" />
            {copy.eyebrow}
          </p>
          <h1>{copy.title}</h1>
          <p className="home-hero-description">{copy.description}</p>
          <div className="home-hero-actions">
            <Link href="/shop" className="home-button home-button-primary">
              {copy.shop}
              <Arrow aria-hidden="true" />
            </Link>
            <Link
              href="#categories"
              className="home-button home-button-secondary"
            >
              {copy.explore}
            </Link>
          </div>
        </div>
      </section>

      <section id="categories" className="home-section">
        <Heading title={copy.categories} subtitle={copy.categoriesSub} />
        {categories.length ? (
          <div className="home-category-grid">
            {categories.slice(0, 8).map((category) => (
              <Link
                key={category.id}
                href={`/category/${encodeURIComponent(category.slug)}`}
                className="home-category-card"
              >
                <span
                  className="home-category-image"
                  style={{
                    backgroundImage: `url(${imageForCategory(category)})`,
                  }}
                />
                <span className="home-category-copy">
                  <strong>{ar ? category.nameAr : category.nameEn}</strong>
                  <small>
                    {copy.shop}
                    <Arrow aria-hidden="true" />
                  </small>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyBrowse
            message={
              ar
                ? "ستظهر الأقسام هنا عند إضافة كتالوج المتجر."
                : "Categories will appear here when the store catalogue is available."
            }
            action={copy.all}
          />
        )}
      </section>
      <section className="home-trust home-section" aria-label={copy.trustTitle}>
        {trusts.map(([Icon, title, description]) => {
          const TrustIcon = Icon as typeof Truck;
          return (
            <article key={title as string} className="home-trust-item">
              <TrustIcon aria-hidden="true" />
              <div>
                <h3>{title as string}</h3>
                <p>{description as string}</p>
              </div>
            </article>
          );
        })}
      </section>

    </main>
  );
}
function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="home-heading">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </header>
  );
}
function EmptyBrowse({ message, action }: { message: string; action: string }) {
  return (
    <div className="home-empty">
      <Leaf aria-hidden="true" />
      <span>{message}</span>
      <Link href="/shop" className="home-text-link">
        {action}
        <ArrowLeft aria-hidden="true" />
      </Link>
    </div>
  );
}
function ProductSection({
  title,
  subtitle,
  products,
  all,
  empty,
  href = "/shop",
  controls,
}: {
  title: string;
  subtitle: string;
  products: Product[];
  all: string;
  empty: string;
  href?: string;
  controls?: React.ReactNode;
}) {
  return (
    <section className="home-section home-products">
      <div className="home-section-top">
        <Heading title={title} subtitle={subtitle} />
        <div className="home-product-tools">
          {controls}
          <Link href={href} className="home-text-link">
            {all}
            <ArrowLeft aria-hidden="true" />
          </Link>
        </div>
      </div>
      {products.length ? (
        <div className="home-product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="home-empty">
          <Leaf aria-hidden="true" />
          {empty}
        </div>
      )}
    </section>
  );
}
