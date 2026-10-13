import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { bilingualMetadata } from "@/lib/seo";
import CategoryPageClient from './CategoryPageClient';

interface CategoryPageProps {
  params: {
    identifier: string;
  };
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const category = await prisma.category.findFirst({
    where: { OR: [{ slug: params.identifier }, { id: params.identifier }] },
    select: {
      nameAr: true,
      nameEn: true,
      metaTitleAr: true,
      metaTitleEn: true,
      metaDescAr: true,
      metaDescEn: true,
      ogImage: true,
      imageUrl: true,
    },
  });
  
  if (!category) return {};
  
  const metaTitleEn = category.metaTitleEn || `${category.nameEn} | Ever Green`;
  const metaTitleAr = category.metaTitleAr || `${category.nameAr} | Ever Green`;
  const metaDescEn = category.metaDescEn || `Explore ${category.nameEn} products at Ever Green`;
  const metaDescAr = category.metaDescAr || `اكتشف منتجات ${category.nameAr} في Ever Green`;
  const ogImage = category.ogImage || category.imageUrl;

  return bilingualMetadata({
    path: `/category/${params.identifier}`,
    titleEn: metaTitleEn,
    titleAr: metaTitleAr,
    descriptionEn: metaDescEn,
    descriptionAr: metaDescAr,
    image: ogImage,
  });
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const category = await prisma.category.findFirst({
    where: { OR: [{ slug: params.identifier }, { id: params.identifier }] },
    select: { id: true },
  });
  
  if (!category) {
    notFound();
  }
  
  return <CategoryPageClient identifier={params.identifier} />;
}