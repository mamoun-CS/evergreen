import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/storefront";
import HomeView from "@/components/home/HomeView";
import { getActiveBanners, getHomepageBrands, getHomepageContent, getRootCategories } from "@/lib/storefront";
import { bilingualMetadata } from "@/lib/seo";

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([
    getSiteSettings(),
    prisma.pageContent.findFirst({ where: { slug: 'home', isActive: true }, select: { metaTitleAr: true, metaTitleEn: true, metaDescAr: true, metaDescEn: true, ogImage: true } }),
  ]);
  const storeNameEn = settings?.storeNameEn || 'Ever Green';
  const storeNameAr = settings?.storeNameAr || 'Ever Green';
  return bilingualMetadata({
    path: '/',
    titleEn: page?.metaTitleEn || `${storeNameEn} — Garden Ornaments & Outdoor Decor`,
    titleAr: page?.metaTitleAr || `${storeNameAr} — تحف وديكورات الحدائق`,
    descriptionEn: page?.metaDescEn || `Discover ${storeNameEn}'s collection of garden ornaments, outdoor decor, fountains, planters, lighting and garden accessories.`,
    descriptionAr: page?.metaDescAr || `اكتشف تشكيلة ${storeNameAr} من تحف وديكورات الحدائق، النوافير، التماثيل، الأصص، الإضاءة والإكسسوارات الخارجية.`,
    image: page?.ogImage,
  });
}

export default async function HomePage() {
  const [categories, content, brands, banners] = await Promise.all([
    getRootCategories().catch(() => []),
    getHomepageContent().catch(() => ({})),
    getHomepageBrands().catch(() => []),
    getActiveBanners().catch(() => []),
  ]);
  return <HomeView categories={categories} content={content} brands={brands} banners={banners} />;
}
