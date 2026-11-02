import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { Plus, Pencil, Eye, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import DeleteProductButton from './DeleteProductButton';
import AdminProductSearch from './AdminProductSearch';
import { PurchaseMode, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 50;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string };
}) {
  await requireAdmin();
  const page = Math.max(1, parseInt(searchParams.page || '1', 10));
  const q = searchParams.q?.trim() || '';
  const skip = (page - 1) * PAGE_SIZE;

  const where: Prisma.ProductWhereInput = q
    ? {
        OR: [
          { nameAr: { contains: q, mode: 'insensitive' } },
          { nameEn: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
          { externalId: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        sku: true,
        slug: true,
        purchaseMode: true,
        basePrice: true,
        discountPrice: true,
        currency: true,
        stockQuantity: true,
        isAvailable: true,
        isFeatured: true,
        images: true,
        _count: { select: { variants: true } },
      },
      take: PAGE_SIZE,
      skip,
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const getPageUrl = (targetPage: number) => {
    const params = new URLSearchParams();
    if (targetPage > 1) params.set('page', targetPage.toString());
    if (q) params.set('q', q);
    const qs = params.toString();
    return `/admin/products${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="w-full p-2 sm:p-4 lg:p-6 space-y-4">
      <div className="sm:flex sm:items-center sm:justify-between px-1">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">المنتجات</h1>
          <p className="mt-2 text-sm text-slate-700">
            إدارة كتالوج المنتجات، الأسعار، والمخزون.
            {q ? (
              <span className="font-semibold text-emerald-800 mr-1">
                (نتائج البحث عن: «{q}» — {total} منتج)
              </span>
            ) : (
              ` (${total} منتج)`
            )}
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >
            <Plus className="h-4 w-4" /> إضافة منتج جديد
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 px-1">
        <AdminProductSearch initialSearch={q} />
      </div>
      
      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-right divide-y divide-slate-200 table-fixed">
            <thead className="bg-slate-50 text-xs font-bold text-slate-700">
              <tr>
                <th className="py-3 px-4 w-[38%] min-w-[280px]">المنتج</th>
                <th className="py-3 px-3 w-[12%] min-w-[110px]">النوع</th>
                <th className="py-3 px-3 w-[14%] min-w-[120px]">السعر</th>
                <th className="py-3 px-3 w-[12%] min-w-[90px]">المخزون</th>
                <th className="py-3 px-3 w-[8%] text-center min-w-[70px]">متاح</th>
                <th className="py-3 px-3 w-[8%] text-center min-w-[70px]">مميز</th>
                <th className="py-3 px-4 w-[8%] text-left min-w-[130px]">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {products.map((product) => {
                let decodedSku = product.sku || '';
                try {
                  if (decodedSku.includes('%')) decodedSku = decodeURIComponent(decodedSku);
                } catch {
                  // fallback
                }
                let decodedSlug = product.slug || '';
                try {
                  if (decodedSlug.includes('%')) decodedSlug = decodeURIComponent(decodedSlug);
                } catch {
                  // fallback
                }

                return (
                <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3 w-full">
                      {product.images[0] ? (
                        <Link href={`/admin/products/${product.id}`} className="h-11 w-11 flex-shrink-0 rounded-lg overflow-hidden border border-slate-200 hover:opacity-85 transition bg-slate-50">
                          <img className="h-full w-full object-cover" src={product.images[0]} alt="" width={44} height={44} loading="lazy" decoding="async" />
                        </Link>
                      ) : (
                        <div className="h-11 w-11 flex-shrink-0 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 text-xs">
                          بدون
                        </div>
                      )}
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <Link 
                          href={`/admin/products/${product.id}`} 
                          className="marquee-container block font-semibold text-slate-900 hover:text-emerald-700 transition text-sm" 
                          title={product.nameAr}
                        >
                          <span className="marquee-content inline-block">
                            {product.nameAr}
                          </span>
                        </Link>
                        {product.nameEn && product.nameEn !== product.nameAr && (
                          <div className="marquee-container block text-xs text-slate-500 font-medium mt-0.5" title={product.nameEn}>
                            <span className="marquee-content inline-block">
                              {product.nameEn}
                            </span>
                          </div>
                        )}
                        <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5" title={`${decodedSku ? `SKU: ${decodedSku} · ` : ''}${decodedSlug}`}>
                          {decodedSku ? `SKU: ${decodedSku} · ` : ''}{decodedSlug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-600">
                    <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 font-medium">
                      {product.purchaseMode === PurchaseMode.PURCHASABLE ? 'قابل للشراء' : 'تواصل للسعر'}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-900 text-xs sm:text-sm">
                    {product.purchaseMode === PurchaseMode.PURCHASABLE ? (
                      <span>{Number(product.discountPrice || product.basePrice || 0).toLocaleString()} {product.currency}</span>
                    ) : (
                      <span className="text-slate-400 text-xs">عند الطلب</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-600 font-medium">
                    {product.stockQuantity}
                    {product._count.variants > 0 && (
                      <span className="block text-[10px] text-slate-400">+{product._count.variants} متغيرات</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {product.isAvailable ? (
                      <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-slate-300 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {product.isFeatured ? (
                      <span className="inline-flex items-center justify-center rounded-full bg-amber-50 p-1 text-amber-600">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-left">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
                        title="تعديل هذا المنتج"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        تعديل
                      </Link>
                      <Link
                        href={`/products/${product.slug}`}
                        target="_blank"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                        title="معاينة في المتجر"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <DeleteProductButton id={product.id} name={product.nameAr} />
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {products.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-500">
            {q ? `لا توجد نتائج مطابقة لبحثك «${q}».` : 'لا توجد منتجات.'}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">صفحة {page} من {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={getPageUrl(page - 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <ChevronRight className="h-4 w-4" /> السابق
              </Link>
            )}
            {page < totalPages && (
              <Link href={getPageUrl(page + 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                التالي <ChevronLeft className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
