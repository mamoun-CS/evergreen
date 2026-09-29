'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/components/layout/LanguageContext';
import ProductCard from '@/components/product/ProductCard';
import { Filter, Search, RotateCcw, PackageCheck, ChevronLeft, ChevronRight } from 'lucide-react';

interface OptionItem {
  id: string;
  nameEn: string;
  nameAr: string;
  slug: string;
}

function ShopContent() {
  const { lang, t } = useLanguage();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Pagination states
  const [page, setPage] = useState<number>(parseInt(searchParams.get('page') || '1', 10));
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const limit = 30; // 30 products per page

  // Dynamic filter options from DB
  const [categories, setCategories] = useState<OptionItem[]>([]);
  const [brands, setBrands] = useState<OptionItem[]>([]);
  const [applications, setApplications] = useState<OptionItem[]>([]);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get('brand') || '');
  const [selectedApplication, setSelectedApplication] = useState(searchParams.get('application') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [discountedOnly, setDiscountedOnly] = useState(searchParams.get('discounted') === 'true');

  useEffect(() => {
    async function fetchOptions() {
      try {
        const res = await fetch('/api/equipment-finder/options');
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories || []);
          setBrands(data.brands || []);
          setApplications(data.applications || []);
        }
      } catch (err) {
        console.error('Error fetching filter options:', err);
      }
    }
    fetchOptions();
  }, []);

  const fetchFilteredProducts = async (targetPage: number, signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(false);
    try {
      const params = new URLSearchParams();
      params.set('page', targetPage.toString());
      params.set('limit', limit.toString());

      if (search) params.set('search', search);
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedBrand) params.set('brand', selectedBrand);
      if (selectedApplication) params.set('application', selectedApplication);
      if (sort !== 'newest') params.set('sort', sort);
      if (discountedOnly) params.set('discounted', 'true');

      window.history.replaceState(null, '', `/shop?${params.toString()}`);

      const res = await fetch(`/api/products?${params.toString()}`, { signal });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setTotalProducts(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else setLoadError(true);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) { console.error(err); setLoadError(true); }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => { void fetchFilteredProducts(page, controller.signal); }, search ? 300 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [page, search, selectedCategory, selectedBrand, selectedApplication, sort, discountedOnly]);

  const handleFilterChange = () => {
    setPage(1); // Reset to page 1 on filter changes
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleReset = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedBrand('');
    setSelectedApplication('');
    setSort('newest');
    setDiscountedOnly(false);
    setPage(1);
  };

  // Generate page numbers for pagination controls
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
            <button
              onClick={() => handlePageChange(1)}
              className="px-3 py-1.5 rounded-lg border text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              1
            </button>
            {startPage > 2 && <span className="px-1 text-xs text-gray-400">...</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            onClick={() => handlePageChange(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              p === page
                ? 'bg-brand-dark text-white shadow-sm'
                : 'border border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {p}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-1 text-xs text-gray-400">...</span>}
            <button
              onClick={() => handlePageChange(totalPages)}
              className="px-3 py-1.5 rounded-lg border text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              {totalPages}
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-12">
      <div className="border-b border-gray-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            {t.nav.shopByCategory}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {lang === 'ar'
              ? 'تصفح كافة الأقسام والمعدات الهندسية بوُصول مباشر للبيانات الموثوقة'
              : 'Browse all engineering equipment and products with verified data filtering'}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200 w-fit">
          <PackageCheck className="w-4 h-4 text-emerald-600" />
          <span>
            {`${t.filter.totalProducts}: ${totalProducts} | ${t.filter.pageOf} ${page} ${t.filter.of} ${totalPages}`}
          </span>
        </div>
      </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Filters */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-5 h-fit">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-brand-dark" />
              <span>{t.filter.title}</span>
            </h2>
            <button
              onClick={handleReset}
              className="text-[11px] text-gray-400 hover:text-brand-dark flex items-center gap-1 cursor-pointer transition-colors"
            >
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
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  handleFilterChange();
                }}
                placeholder={t.filter.searchPlaceholder}
                className="w-full pl-8 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
            <input type="checkbox" checked={discountedOnly} onChange={(e) => { setDiscountedOnly(e.target.checked); handleFilterChange(); }} className="h-4 w-4 rounded border-gray-300 text-brand-dark focus:ring-brand-dark" />
            {lang === 'ar' ? 'العروض والمنتجات المخفّضة فقط' : 'Discounted products only'}
          </label>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">{lang === 'ar' ? 'ترتيب النتائج' : 'Sort results'}</label>
            <select value={sort} onChange={(e) => { setSort(e.target.value); handleFilterChange(); }} className="w-full text-xs p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark focus:outline-none bg-white">
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
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                handleFilterChange();
              }}
              className="w-full text-xs p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark focus:outline-none bg-white"
            >
              <option value="">{`${t.filter.allCategories} (${categories.length})`}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {lang === 'ar' ? cat.nameAr : cat.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Filter */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">{t.filter.brandLabel}</label>
            <select
              value={selectedBrand}
              onChange={(e) => {
                setSelectedBrand(e.target.value);
                handleFilterChange();
              }}
              className="w-full text-xs p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark focus:outline-none bg-white"
            >
              <option value="">{t.filter.allBrands}</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Application Filter */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">{t.filter.applicationLabel}</label>
            <select
              value={selectedApplication}
              onChange={(e) => {
                setSelectedApplication(e.target.value);
                handleFilterChange();
              }}
              className="w-full text-xs p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark focus:outline-none bg-white"
            >
              <option value="">{t.filter.allApplications}</option>
              {applications.map((app) => (
                <option key={app.id} value={app.slug}>
                  {lang === 'ar' ? app.nameAr : app.nameEn}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Grid & Pagination */}
        <div className="md:col-span-3 space-y-8">
          {loadError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{lang === 'ar' ? 'تعذر تحميل المنتجات. يرجى إعادة المحاولة.' : 'Products could not be loaded. Please try again.'}<button type="button" onClick={() => { void fetchFilteredProducts(page); }} className="ms-3 underline">{lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}</button></div>}
          {loading ? (
            <div className="py-20 text-center text-xs text-gray-500 font-medium">
              {t.filter.loadingProducts}
            </div>
          ) : loadError ? null : products.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center text-gray-500 space-y-3 border border-gray-200">
              <p className="text-sm font-semibold">{t.filter.noProducts}</p>
              <button
                onClick={handleReset}
              className="px-4 py-2 bg-brand-dark text-white text-xs font-bold rounded-lg hover:bg-brand-dark/90 transition-colors cursor-pointer"
              >
                {t.filter.reset}
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination Bar */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200 bg-white p-4 rounded-xl border">
                  <div className="text-xs text-gray-500 font-semibold">
                    {`${t.filter.showingProducts} ${(page - 1) * limit + 1} - ${Math.min(page * limit, totalProducts)} ${t.filter.of} ${totalProducts} ${t.filter.productsUnit}`}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Previous Button */}
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      {lang === 'ar' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                      <span>{t.filter.previous}</span>
                    </button>

                    {/* Page Numbers */}
                    {renderPageNumbers()}

                    {/* Next Button */}
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === totalPages}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
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

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Loading shop...</div>}>
      <ShopContent />
    </Suspense>
  );
}
