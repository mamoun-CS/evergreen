import React, { Suspense } from 'react';
import { Metadata } from "next";
import { loadProductListing } from '@/lib/product-service';
import ShopContent from './ShopContent';
import RouteLoading from '@/components/layout/RouteLoading';
import { getSiteSettings, getFilterOptions, getPageContent } from '@/lib/storefront';
import { bilingualMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([
    getSiteSettings(),
    getPageContent('shop'),
  ]);
  const storeNameEn = settings?.storeNameEn || 'Ever Green';
  const storeNameAr = settings?.storeNameAr || 'Ever Green';
  return bilingualMetadata({
    path: '/shop',
    titleEn: page?.metaTitleEn || `${storeNameEn} — Shop`,
    titleAr: page?.metaTitleAr || `${storeNameAr} — متجر`,
    descriptionEn: page?.metaDescEn || `Browse ${storeNameEn}'s complete catalog of garden ornaments, planters, outdoor decor, and more.`,
    descriptionAr: page?.metaDescAr || `تصفح كتالوج ${storeNameAr} الكامل من تحف الحدائق والأصص والديكور الخارجي والمزيد.`,
    image: page?.ogImage,
  });
}

type ShopSearchParams = Record<string, string | string[] | undefined>;

// Start data loading inside the boundary so the existing loading shell can
// stream while the indexable product markup is still rendered on the server.
async function ShopResults({ searchParams }: { searchParams: ShopSearchParams }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') params.set(key, value);
  }
  const [initialData, filterOptions] = await Promise.all([
    loadProductListing(params, 30), getFilterOptions(),
  ]);
  return <ShopContent initialData={initialData} filterOptions={filterOptions} />;
}

export default function ShopPage({ searchParams = {} }: { searchParams?: ShopSearchParams }) {
  return <Suspense fallback={<RouteLoading />}>
    <ShopResults searchParams={searchParams} />
  </Suspense>;
}
