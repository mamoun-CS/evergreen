'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthContext';

export interface WishlistProduct {
  id: string; slug: string; nameEn: string; nameAr: string; images: string[];
  basePrice: number | null; discountPrice: number | null; currency: string;
  purchaseMode: 'PURCHASABLE' | 'CONTACT_FOR_PRICE'; stockQuantity: number; isAvailable: boolean;
}
interface WishlistContextValue {
  ids: string[]; products: WishlistProduct[]; authenticated: boolean;
  has: (productId: string) => boolean; toggle: (product: WishlistProduct) => Promise<void>;
  sync: () => Promise<void>;
}
const WishlistContext = createContext<WishlistContextValue | null>(null);
const STORAGE_KEY = 'evergreen_wishlist';

function normalizeProduct(product: any): WishlistProduct {
  return { ...product, basePrice: product.basePrice == null ? null : Number(product.basePrice), discountPrice: product.discountPrice == null ? null : Number(product.discountPrice) };
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const isAuthenticated = useAuth();

  const sync = useCallback(async () => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as string[];
    setIds(stored);
    try {
      const response = await fetch('/api/wishlist', { cache: 'no-store' });
      if (response.status === 401) { setAuthenticated(false); return; }
      if (!response.ok) return;
      setAuthenticated(true);
      for (const productId of [...new Set(stored)]) {
        await fetch('/api/wishlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId }) });
      }
      const merged = await fetch('/api/wishlist', { cache: 'no-store' });
      if (!merged.ok) return;
      const result = await merged.json();
      const entries = (result.items || []).map((item: any) => normalizeProduct(item.product));
      const nextIds = entries.map((product: WishlistProduct) => product.id);
      setProducts(entries); setIds(nextIds); localStorage.setItem(STORAGE_KEY, JSON.stringify(nextIds));
    } catch { /* keep the local guest list available when the network is offline */ }
  }, []);

  // Sync once on initial mount only if authenticated
  useEffect(() => {
    try { setIds(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); } catch { localStorage.removeItem(STORAGE_KEY); }
    if (isAuthenticated) {
      void sync();
    }
  }, [isAuthenticated, sync]);

  const toggle = async (product: WishlistProduct) => {
    const exists = ids.includes(product.id);
    const previousIds = ids;
    const previousProducts = products;
    const nextIds = exists ? ids.filter((id) => id !== product.id) : [...ids, product.id];
    const nextProducts = exists ? products.filter((item) => item.id !== product.id) : [...products.filter((item) => item.id !== product.id), product];
    setIds(nextIds); setProducts(nextProducts); localStorage.setItem(STORAGE_KEY, JSON.stringify(nextIds));
    if (!authenticated) return;
    try {
      const response = await fetch(exists ? `/api/wishlist?productId=${encodeURIComponent(product.id)}` : '/api/wishlist', { method: exists ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' }, body: exists ? undefined : JSON.stringify({ productId: product.id }) });
      if (!response.ok) throw new Error('Wishlist update failed');
    } catch {
      setIds(previousIds); setProducts(previousProducts); localStorage.setItem(STORAGE_KEY, JSON.stringify(previousIds));
    }
  };
  return <WishlistContext.Provider value={{ ids, products, authenticated, has: (id) => ids.includes(id), toggle, sync }}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within a WishlistProvider');
  return context;
}
