'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { useLanguage } from '@/components/layout/LanguageContext';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import ProductCard from '@/components/product/ProductCard';
import { Filter, Search, RotateCcw, PackageCheck, ChevronLeft, ChevronRight } from 'lucide-react';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Products could not be loaded');
  return res.json();
};

interface ProductData {
  products: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ShopContentProps {
  initialData: ProductData;
  filterOptions: { categories: any[]; brands: any[]; applications: any[] };
}

export default function ShopContent({ initialData, filterOptions }: ShopContentProps) {
  const { lang, t } = useLanguage();
  const searchParams = useSearchParams();

  // Pagination states - initialize from URL or initialData
  const [page, setPage] = useState<number>(initialData.page);
  const limit = 30;

  // Applied filters (used for API requests)
  const [appliedFilters, setAppliedFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    brand: searchParams.get('brand') || '',
    application: searchParams.get('application') || '',
    sort: searchParams.get('sort') || 'newest',
    discounted: searchParams.get('discounted') === 'true',
    featured: searchParams.get('featured') === 'true',
    slug: searchParams.get('slug') || '',
    purchaseMode: searchParams.get('purchaseMode') || '',
    availability: searchParams.get('availability') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',

  });

  // Draft filters (used for UI state before clicking Search)
  const [draftFilters, setDraftFilters] = useState(appliedFilters);

  // Public filter options arrive with the server-rendered catalog; no extra
  // browser request or filter-layout shift is needed on initial load.
  const { categories, brands, applications } = filterOptions;

  // Keep the SWR key and URL update tied only to applied filters.  Writing to
  // browser history during render can trigger redundant render/navigation work.
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    if (appliedFilters.search) params.set('search', appliedFilters.search);
    if (appliedFilters.category) params.set('category', appliedFilters.category);
    if (appliedFilters.brand) params.set('brand', appliedFilters.brand);
    if (appliedFilters.application) params.set('application', appliedFilters.application);
    if (appliedFilters.sort !== 'newest') params.set('sort', appliedFilters.sort);
    if (appliedFilters.discounted) params.set('discounted', 'true');
    if (appliedFilters.featured) params.set('featured', 'true');
    if (appliedFilters.slug) params.set('slug', appliedFilters.slug);
    if (appliedFilters.purchaseMode) params.set('purchaseMode', appliedFilters.purchaseMode);
    if (appliedFilters.availability) params.set('availability', appliedFilters.availability);
    if (appliedFilters.minPrice) params.set('minPrice', appliedFilters.minPrice);
    if (appliedFilters.maxPrice) params.set('maxPrice', appliedFilters.maxPrice);

    return params.toString();
  }, [page, appliedFilters]);

  useEffect(() => {
    window.history.replaceState(null, '', `/shop?${queryString}`);
  }, [queryString]);

  // SWR with initialData as fallback - no loading state on first render!
  const { data, isLoading: loading, error } = useSWR(
    `/api/products?${queryString}`,
    fetcher,
    {
      fallbackData: initialData,
      keepPreviousData: true,
      revalidateOnMount: false, // don't re-fetch on mount if fallbackData matches
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const products = data?.products || [];
  const totalProducts = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const loadError = !!error;

  const handleSearch = () => {
    setAppliedFilters(draftFilters);
    setPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleReset = () => {
    const defaultFilters = {
      search: '',
      category: '',
      brand: '',
      application: '',
      sort: 'newest',
      discounted: false,
      featured: false,
      slug: '',
      purchaseMode: '',
      availability: '',
      minPrice: '',
      maxPrice: '',

    };
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setPage(1);
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center gap-1">
        {startPage > 1 && (
          <>
            <button onClick={() => handlePageChange(1)} className="px-3 py-1.5 rounded-lg border text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer">1</button>
            {startPage > 2 && <span className="px-1 text-xs text-gray-400">...</span>}
          </>
        )}
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => handlePageChange(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${p === page ? 'bg-brand-dark text-white shadow-sm' : 'border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
          >
            {p}
          </button>
        ))}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-1 text-xs text-gray-400">...</span>}
            <button onClick={() => handlePageChange(totalPages)} className="px-3 py-1.5 rounded-lg border text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer">{totalPages}</button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="dg-catalog space-y-6 pb-12 pt-4">
      <Breadcrumbs items={lang === 'ar'
        ? [{ label: 'الرئيسية', href: '/' }, { label: 'المتجر', href: '/shop' }]
        : [{ label: 'Home', href: '/' }, { label: 'Shop', href: '/shop' }]} />
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-6 pt-4">
        <div className="dg-titlebar" style={{ marginTop: 0, paddingBlock: 0, borderBlock: 0 }}>
          <p className="dg-kicker">{lang === 'ar' ? 'كتالوج المنتجات' : 'Product catalog'}</p>
          <h1>{t.nav.shopByCategory}</h1>
          <p className="dg-lede">
            {lang === 'ar'
              ? 'تصفّح جميع الأقسام واختر ما يناسب مساحتك: أواني الزرع، الديكور، العشب الصناعي، الأدوات الاحترافية والمزيد.'
              : 'Browse all main product families and choose what fits your space: planters, decor, synthetic grass, professional tools and more.'}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200 w-fit">
          <PackageCheck className="w-4 h-4 text-emerald-600" />
          <span>{`${t.filter.totalProducts}: ${totalProducts} | ${t.filter.pageOf} ${page} ${t.filter.of} ${totalPages}`}</span>
        </div>
      </div>

      {/* Category Discovery Navigation */}
      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-4">
          <button
            onClick={() => {
              setDraftFilters({ ...draftFilters, category: '' });
              setAppliedFilters({ ...appliedFilters, category: '' });
              setPage(1);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-colors cursor-pointer ${!appliedFilters.category ? 'bg-brand-dark text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {t.filter.allCategories}
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => {
                setDraftFilters({ ...draftFilters, category: cat.slug });
                setAppliedFilters({ ...appliedFilters, category: cat.slug });
                setPage(1);
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-colors cursor-pointer ${appliedFilters.category === cat.slug ? 'bg-brand-dark text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {lang === 'ar' ? cat.nameAr : cat.nameEn}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Filters */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-5 h-fit">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-brand-dark" />
              <span>{t.filter.title}</span>
            </h2>
            <button onClick={handleReset} className="text-[11px] text-gray-400 hover:text-brand-dark flex items-center gap-1 cursor-pointer transition-colors">
              <RotateCcw className="w-3 h-3" />
              <span>{t.filter.reset}</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">{t.filter.searchLabel}</label>
            <div className="relative">
              <input
                type="text"
                value={draftFilters.search}
                onChange={(e) => setDraftFilters({ ...draftFilters, search: e.target.value })}
                onKeyDown={handleKeyDown}
                placeholder={t.filter.searchPlaceholder}
                className="w-full pl-8 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
            <input type="checkbox" checked={draftFilters.discounted} onChange={(e) => setDraftFilters({ ...draftFilters, discounted: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-brand-dark focus:ring-brand-dark" />
            {lang === 'ar' ? 'العروض والمنتجات المخفّضة فقط' : 'Discounted products only'}
          </label>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">{lang === 'ar' ? 'ترتيب النتائج' : 'Sort results'}</label>
            <select value={draftFilters.sort} onChange={(e) => setDraftFilters({ ...draftFilters, sort: e.target.value })} className="w-full text-xs p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark focus:outline-none bg-white">
              <option value="newest">{lang === 'ar' ? 'الأحدث' : 'Newest'}</option>
              <option value="rating">{lang === 'ar' ? 'الأعلى تقييماً' : 'Top rated'}</option>
              <option value="price-asc">{lang === 'ar' ? 'السعر: من الأقل للأعلى' : 'Price: low to high'}</option>
              <option value="price-desc">{lang === 'ar' ? 'السعر: من الأعلى للأقل' : 'Price: high to low'}</option>
              <option value="featured">{lang === 'ar' ? 'المنتجات المميزة' : 'Featured'}</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">{t.filter.categoryLabel}</label>
            <select value={draftFilters.category} onChange={(e) => setDraftFilters({ ...draftFilters, category: e.target.value })} className="w-full text-xs p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark focus:outline-none bg-white">
              <option value="">{`${t.filter.allCategories} (${categories.length})`}</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.slug}>{lang === 'ar' ? cat.nameAr : cat.nameEn}</option>
              ))}
            </select>
          </div>

          {/* Brand Filter */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">{t.filter.brandLabel}</label>
            <select value={draftFilters.brand} onChange={(e) => setDraftFilters({ ...draftFilters, brand: e.target.value })} className="w-full text-xs p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark focus:outline-none bg-white">
              <option value="">{t.filter.allBrands}</option>
              {brands.map((b: any) => (
                <option key={b.id} value={b.id}>{b.nameEn}</option>
              ))}
            </select>
          </div>

          {/* Application Filter */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">{t.filter.applicationLabel}</label>
            <select value={draftFilters.application} onChange={(e) => setDraftFilters({ ...draftFilters, application: e.target.value })} className="w-full text-xs p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark focus:outline-none bg-white">
              <option value="">{t.filter.allApplications}</option>
              {applications.map((app: any) => (
                <option key={app.id} value={app.slug}>{lang === 'ar' ? app.nameAr : app.nameEn}</option>
              ))}
            </select>
          </div>

          {/* Search Button */}
          <div className="pt-2">
            <button onClick={handleSearch} className="w-full py-2 bg-brand-dark text-white text-xs font-bold rounded-lg shadow hover:bg-brand-dark/90 transition-colors flex items-center justify-center gap-2">
              <Search className="w-4 h-4" />
              <span>{lang === 'ar' ? 'بحث' : 'Search'}</span>
            </button>
          </div>
        </div>

        {/* Product Grid & Pagination */}
        <div className="md:col-span-3 space-y-8">
          {loadError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{lang === 'ar' ? 'تعذر تحميل المنتجات. يرجى إعادة المحاولة.' : 'Products could not be loaded. Please try again.'}</div>}
          {loading ? (
            <div className="py-20 text-center text-xs text-gray-500 font-medium">
              {t.filter.loadingProducts}
            </div>
          ) : loadError ? null : products.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center text-gray-500 space-y-3 border border-gray-200">
              <p className="text-sm font-semibold">{t.filter.noProducts}</p>
              <button onClick={handleReset} className="px-4 py-2 bg-brand-dark text-white text-xs font-bold rounded-lg hover:bg-brand-dark/90 transition-colors cursor-pointer">
                {t.filter.reset}
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product: any) => (
                  <ProductCard key={product.id} product={product} imageSizes="(max-width: 639px) calc(100vw - 32px), (max-width: 767px) calc((100vw - 56px) / 2), (max-width: 1023px) 35vw, (max-width: 1279px) 23vw, 285px" />
                ))}
              </div>

              {/* Pagination Bar */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200 bg-white p-4 rounded-xl border">
                  <div className="text-xs text-gray-500 font-semibold">
                    {`${t.filter.showingProducts} ${(page - 1) * limit + 1} - ${Math.min(page * limit, totalProducts)} ${t.filter.of} ${totalProducts} ${t.filter.productsUnit}`}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handlePageChange(page - 1)} disabled={page === 1} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                      {lang === 'ar' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                      <span>{t.filter.previous}</span>
                    </button>
                    {renderPageNumbers()}
                    <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                      <span>{t.filter.next}</span>
                      {lang === 'ar' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
