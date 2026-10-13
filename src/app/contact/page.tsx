import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/storefront";
import { bilingualMetadata } from "@/lib/seo";
import ContactClient from './ContactClient';

async function getPageData(slug: string) {
  const page = await prisma.pageContent.findFirst({
    where: { slug, isActive: true },
    select: {
      titleAr: true,
      titleEn: true,
      metaTitleAr: true,
      metaTitleEn: true,
      metaDescAr: true,
      metaDescEn: true,
      ogImage: true,
    },
  });
  return page;
}

export async function generateMetadata({ params }: { params: Promise<{ slug?: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug || 'contact';
  const page = await getPageData(slug);
  
  return bilingualMetadata({
    path: `/${slug}`,
    titleEn: page?.metaTitleEn || `${page?.titleEn || 'Contact'} | Ever Green`,
    titleAr: page?.metaTitleAr || `${page?.titleAr || 'تواصل معنا'} | Ever Green`,
    descriptionEn: page?.metaDescEn || `Contact ${page?.titleEn || 'Ever Green'}`,
    descriptionAr: page?.metaDescAr || `تواصل مع ${page?.titleAr || 'Ever Green'}`,
    image: page?.ogImage,
  });
}

export default async function ContactPage() {
  const settings = await getSiteSettings();
  return <ContactClient settings={settings} />;
}