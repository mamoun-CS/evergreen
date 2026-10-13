import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { bilingualMetadata } from "@/lib/seo";
import ProjectsClient from './ProjectsClient';

interface PageProps {
  params: Promise<{ slug?: string }> | { slug?: string };
}

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
  const slug = resolvedParams.slug || 'projects';
  const page = await getPageData(slug);
  
  return bilingualMetadata({
    path: `/${slug}`,
    titleEn: page?.metaTitleEn || `${page?.titleEn || 'Projects'} | Ever Green`,
    titleAr: page?.metaTitleAr || `${page?.titleAr || 'مشاريع'} | Ever Green`,
    descriptionEn: page?.metaDescEn || `Explore ${page?.titleEn || 'Ever Green'}`,
    descriptionAr: page?.metaDescAr || `اكتشف ${page?.titleAr || 'Ever Green'}`,
    image: page?.ogImage,
  });
}

export default async function ProjectsPage({ params }: PageProps) {
  await params;
  return <ProjectsClient />;
}