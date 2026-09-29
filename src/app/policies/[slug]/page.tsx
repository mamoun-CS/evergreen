import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function PolicyPage({ params }: { params: { slug: string } }) {
  const policy = await prisma.storePolicy.findUnique({
    where: { slug: params.slug, isActive: true },
  });

  if (!policy) {
    notFound();
  }

  const lang = cookies().get('lang')?.value || 'ar';
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
