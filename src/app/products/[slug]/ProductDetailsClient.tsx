"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/layout/LanguageContext";
import { useCart } from "@/components/cart/CartContext";
import ProductCard from "@/components/product/ProductCard";
import ProductReviews from "@/components/product/ProductReviews";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import {
  ShoppingCart,
  ShieldCheck,
  CheckCircle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Heart,
  ArrowLeftRight,
  Phone,
  Sparkles,
  Package,
  FolderOpen,
} from "lucide-react";
import { useWishlist } from "@/components/wishlist/WishlistContext";
import { useCompare } from "@/components/compare/CompareContext";

interface Specification {
  id: string;
  keyEn: string;
  keyAr: string;
  valueEn: string;
  valueAr: string;
  groupEn?: string | null;
  groupAr?: string | null;
}

interface ProductDetailsClientProps {
  product: {
    id: string;
    stockQuantity: number;
    isAvailable: boolean;
    variants: Array<{
      id: string;
      titleEn: string;
      titleAr: string;
      price: number | null;
      stock: number;
    }>;
    slug: string;
    sku?: string | null;
    nameEn: string;
    nameAr: string;
    descriptionEn?: string | null;
    descriptionAr?: string | null;
    importDetails?: string | null;
    purchaseMode: "PURCHASABLE" | "CONTACT_FOR_PRICE";
    basePrice?: number | null;
    discountPrice?: number | null;
    currency?: string;
    images: string[];
    datasheetUrl?: string | null;
    manualUrl?: string | null;
    warrantyInfoEn?: string | null;
    warrantyInfoAr?: string | null;
    countryOfOrigin?: string | null;
    material?: string | null;
    color?: string | null;
    style?: string | null;
    lengthCm?: number | null;
    widthCm?: number | null;
    heightCm?: number | null;
    weightKg?: number | null;
    brand?: { name: string } | null;
    categories: { nameEn: string; nameAr: string; slug: string }[];
    applications: { nameEn: string; nameAr: string; slug: string }[];
    specifications: Specification[];
    accessories: any[];
    relatedProducts: any[];
  };
}

export default function ProductDetailsClient({
  product,
}: ProductDetailsClientProps) {
  const { lang, t } = useLanguage();
  const ar = lang === "ar";
  const { addToCart } = useCart();
  const wishlist = useWishlist();
  const compare = useCompare();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variants?.length === 1 ? product.variants[0].id : "",
  );
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const title = ar ? product.nameAr : product.nameEn;
  const description = ar ? product.descriptionAr : product.descriptionEn;
  // Positioning statement = the first sentence of the description (own content).
  const tagline = description?.split(/(?<=[.!؟\n])/)[0]?.trim().slice(0, 160);
  const warranty = ar ? product.warrantyInfoAr : product.warrantyInfoEn;
  const selectedVariant = product.variants?.find(
    (variant) => variant.id === selectedVariantId,
  );
  const stockQuantity = selectedVariant
    ? selectedVariant.stock
    : product.stockQuantity;
  const inStock = product.isAvailable && stockQuantity > 0;
  const unitPrice =
    selectedVariant?.price ?? product.discountPrice ?? product.basePrice;
  const currencyGlyph =
    !product.currency || product.currency === "ILS" ? "₪" : product.currency;
  const gallery = product.images?.length ? product.images : ["/images/logo.jpg"];
  const firstCategory = product.categories?.[0];
  const categoryHref = firstCategory?.slug
    ? `/shop?category=${encodeURIComponent(firstCategory.slug)}`
    : "/shop";

  const handleAction = () => {
    const mainImg = product.images?.[0] || "/images/logo.jpg";
    if (
      product.purchaseMode === "PURCHASABLE" &&
      unitPrice &&
      inStock &&
      (!product.variants?.length || selectedVariant)
    ) {
      addToCart(
        {
          id: product.id,
          variantId: selectedVariant?.id,
          variantTitleEn: selectedVariant?.titleEn,
          variantTitleAr: selectedVariant?.titleAr,
          slug: product.slug,
          nameEn: product.nameEn,
          nameAr: product.nameAr,
          image: mainImg,
          price: Number(unitPrice),
        },
        quantity,
      );
    }
  };

  const stepGallery = (delta: number) =>
    setSelectedImage((current) => (current + delta + gallery.length) % gallery.length);

  const onTouchStart = (event: React.TouchEvent) => setTouchStart(event.touches[0]?.clientX ?? null);
  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStart === null) return;
    const delta = event.changedTouches[0]?.clientX - touchStart;
    if (Math.abs(delta) > 44) stepGallery(ar ? (delta > 0 ? 1 : -1) : delta > 0 ? -1 : 1);
    setTouchStart(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8 pb-12">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: t.nav.home, href: "/" },
          { label: t.nav.shopByCategory, href: "/shop" },
          ...(firstCategory
            ? [{ label: ar ? firstCategory.nameAr : firstCategory.nameEn, href: categoryHref }]
            : []),
          { label: title },
        ]}
      />

      {/* Main Details Grid: gallery → title → SKU → positioning → description → purchase */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm">
        {/* Product gallery */}
        <div className="space-y-4">
          <div
            className="relative aspect-square rounded-xl bg-gray-50 border border-gray-200 overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <button
              type="button"
              onClick={() =>
                void wishlist.toggle({
                  id: product.id,
                  slug: product.slug,
                  nameEn: product.nameEn,
                  nameAr: product.nameAr,
                  images: product.images,
                  basePrice: product.basePrice ?? null,
                  discountPrice: product.discountPrice ?? null,
                  currency: product.currency || "ILS",
                  purchaseMode: product.purchaseMode,
                  stockQuantity: product.stockQuantity,
                  isAvailable: product.isAvailable,
                })
              }
              aria-label={
                wishlist.has(product.id)
                  ? ar ? "إزالة من قائمة الرغبات" : "Remove from wishlist"
                  : ar ? "إضافة إلى قائمة الرغبات" : "Add to wishlist"
              }
              className="absolute end-3 top-3 z-10 rounded-full bg-white p-3 text-brand-dark shadow"
            >
              <Heart
                className="h-5 w-5"
                fill={wishlist.has(product.id) ? "currentColor" : "none"}
              />
            </button>
            <button
              type="button"
              onClick={() =>
                compare.toggle({
                  slug: product.slug,
                  nameAr: product.nameAr,
                  nameEn: product.nameEn,
                  image: product.images[0] || "/images/logo.jpg",
                })
              }
              aria-label={
                compare.items.some((item) => item.slug === product.slug)
                  ? ar ? "إزالة من المقارنة" : "Remove from comparison"
                  : ar ? "إضافة إلى المقارنة" : "Add to comparison"
              }
              className="absolute end-3 top-16 z-10 rounded-full bg-white p-3 text-brand-dark shadow"
            >
              <ArrowLeftRight className="h-5 w-5" />
            </button>
            <Image
              src={gallery[selectedImage]}
              alt={`${title} — ${product.brand?.name ?? ""} ${product.sku ? product.sku : ""}`.trim()}
              fill
              sizes="(max-width: 767px) 100vw, (max-width: 1280px) 50vw, 640px"
              quality={90}
              className="object-contain p-4"
              priority
            />
            {gallery.length > 1 && (
              <>
                <button type="button" onClick={() => stepGallery(-1)} aria-label={ar ? "الصورة السابقة" : "Previous image"} className="absolute start-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-brand-dark shadow hover:bg-white">
                  <ChevronLeft className="h-5 w-5" style={ar ? undefined : { display: "none" }} />
                  <ChevronRight className="h-5 w-5" style={ar ? { display: "none" } : undefined} />
                </button>
                <button type="button" onClick={() => stepGallery(1)} aria-label={ar ? "الصورة التالية" : "Next image"} className="absolute end-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-brand-dark shadow hover:bg-white">
                  <ChevronRight className="h-5 w-5" style={ar ? undefined : { display: "none" }} />
                  <ChevronLeft className="h-5 w-5" style={ar ? { display: "none" } : undefined} />
                </button>
              </>
            )}
          </div>

          {gallery.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {gallery.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  aria-label={`${ar ? "صورة" : "Image"} ${idx + 1}`}
                  aria-current={selectedImage === idx}
                  className={`relative w-16 h-16 rounded-lg border overflow-hidden flex-shrink-0 bg-gray-50 ${
                    selectedImage === idx
                      ? "border-brand-dark ring-2 ring-brand-dark"
                      : "border-gray-200"
                  }`}
                >
                  <Image src={img} alt="" fill className="object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product information column */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {product.brand && (
                <span className="bg-brand-navy text-white text-xs font-bold px-2.5 py-0.5 rounded">
                  {product.brand.name}
                </span>
              )}
              {product.sku && (
                <span className="bg-slate-100 text-slate-700 text-xs font-mono px-2 py-0.5 rounded border" dir="ltr">
                  {product.sku}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">
              {title}
            </h1>
            {tagline && tagline !== description && (
              <p className="mt-2 text-sm font-semibold text-brand-navy">{tagline}</p>
            )}
          </div>

          {/* Main description */}
          {description && (
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-b border-gray-100 py-3">
              {description}
            </p>
          )}

          {/* Itemized product details */}
          {product.importDetails && (
            <section className="border-b border-gray-100 pb-3 text-xs sm:text-sm text-gray-700">
              <h2 className="mb-2 flex items-center gap-2 font-bold text-gray-900">
                <Sparkles className="h-4 w-4 text-brand-gold" />
                <span>{ar ? "تفاصيل المنتج" : "Product details"}</span>
              </h2>
              <ul className="dg-benefit-list">
                {product.importDetails.split(/\r?\n/).map((line, index) => line.trim() && (
                  <li key={index}><CheckCircle aria-hidden="true" /><span dir="auto">{line.trim()}</span></li>
                ))}
              </ul>
            </section>
          )}

          {/* Price, availability, purchase card */}
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 font-semibold">
                {t.product.price}
              </span>
              {product.purchaseMode === "PURCHASABLE" && unitPrice ? (
                <span className="dg-price-tag">
                  <span className="dg-price-now">
                    {Number(unitPrice).toLocaleString()}{" "}
                    {currencyGlyph}
                    {product.discountPrice && (
                      <span className="dg-price-was ms-2">
                        {Number(product.basePrice).toLocaleString()}
                      </span>
                    )}
                  </span>
                </span>
              ) : (
                <span className="text-xs uppercase tracking-wider bg-amber-600 text-slate-950 font-extrabold px-3 py-1 rounded">
                  {t.product.priceOnRequest}
                </span>
              )}
              <span
                className={`dg-note ${inStock ? "bg-emerald-900/40 text-emerald-100" : "bg-red-900/40 text-red-100"}`}
              >
                <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {inStock ? t.product.inStock : t.product.outOfStock}
              </span>
            </div>

            {product.purchaseMode === "PURCHASABLE" &&
              product.variants?.length > 0 && (
                <div>
                  <label
                    htmlFor="product-variant"
                    className="mb-1 block text-xs font-semibold"
                  >
                    {ar ? "الخيار" : "Option"}
                  </label>
                  <select
                    id="product-variant"
                    value={selectedVariantId}
                    onChange={(event) =>
                      setSelectedVariantId(event.target.value)
                    }
                    className="min-h-11 w-full rounded border border-slate-500 bg-slate-800 px-3 text-white"
                  >
                    <option value="">
                      {ar ? "اختر خياراً" : "Select an option"}
                    </option>
                    {product.variants.map((variant) => (
                      <option
                        key={variant.id}
                        value={variant.id}
                        disabled={variant.stock < 1}
                      >
                        {ar ? variant.titleAr : variant.titleEn}
                        {variant.stock < 1
                          ? ar ? " — غير متوفر" : " — Out of stock"
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            {product.purchaseMode === "PURCHASABLE" && inStock && (
              <div className="flex items-center gap-3 text-white">
                <label htmlFor="product-quantity" className="text-xs">
                  {ar ? "الكمية" : "Quantity"}
                </label>
                <input
                  id="product-quantity"
                  type="number"
                  min={1}
                  max={Math.min(stockQuantity, 100)}
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(
                      Math.max(
                        1,
                        Math.min(
                          Math.min(stockQuantity, 100),
                          Number(event.target.value) || 1,
                        ),
                      ),
                    )
                  }
                  className="min-h-10 w-20 rounded px-2 text-slate-900"
                />
                <span className="text-xs">
                  {ar
                    ? `متبقي ${stockQuantity}`
                    : `${stockQuantity} available`}
                </span>
              </div>
            )}

            {product.purchaseMode === "PURCHASABLE" ? (
              <button
                onClick={handleAction}
                disabled={
                  product.purchaseMode === "PURCHASABLE" &&
                  (!inStock ||
                    (product.variants?.length > 0 && !selectedVariant))
                }
                className="w-full py-3 px-4 bg-brand-dark hover:bg-brand-hover text-white font-bold text-xs rounded-lg shadow-md flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                {product.purchaseMode === "PURCHASABLE" && inStock ? (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    <span>{t.product.addToCart}</span>
                  </>
                ) : (
                  <span>{t.product.outOfStock}</span>
                )}
              </button>
            ) : (
              <Link
                href={`/contact?product=${encodeURIComponent(product.slug)}`}
                className="w-full py-3 px-4 bg-terra hover:bg-[var(--eg-terra-dark)] text-white font-bold text-xs rounded-lg shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Phone className="w-4 h-4" aria-hidden="true" />
                <span>{t.product.contactUsForPrice}</span>
              </Link>
            )}
          </div>

          {warranty && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs">
              <ShieldCheck className="w-4 h-4 text-brand-gold flex-shrink-0" />
              <span className="font-bold text-gray-800">
                {t.product.warranty}: {warranty}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Technical specifications table (basics + structured specs) */}
      {(product.specifications?.length > 0 ||
        product.material ||
        product.color ||
        product.style ||
        product.lengthCm ||
        product.widthCm ||
        product.heightCm ||
        product.weightKg ||
        product.countryOfOrigin) && (
        <section className="dg-spec-panel space-y-4 bg-white p-6 sm:p-8">
          <h2 className="flex items-center gap-2 border-b border-gray-200 pb-3 text-base sm:text-lg font-bold text-gray-900">
            <FileSpreadsheet className="h-5 w-5 text-brand-navy" aria-hidden="true" />
            <span>{t.product.specifications}</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="dir-rtl w-full border-collapse text-xs text-right">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                  <th className="p-3 text-start">{ar ? "المواصفة / Specification" : "Specification"}</th>
                  <th className="p-3 text-start">{ar ? "القيمة / Value" : "Value"}</th>
                  <th className="p-3 text-start">{ar ? "المجموعة / Group" : "Group"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {product.material && (
                  <tr className="hover:bg-gray-50">
                    <td className="p-3 font-semibold text-gray-900">{ar ? "المادة" : "Material"}</td>
                    <td className="p-3 text-gray-700">{product.material}</td>
                    <td className="p-3 text-gray-400">{ar ? "أساسيات" : "Basics"}</td>
                  </tr>
                )}
                {product.color && (
                  <tr className="hover:bg-gray-50">
                    <td className="p-3 font-semibold text-gray-900">{ar ? "اللون" : "Color"}</td>
                    <td className="p-3 text-gray-700">{product.color}</td>
                    <td className="p-3 text-gray-400">{ar ? "أساسيات" : "Basics"}</td>
                  </tr>
                )}
                {product.style && (
                  <tr className="hover:bg-gray-50">
                    <td className="p-3 font-semibold text-gray-900">{ar ? "النمط" : "Style"}</td>
                    <td className="p-3 text-gray-700">{product.style}</td>
                    <td className="p-3 text-gray-400">{ar ? "أساسيات" : "Basics"}</td>
                  </tr>
                )}
                {(product.lengthCm || product.widthCm || product.heightCm) && (
                  <tr className="hover:bg-gray-50">
                    <td className="p-3 font-semibold text-gray-900">{ar ? "الأبعاد" : "Dimensions"}</td>
                    <td className="p-3 text-gray-700">
                      {[product.lengthCm, product.widthCm, product.heightCm]
                        .filter(Boolean)
                        .join(" × ")}{" "}
                      {ar ? "سم" : "cm"}
                    </td>
                    <td className="p-3 text-gray-400">{ar ? "أساسيات" : "Basics"}</td>
                  </tr>
                )}
                {product.weightKg && (
                  <tr className="hover:bg-gray-50">
                    <td className="p-3 font-semibold text-gray-900">{ar ? "الوزن" : "Weight"}</td>
                    <td className="p-3 text-gray-700">
                      {product.weightKg} {ar ? "كجم" : "kg"}
                    </td>
                    <td className="p-3 text-gray-400">{ar ? "أساسيات" : "Basics"}</td>
                  </tr>
                )}
                {product.countryOfOrigin && (
                  <tr className="hover:bg-gray-50">
                    <td className="p-3 font-semibold text-gray-900">{ar ? "بلد الصنع" : "Country of origin"}</td>
                    <td className="p-3 text-gray-700">{product.countryOfOrigin}</td>
                    <td className="p-3 text-gray-400">{ar ? "أساسيات" : "Basics"}</td>
                  </tr>
                )}
                {product.specifications.map((spec) => (
                  <tr key={spec.id} className="hover:bg-gray-50">
                    <td className="p-3 font-semibold text-gray-900">
                      {ar ? spec.keyAr : spec.keyEn}
                    </td>
                    <td className="p-3 text-gray-700 font-mono">
                      {ar ? spec.valueAr : spec.valueEn}
                    </td>
                    <td className="p-3 text-gray-400">
                      {ar ? spec.groupAr : spec.groupEn}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Complementary products */}
      {product.accessories?.length > 0 && (
        <section className="space-y-4">
          <h2 className="border-b border-gray-200 pb-3 text-base sm:text-lg font-bold text-gray-900">
            {t.product.accessories}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {product.accessories.map((acc) => (
              <ProductCard key={acc.id} product={acc} />
            ))}
          </div>
        </section>
      )}

      {/* Related products */}
      {product.relatedProducts?.length > 0 && (
        <section className="space-y-4">
          <h2 className="border-b border-gray-200 pb-3 text-base sm:text-lg font-bold text-gray-900">
            {t.product.relatedProducts}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {product.relatedProducts.map((related) => (
              <ProductCard key={related.id} product={related} />
            ))}
          </div>
        </section>
      )}

      {/* Related guides & links */}
      <section aria-label={ar ? "روابط ذات صلة" : "Related links"} className="dg-chiprow">
        <Link href={categoryHref} className="dg-chip"><Package aria-hidden="true" className="h-3.5 w-3.5" />{ar ? "كل منتجات القسم" : "All products in category"}</Link>
        <Link href="/projects" className="dg-chip"><FolderOpen aria-hidden="true" className="h-3.5 w-3.5" />{ar ? "أفكار ومشاريع للحدائق" : "Garden ideas & projects"}</Link>
        <Link href="/contact" className="dg-chip"><Phone aria-hidden="true" className="h-3.5 w-3.5" />{ar ? "استفسار عن هذا المنتج" : "Inquire about this product"}</Link>
      </section>

      <ProductReviews slug={product.slug} />
    </div>
  );
}
