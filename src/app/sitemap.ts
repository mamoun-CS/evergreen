import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const [products, categories, policies, pages] = await Promise.all([
    prisma.product.findMany({ where:{isAvailable:true}, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ select: { slug: true } }),
    prisma.storePolicy.findMany({where:{isActive:true},select:{slug:true,updatedAt:true}}),
    prisma.pageContent.findMany({where:{isActive:true,slug:{in:['about','contact']}},select:{slug:true,updatedAt:true}}),
  ]);
  return [
    { url: baseUrl, lastModified: new Date() },
    { url: `${baseUrl}/shop`, lastModified: new Date() },
    ...categories.map((category) => ({ url: `${baseUrl}/shop?category=${encodeURIComponent(category.slug)}`, lastModified: new Date() })),
    ...products.map((product) => ({ url: `${baseUrl}/products/${encodeURIComponent(product.slug)}`, lastModified: product.updatedAt })),
    ...policies.map((policy) => ({url:`${baseUrl}/policies/${encodeURIComponent(policy.slug)}`,lastModified:policy.updatedAt})),
    ...pages.map((page) => ({url:`${baseUrl}/${encodeURIComponent(page.slug)}`,lastModified:page.updatedAt})),
  ];
}
