'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

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
  syncCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [isInitialized, setIsInitialized] = useState(false);

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
      
      // Debounce the backend sync slightly to avoid spamming if multiple rapid changes occur
      const timeoutId = setTimeout(() => {
        fetch('/api/cart/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cart })
        }).catch(err => console.error('Error syncing cart state', err));
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [cart, isInitialized]);

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

  const syncCart = async () => {
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
  };

  // Sync cart on initial mount if authenticated
  useEffect(() => {
    syncCart();
  }, []);

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
