"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/layout/LanguageContext";
import { useCart } from "@/components/cart/CartContext";
import ProductCard from "@/components/product/ProductCard";
import ProductReviews from "@/components/product/ProductReviews";
import {
  ShoppingCart,
  ShieldCheck,
  CheckCircle,
  Download,
  FileSpreadsheet,
  Globe,
  Tag,
  ChevronRight,
  ChevronLeft,
  Share2,
  Heart,
  ArrowLeftRight,
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
  const { addToCart } = useCart();
  const wishlist = useWishlist();
  const compare = useCompare();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variants?.length === 1 ? product.variants[0].id : "",
  );

  const title = lang === "ar" ? product.nameAr : product.nameEn;
  const description =
    lang === "ar" ? product.descriptionAr : product.descriptionEn;
  const warranty =
    lang === "ar" ? product.warrantyInfoAr : product.warrantyInfoEn;
  const selectedVariant = product.variants?.find(
    (variant) => variant.id === selectedVariantId,
  );
  const stockQuantity = selectedVariant
    ? selectedVariant.stock
    : product.stockQuantity;
  const inStock = product.isAvailable && stockQuantity > 0;
  const unitPrice =
    selectedVariant?.price ?? product.discountPrice ?? product.basePrice;

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8 pb-12">
      {/* Breadcrumbs */}
      <nav
        aria-label={lang === "ar" ? "مسار التنقل" : "Breadcrumb"}
        className="flex items-center gap-2 text-xs text-gray-500"
      >
        <Link href="/" className="hover:text-brand-navy">
          {t.nav.home}
        </Link>
        {lang === "ar" ? (
          <ChevronLeft className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        <Link href="/shop" className="hover:text-brand-navy">
          {t.nav.shopByCategory}
        </Link>
        {product.categories?.[0] && (
          <>
            {lang === "ar" ? (
              <ChevronLeft className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            <Link
              href={`/shop?category=${encodeURIComponent(product.categories[0].slug)}`}
              className="hover:text-brand-navy"
            >
              {lang === "ar"
                ? product.categories[0].nameAr
                : product.categories[0].nameEn}
            </Link>
          </>
        )}
        {lang === "ar" ? (
          <ChevronLeft className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        <span className="font-bold text-gray-900 truncate max-w-xs">
          {title}
        </span>
      </nav>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm">
        {/* Left Column: Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square rounded-xl bg-gray-50 border border-gray-200 overflow-hidden">
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
                  ? lang === "ar"
                    ? "إزالة من قائمة الرغبات"
                    : "Remove from wishlist"
                  : lang === "ar"
                    ? "إضافة إلى قائمة الرغبات"
                    : "Add to wishlist"
              }
              className="absolute right-3 top-3 z-10 rounded-full bg-white p-3 text-brand-dark shadow"
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
                  ? lang === "ar"
                    ? "إزالة من المقارنة"
                    : "Remove from comparison"
                  : lang === "ar"
                    ? "إضافة إلى المقارنة"
                    : "Add to comparison"
              }
              className="absolute right-3 top-16 z-10 rounded-full bg-white p-3 text-brand-dark shadow"
            >
              <ArrowLeftRight className="h-5 w-5" />
            </button>
            <Image
              src={product.images?.[selectedImage] || "/images/logo.jpg"}
              alt={title}
              fill
              className="object-contain p-4"
              priority
            />
          </div>

          {product.images?.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
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

        {/* Right Column: Info & Actions */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {product.brand && (
                <span className="bg-brand-navy text-white text-xs font-bold px-2.5 py-0.5 rounded">
                  {product.brand.name}
                </span>
              )}
              {product.sku && (
                <span className="bg-slate-100 text-slate-700 text-xs font-mono px-2 py-0.5 rounded border">
                  SKU: {product.sku}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">
              {title}
            </h1>
          </div>

          {/* Description */}
          {description && (
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-b border-gray-100 py-3">
              {description}
            </p>
          )}

          {/* Metadata badges */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200">
              {inStock && (
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              )}
              <div>
                <span className="text-[10px] text-gray-400 block">
                  {t.product.availability}
                </span>
                <span
                  className={`font-bold ${inStock ? "text-gray-800" : "text-red-700"}`}
                >
                  {inStock ? t.product.inStock : t.product.outOfStock}
                </span>
              </div>
            </div>

            {warranty && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                <ShieldCheck className="w-4 h-4 text-brand-gold flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-gray-400 block">
                    {t.product.warranty}
                  </span>
                  <span className="font-bold text-gray-800">{warranty}</span>
                </div>
              </div>
            )}
          </div>

          {(product.material ||
            product.color ||
            product.style ||
            product.lengthCm ||
            product.widthCm ||
            product.heightCm ||
            product.weightKg) && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs">
              {product.material && (
                <>
                  <dt className="text-gray-500">
                    {lang === "ar" ? "المادة" : "Material"}
                  </dt>
                  <dd className="font-semibold text-gray-800">
                    {product.material}
                  </dd>
                </>
              )}
              {product.color && (
                <>
                  <dt className="text-gray-500">
                    {lang === "ar" ? "اللون" : "Color"}
                  </dt>
                  <dd className="font-semibold text-gray-800">
                    {product.color}
                  </dd>
                </>
              )}
              {product.style && (
                <>
                  <dt className="text-gray-500">
                    {lang === "ar" ? "النمط" : "Style"}
                  </dt>
                  <dd className="font-semibold text-gray-800">
                    {product.style}
                  </dd>
                </>
              )}
              {(product.lengthCm || product.widthCm || product.heightCm) && (
                <>
                  <dt className="text-gray-500">
                    {lang === "ar" ? "الأبعاد" : "Dimensions"}
                  </dt>
                  <dd className="font-semibold text-gray-800">
                    {[product.lengthCm, product.widthCm, product.heightCm]
                      .filter(Boolean)
                      .join(" × ")}{" "}
                    {lang === "ar" ? "سم" : "cm"}
                  </dd>
                </>
              )}
              {product.weightKg && (
                <>
                  <dt className="text-gray-500">
                    {lang === "ar" ? "الوزن" : "Weight"}
                  </dt>
                  <dd className="font-semibold text-gray-800">
                    {product.weightKg} {lang === "ar" ? "كجم" : "kg"}
                  </dd>
                </>
              )}
            </dl>
          )}

          {/* Purchase / Contact Card */}
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 font-semibold">
                {t.product.price}
              </span>
              {product.purchaseMode === "PURCHASABLE" && unitPrice ? (
                <span className="text-xl font-extrabold text-brand-gold">
                  {Number(unitPrice).toLocaleString()}{" "}
                  {product.currency || "ILS"}
                  {product.discountPrice && (
                    <span className="ms-2 text-xs font-medium text-slate-400 line-through">
                      {Number(product.basePrice).toLocaleString()}
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-xs uppercase tracking-wider bg-amber-600 text-slate-950 font-extrabold px-3 py-1 rounded">
                  {t.product.priceOnRequest}
                </span>
              )}
            </div>

            {product.purchaseMode === "PURCHASABLE" &&
              product.variants?.length > 0 && (
                <div>
                  <label
                    htmlFor="product-variant"
                    className="mb-1 block text-xs font-semibold"
                  >
                    {lang === "ar" ? "الخيار" : "Option"}
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
                      {lang === "ar" ? "اختر خياراً" : "Select an option"}
                    </option>
                    {product.variants.map((variant) => (
                      <option
                        key={variant.id}
                        value={variant.id}
                        disabled={variant.stock < 1}
                      >
                        {lang === "ar" ? variant.titleAr : variant.titleEn}
                        {variant.stock < 1
                          ? lang === "ar"
                            ? " — غير متوفر"
                            : " — Out of stock"
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            {product.purchaseMode === "PURCHASABLE" && inStock && (
              <div className="flex items-center gap-3 text-white">
                <label htmlFor="product-quantity" className="text-xs">
                  {lang === "ar" ? "الكمية" : "Quantity"}
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
                  {lang === "ar"
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
                className="w-full py-3 px-4 bg-brand-dark hover:bg-brand-hover text-white font-bold text-xs rounded-lg shadow-md flex items-center justify-center gap-2 transition-all"
              >
                {t.product.contactUsForPrice}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Technical Specifications Table */}
      {product.specifications?.length > 0 && (
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 border-b border-gray-200 pb-3 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-brand-navy" />
            <span>{t.product.specifications}</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right dir-rtl border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3 text-start">المواصفة / Specification</th>
                  <th className="p-3 text-start">القيمة / Value</th>
                  <th className="p-3 text-start">المجموعة / Group</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {product.specifications.map((spec) => (
                  <tr key={spec.id} className="hover:bg-gray-50">
                    <td className="p-3 font-semibold text-gray-900">
                      {lang === "ar" ? spec.keyAr : spec.keyEn}
                    </td>
                    <td className="p-3 text-gray-700 font-mono">
                      {lang === "ar" ? spec.valueAr : spec.valueEn}
                    </td>
                    <td className="p-3 text-gray-400">
                      {lang === "ar" ? spec.groupAr : spec.groupEn}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Compatible Accessories */}
      {product.accessories?.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 border-b border-gray-200 pb-3">
            {t.product.accessories}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {product.accessories.map((acc) => (
              <ProductCard key={acc.id} product={acc} />
            ))}
          </div>
        </section>
      )}

      {product.relatedProducts?.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 border-b border-gray-200 pb-3">
            {t.product.relatedProducts}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {product.relatedProducts.map((related) => (
              <ProductCard key={related.id} product={related} />
            ))}
          </div>
        </section>
      )}
      <ProductReviews slug={product.slug} />
    </div>
  );
}
