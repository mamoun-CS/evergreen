'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { useLanguage } from '../layout/LanguageContext';
import { Filter, Search, RotateCcw, Compass, ArrowRight, ArrowLeft } from 'lucide-react';

interface OptionItem {
  id: string;
  nameEn: string;
  nameAr: string;
  slug: string;
}

const finderOptionsFetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Unable to load equipment finder options');
  return response.json();
};

export default function EquipmentFinder() {
  const { lang, t } = useLanguage();

  const { data: optionsData } = useSWR('/api/equipment-finder/options', finderOptionsFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    dedupingInterval: 300_000,
  });
  const categories: OptionItem[] = optionsData?.categories ?? [];
  const brands: OptionItem[] = optionsData?.brands ?? [];
  const applications: OptionItem[] = optionsData?.applications ?? [];

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedApplication, setSelectedApplication] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedBrand) params.set('brand', selectedBrand);
    if (selectedApplication) params.set('application', selectedApplication);

    window.location.href = `/shop?${params.toString()}`;
  };

  const handleReset = () => {
    setSelectedCategory('');
    setSelectedBrand('');
    setSelectedApplication('');
  };

  return (
    <div className="w-full bg-slate-900 text-white py-10 px-4 rounded-2xl shadow-xl border border-slate-800 my-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-brand-navy rounded-lg border border-slate-700 text-brand-gold">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              {t.equipmentFinder.title}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {t.equipmentFinder.subtitle}
            </p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1. Category Select */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              {t.equipmentFinder.selectCategory}
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-brand-gold focus:outline-none"
            >
              <option value="">{t.equipmentFinder.allCategories}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {lang === 'ar' ? cat.nameAr : cat.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Brand Select */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              {t.equipmentFinder.selectBrand}
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-brand-gold focus:outline-none"
            >
              <option value="">{t.equipmentFinder.allBrands}</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {lang === 'ar' ? b.nameAr : b.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Application Select */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              {t.equipmentFinder.selectApplication}
            </label>
            <select
              value={selectedApplication}
              onChange={(e) => setSelectedApplication(e.target.value)}
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-brand-gold focus:outline-none"
            >
              <option value="">{t.equipmentFinder.allApplications}</option>
              {applications.map((app) => (
                <option key={app.id} value={app.slug}>
                  {lang === 'ar' ? app.nameAr : app.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="sm:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.equipmentFinder.clearFilters}</span>
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-brand-dark hover:bg-brand-hover text-white font-bold text-xs rounded-lg shadow-md flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <Search className="w-4 h-4" />
              <span>{t.equipmentFinder.searchButton}</span>
              {lang === 'ar' ? (
                <ArrowLeft className="w-4 h-4" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
