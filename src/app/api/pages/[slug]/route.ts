import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  if (!['about', 'contact', 'projects'].includes(params.slug)) return new NextResponse('Not found', { status: 404 });
  const page = await prisma.pageContent.findUnique({
    where: { slug: params.slug, isActive: true },
    select: {
      id: true,
      slug: true,
      titleAr: true,
      titleEn: true,
      contentAr: true,
      contentEn: true,
      images: true,
      metaTitleAr: true,
      metaTitleEn: true,
      metaDescAr: true,
      metaDescEn: true,
      ogImage: true,
      isActive: true,
    },
  });
  
  if (!page) {
    return new NextResponse('Not found', { status: 404 });
  }
  
  return NextResponse.json({ page });
}
