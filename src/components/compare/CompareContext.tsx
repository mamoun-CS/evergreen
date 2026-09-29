'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export interface CompareProductRef { slug: string; nameAr: string; nameEn: string; image: string; }
interface CompareContextValue { items: CompareProductRef[]; notice: string; toggle: (item: CompareProductRef) => void; remove: (slug: string) => void; clear: () => void; }
const CompareContext = createContext<CompareContextValue | null>(null);
const STORAGE_KEY = 'evergreen_compare';
const LIMIT = 4;

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CompareProductRef[]>([]);
  const [notice, setNotice] = useState('');
  useEffect(() => { try { setItems(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').slice(0, LIMIT)); } catch { localStorage.removeItem(STORAGE_KEY); } }, []);
  const save = (next: CompareProductRef[]) => { setItems(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); };
  const toggle = (item: CompareProductRef) => {
    setNotice('');
    if (items.some((entry) => entry.slug === item.slug)) { save(items.filter((entry) => entry.slug !== item.slug)); return; }
    if (items.length >= LIMIT) { setNotice('يمكن مقارنة أربعة منتجات كحد أقصى. / You can compare up to four products.'); return; }
    save([...items, item]);
  };
  const remove = (slug: string) => save(items.filter((item) => item.slug !== slug));
  const clear = () => save([]);
  return <CompareContext.Provider value={{ items, notice, toggle, remove, clear }}>{children}</CompareContext.Provider>;
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) throw new Error('useCompare must be used within a CompareProvider');
  return context;
}
