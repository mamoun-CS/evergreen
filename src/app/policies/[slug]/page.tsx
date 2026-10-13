import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { bilingualMetadata } from "@/lib/seo";

interface PolicyPageProps {
  params: Promise<{ slug: string }>;
}

async function getPolicyData(slug: string) {
  const policy = await prisma.storePolicy.findFirst({
    where: { slug, isActive: true },
    select: {
      titleAr: true,
      titleEn: true,
      contentAr: true,
      contentEn: true,
      slug: true,
    },
  });
  return policy;
}

export async function generateMetadata({ params }: PolicyPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const policy = await getPolicyData(resolvedParams.slug);
  
  if (!policy) return {};
  
  const metaTitleEn = `${policy.titleEn} | Ever Green`;
  const metaTitleAr = `${policy.titleAr} | Ever Green`;
  const metaDescEn = policy.contentEn?.substring(0, 160) || `Read the ${policy.titleEn} policy at Ever Green`;
  const metaDescAr = policy.contentAr?.substring(0, 160) || `اقرأ سياسة ${policy.titleAr} في Ever Green`;
  
  return bilingualMetadata({
    path: `/policies/${resolvedParams.slug}`,
    titleEn: metaTitleEn,
    titleAr: metaTitleAr,
    descriptionEn: metaDescEn,
    descriptionAr: metaDescAr,
  });
}

export default async function PolicyPage({ params }: PolicyPageProps) {
  const resolvedParams = await params;
  const policy = await getPolicyData(resolvedParams.slug);
  
  if (!policy) {
    notFound();
  }
  
  const lang = 'ar'; // Will be overridden by client-side language context
  const ar = lang === 'ar';
  const title = ar ? policy.titleAr : policy.titleEn;
  const content = ar ? policy.contentAr : policy.contentEn;
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <h1 className="text-3xl font-extrabold text-slate-900 border-b border-slate-200 pb-4">{title}</h1>
      <div className="prose prose-slate max-w-none text-slate-700 whitespace-pre-wrap leading-loose">
        {content}
      </div>
    </div>
  );
}