'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { synchronizeWishlist } from '@/lib/wishlist-sync';

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

  const inFlight = useRef<Promise<void> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const current = useRef({ ids, products, authenticated });
  current.current = { ids, products, authenticated };

  const sync = useCallback(() => {
    if (inFlight.current) return inFlight.current;
    const requestGeneration = generation.current;
    const abort = new AbortController();
    controller.current = abort;
    const run = async () => {
      try {
        const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const stored = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
        const result = await synchronizeWishlist(stored, abort.signal);
        if (abort.signal.aborted || generation.current !== requestGeneration) return;
        if (!result) { setAuthenticated(false); current.current.authenticated = false; return; }
        const entries = result.products.map(normalizeProduct);
        current.current = { ids: result.ids, products: entries, authenticated: true };
        setProducts(entries); setIds(result.ids); setAuthenticated(true);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result.ids));
      } catch { /* Leave local IDs intact so failed synchronization can retry. */ }
    };
    const pending = run().finally(() => {
      if (inFlight.current === pending) inFlight.current = null;
    });
    inFlight.current = pending;
    return pending;
  }, []);

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const localIds = Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : [];
      setIds(localIds); current.current.ids = localIds;
    } catch { localStorage.removeItem(STORAGE_KEY); }
    setAuthenticated(false); current.current.authenticated = false;
    if (isAuthenticated) void sync();
    else { setProducts([]); current.current.products = []; }
    return () => {
      generation.current += 1;
      controller.current?.abort();
      inFlight.current = null;
    };
  }, [isAuthenticated, sync]);

  const toggle = async (product: WishlistProduct) => {
    // Do not race a local edit against an initial server merge.
    if (inFlight.current) await inFlight.current;
    const requestGeneration = generation.current;
    const { ids, products, authenticated } = current.current;
    const exists = ids.includes(product.id);
    const previousIds = ids;
    const previousProducts = products;
    const nextIds = exists ? ids.filter((id) => id !== product.id) : [...ids, product.id];
    const nextProducts = exists ? products.filter((item) => item.id !== product.id) : [...products.filter((item) => item.id !== product.id), product];
    current.current = { ids: nextIds, products: nextProducts, authenticated };
    setIds(nextIds); setProducts(nextProducts); localStorage.setItem(STORAGE_KEY, JSON.stringify(nextIds));
    if (!authenticated) return;
    try {
      const response = await fetch(exists ? `/api/wishlist?productId=${encodeURIComponent(product.id)}` : '/api/wishlist', { method: exists ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' }, body: exists ? undefined : JSON.stringify({ productId: product.id }) });
      if (!response.ok) throw new Error('Wishlist update failed');
    } catch {
      if (generation.current !== requestGeneration) return;
      current.current = { ids: previousIds, products: previousProducts, authenticated };
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
