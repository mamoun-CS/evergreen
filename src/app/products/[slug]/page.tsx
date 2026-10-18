import StorefrontProductEditor from '@/components/product/StorefrontProductEditor';
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProductDetailsClient, { type ProductDetailsClientProps } from "./ProductDetailsClient";
import { headers } from "next/headers";
import { getProductBySlug, serializeCard } from "@/lib/storefront";
import { bilingualMetadata } from "@/lib/seo";

interface ProductPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return {};
  
  // Use custom SEO fields if provided, otherwise fall back to product name/description
  const metaTitleEn = product.metaTitleEn || `${product.nameEn} | Ever Green`;
  const metaTitleAr = product.metaTitleAr || `${product.nameAr} | Ever Green`;
  const metaDescEn = product.metaDescEn || product.descriptionEn || product.descriptionAr || `${product.nameEn} from Ever Green`;
  const metaDescAr = product.metaDescAr || product.descriptionAr || product.descriptionEn || `${product.nameAr} من Ever Green`;
  const ogImage = product.ogImage || product.images[0];
  
  return bilingualMetadata({
    path: `/products/${params.slug}`,
    titleEn: metaTitleEn,
    titleAr: metaTitleAr,
    descriptionEn: metaDescEn,
    descriptionAr: metaDescAr,
    image: ogImage,
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const nonce = headers().get("x-csp-nonce") || undefined;
  const product = await getProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  const [relatedProducts, approvedReviews] = await Promise.all([
    product.categories.length
      ? prisma.product.findMany({
          where: {
            id: { not: product.id },
            categories: {
              some: {
                id: { in: product.categories.map((category) => category.id) },
              },
            },
          },
          select: {
            id: true,
            slug: true,
            sku: true,
            nameEn: true,
            nameAr: true,
            purchaseMode: true,
            basePrice: true,
            discountPrice: true,
            currency: true,
            images: true,
            isAvailable: true,
            stockQuantity: true,
            warrantyInfoEn: true,
            warrantyInfoAr: true,
            ratingAvg: true,
            ratingCount: true,
            brand: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 3,
        })
      : Promise.resolve([]),
    product.ratingCount > 0
      ? prisma.review.findMany({
          where: { productId: product.id, status: "APPROVED" },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            rating: true,
            title: true,
            body: true,
            createdAt: true,
            user: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  // Convert Decimal fields to simple numbers for client props
  const serializedProduct: ProductDetailsClientProps['product'] = {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    nameEn: product.nameEn,
    nameAr: product.nameAr,
    descriptionEn: product.descriptionEn,
    descriptionAr: product.descriptionAr,
    importDetails: product.importDetails,
    purchaseMode: product.purchaseMode,
    stockQuantity: product.stockQuantity,
    isAvailable: product.isAvailable,
    currency: product.currency,
    images: product.images,
    warrantyInfoEn: product.warrantyInfoEn,
    warrantyInfoAr: product.warrantyInfoAr,
    countryOfOrigin: product.countryOfOrigin,
    material: product.material,
    color: product.color,
    style: product.style,
    brand: product.brand ? { name: product.brand.name } : null,
    categories: product.categories.map(({ nameEn, nameAr, slug }) => ({ nameEn, nameAr, slug })),
    specifications: product.specifications.map(({ id, keyEn, keyAr, valueEn, valueAr, groupEn, groupAr }) => ({ id, keyEn, keyAr, valueEn, valueAr, groupEn, groupAr })),
    basePrice: product.basePrice ? Number(product.basePrice) : null,
    discountPrice: product.discountPrice ? Number(product.discountPrice) : null,
    lengthCm: product.lengthCm ? Number(product.lengthCm) : null,
    widthCm: product.widthCm ? Number(product.widthCm) : null,
    heightCm: product.heightCm ? Number(product.heightCm) : null,
    weightKg: product.weightKg ? Number(product.weightKg) : null,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      titleEn: variant.titleEn,
      titleAr: variant.titleAr,
      stock: variant.stock,
      price: variant.price ? Number(variant.price) : null,
    })),
    accessories: product.accessories.map((acc) => serializeCard(acc)),
    relatedProducts: relatedProducts.map((related) => ({
      ...related,
      basePrice: related.basePrice ? Number(related.basePrice) : null,
      discountPrice: related.discountPrice
        ? Number(related.discountPrice)
        : null,
    })),
  };
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
  const unitPrice =
    product.variants.length === 1
      ? product.variants[0].price
      : (product.discountPrice ?? product.basePrice);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.nameEn,
      description: product.descriptionEn || product.descriptionAr || undefined,
      image: product.images,
      sku: product.sku || undefined,
      brand: product.brand
        ? { "@type": "Brand", name: product.brand.name }
        : undefined,
      offers:
        product.purchaseMode === "PURCHASABLE" && unitPrice
          ? {
              "@type": "Offer",
              url: `${baseUrl}/products/${encodeURIComponent(product.slug)}`,
              priceCurrency: product.currency,
              price: Number(unitPrice),
              availability:
                product.isAvailable &&
                (product.variants.length
                  ? product.variants.some((v) => v.stock > 0)
                  : product.stockQuantity > 0)
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
            }
          : undefined,
      ...(product.ratingCount > 0
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: product.ratingAvg,
              reviewCount: product.ratingCount,
            },
            review: approvedReviews.map((review) => ({
              "@type": "Review",
              author: { "@type": "Person", name: review.user.name },
              reviewRating: {
                "@type": "Rating",
                ratingValue: review.rating,
                bestRating: 5,
              },
              reviewBody: review.body,
              name: review.title || undefined,
              datePublished: review.createdAt.toISOString(),
            })),
          }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
        {
          "@type": "ListItem",
          position: 2,
          name: "Shop",
          item: `${baseUrl}/shop`,
        },
        ...(product.categories[0]
          ? [
              {
                "@type": "ListItem",
                position: 3,
                name: product.categories[0].nameEn,
                item: `${baseUrl}/shop?category=${encodeURIComponent(product.categories[0].slug)}`,
              },
            ]
          : []),
        {
          "@type": "ListItem",
          position: product.categories.length ? 4 : 3,
          name: product.nameEn,
          item: `${baseUrl}/products/${encodeURIComponent(product.slug)}`,
        },
      ],
    },
  ];
  return (
    <>
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <StorefrontProductEditor id={product.id} />
      <ProductDetailsClient product={serializedProduct} />
    </>
  );
}
