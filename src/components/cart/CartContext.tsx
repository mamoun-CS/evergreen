'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/AuthContext';

export interface CartItem {
  id: string;
  variantId?: string;
  variantTitleEn?: string;
  variantTitleAr?: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  image: string;
  price: number;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (id: string, variantId?: string) => void;
  updateCartQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  syncCart: (forceAuthenticatedSync?: boolean) => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [isInitialized, setIsInitialized] = useState(false);
  const updateControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('evergreen_cart');
      if (savedCart) setCart(JSON.parse(savedCart));
    } catch (e) {
      console.error(e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('evergreen_cart', JSON.stringify(cart));
      
      // Guests keep their cart locally. The API routes are intentionally
      // authenticated, so posting guest carts only produces avoidable 401s.
      if (!isAuthenticated) return;
      const controller = new AbortController();
      updateControllerRef.current?.abort();
      updateControllerRef.current = controller;
      const timeoutId = setTimeout(() => {
        fetch('/api/cart/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cart }),
          signal: controller.signal,
        }).catch(err => {
          if (err.name !== 'AbortError') console.error('Error syncing cart state', err);
        });
      }, 500);
      return () => {
        clearTimeout(timeoutId);
        controller.abort();
      };
    }
  }, [cart, isAuthenticated, isInitialized]);

  const addToCart = (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id && i.variantId === item.variantId);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id && i.variantId === item.variantId ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { ...item, quantity }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (id: string, variantId?: string) => {
    setCart((prev) => prev.filter((i) => !(i.id === id && i.variantId === variantId)));
  };

  const updateCartQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      const item = cart.find((entry) => cartKey(entry) === id || entry.id === id);
      if (item) removeFromCart(item.id, item.variantId);
      return;
    }
    setCart((prev) => prev.map((i) => (cartKey(i) === id ? { ...i, quantity } : i)));
  };

  const clearCart = () => setCart([]);

  const syncCart = useCallback(async (forceAuthenticatedSync = false) => {
    if (!isAuthenticated && !forceAuthenticatedSync) return;
    try {
      const currentCart = JSON.parse(localStorage.getItem('evergreen_cart') || '[]');
      const res = await fetch('/api/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart: currentCart })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.cart) {
          setCart(data.cart);
        }
      }
    } catch (e) {
      console.error('Failed to sync cart', e);
    }
  }, [isAuthenticated]);

  // Sync cart on initial mount if authenticated
  useEffect(() => {
    void syncCart();
  }, [syncCart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        syncCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function cartKey(item: Pick<CartItem, 'id' | 'variantId'>) {
  return item.variantId ? `${item.id}:${item.variantId}` : item.id;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
