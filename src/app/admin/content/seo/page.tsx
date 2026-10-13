import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import Link from 'next/link';
import { Search, Edit, Globe } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SEOManagementPage() {
  await requireAdmin();
  const [pages, categories, products] = await Promise.all([
    prisma.pageContent.findMany({ select: { id: true, slug: true, titleAr: true, titleEn: true, metaTitleAr: true, metaTitleEn: true, metaDescAr: true, metaDescEn: true, ogImage: true, isActive: true } }),
    prisma.category.findMany({ select: { id: true, slug: true, nameAr: true, nameEn: true, metaTitleAr: true, metaTitleEn: true, metaDescAr: true, metaDescEn: true, ogImage: true, imageUrl: true }, orderBy: { nameAr: 'asc' } }),
    prisma.product.findMany({ select: { id: true, slug: true, nameAr: true, nameEn: true, metaTitleAr: true, metaTitleEn: true, metaDescAr: true, metaDescEn: true, ogImage: true, isAvailable: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">إدارة السيو (SEO)</h1>
          <p className="mt-1 text-sm text-slate-500">إدارة العناوين والوصف الوصفي وصور المشاركة لكل الصفحات والأقسام والمنتجات.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/admin/content/seo/pages" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-emerald-400 transition-colors">
          <div className="flex items-center gap-3"><Globe className="h-6 w-6 text-emerald-600" /><h3 className="font-bold text-slate-900">الصفحات (Pages)</h3></div>
          <p className="mt-2 text-sm text-slate-500">{pages.length} صفحة</p>
        </Link>
        <Link href="/admin/content/seo/categories" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-emerald-400 transition-colors">
          <div className="flex items-center gap-3"><Search className="h-6 w-6 text-blue-600" /><h3 className="font-bold text-slate-900">الأقسام (Categories)</h3></div>
          <p className="mt-2 text-sm text-slate-500">{categories.length} قسم</p>
        </Link>
        <Link href="/admin/content/seo/products" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-emerald-400 transition-colors">
          <div className="flex items-center gap-3"><Edit className="h-6 w-6 text-purple-600" /><h3 className="font-bold text-slate-900">المنتجات (Products)</h3></div>
          <p className="mt-2 text-sm text-slate-500">{products.length} منتج (أحدث 100)</p>
        </Link>
      </div>
    </div>
  );
}