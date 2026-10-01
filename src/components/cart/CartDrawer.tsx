'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '../layout/LanguageContext';
import { cartKey, useCart } from './CartContext';
import { X, Trash2, ShoppingCart, ArrowRight, ArrowLeft } from 'lucide-react';

export default function CartDrawer() {
  const { lang, t } = useLanguage();
  const { cart, isCartOpen, setIsCartOpen, removeFromCart, updateCartQuantity } = useCart();

  if (!isCartOpen) return null;

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-0" onClick={() => setIsCartOpen(false)} />

      <div className={`fixed inset-y-0 ${lang === 'ar' ? 'left-0' : 'right-0'} max-w-full flex`}>
        <div role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title" className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 bg-brand-dark text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-brand-gold" />
              <h2 id="cart-drawer-title" className="text-base font-bold">{t.cart.title}</h2>
              <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">
                {cart.length}
              </span>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              aria-label={lang === 'ar' ? 'إغلاق السلة' : 'Close cart'}
              className="p-1 text-slate-400 hover:text-white rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-3 py-12">
                <ShoppingCart className="w-12 h-12 text-gray-300 stroke-[1.5]" />
                <p className="text-sm font-medium">{t.cart.empty}</p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-xs bg-brand-navy text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  {t.cart.continueShopping}
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={cartKey(item)}
                  className="flex gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 relative group"
                >
                  <div className="relative w-16 h-16 rounded bg-white overflow-hidden border border-gray-200 flex-shrink-0">
                    <Image
                      src={item.image || '/images/logo.jpg'}
                      alt={lang === 'ar' ? item.nameAr : item.nameEn}
                      fill
                      className="object-contain p-1"
                    />
                  </div>

                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="text-xs font-bold text-gray-900 truncate">
                      {lang === 'ar' ? item.nameAr : item.nameEn}
                    </h3>
                    {(item.variantTitleAr || item.variantTitleEn) && <p className="text-[11px] text-gray-600">{lang === 'ar' ? item.variantTitleAr : item.variantTitleEn}</p>}
                    <p className="text-xs text-brand-accent font-semibold mt-0.5">
                      {item.price.toLocaleString()} ILS
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateCartQuantity(cartKey(item), item.quantity - 1)}
aria-label={lang === 'ar' ? `تقليل كمية ${item.nameAr}` : `Decrease quantity of ${item.nameEn}`}
                        className="w-5 h-5 border border-gray-300 rounded flex items-center justify-center text-xs font-bold hover:bg-gray-200"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateCartQuantity(cartKey(item), item.quantity + 1)}
aria-label={lang === 'ar' ? `زيادة كمية ${item.nameAr}` : `Increase quantity of ${item.nameEn}`}
                        className="w-5 h-5 border border-gray-300 rounded flex items-center justify-center text-xs font-bold hover:bg-gray-200"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.id, item.variantId)}
aria-label={lang === 'ar' ? `إزالة ${item.nameAr} من السلة` : `Remove ${item.nameEn} from cart`}
                    className="text-gray-400 hover:text-red-600 p-1 self-start"
                    title={t.cart.removeItem}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer Summary & Actions */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-3">
              <div className="flex justify-between items-center text-sm font-bold text-gray-900">
                <span>{t.cart.subtotal}</span>
                <span className="text-brand-navy text-base">
                  {subtotal.toLocaleString()} ILS
                </span>
              </div>
              <p className="text-[11px] text-gray-500">{t.cart.shippingNote}</p>

              <Link
                href="/cart"
                onClick={() => setIsCartOpen(false)}
                className="w-full py-2.5 px-4 bg-brand-navy text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <span>{lang === 'ar' ? 'مراجعة السلة' : 'Review cart'}</span>
                {lang === 'ar' ? (
                  <ArrowLeft className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
