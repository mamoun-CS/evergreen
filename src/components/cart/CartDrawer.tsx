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
                      src={item.image || '/logo.jpg'}
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
                href="/checkout"
                onClick={() => setIsCartOpen(false)}
                className="w-full py-2.5 px-4 bg-brand-navy text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <span>{t.cart.proceedToCheckout}</span>
                {lang === 'ar' ? (
                  <ArrowLeft className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </Link>

              {/* WhatsApp Quote / Order Button */}
              {(() => {
                const phoneTarget = '972559401774';
                const itemsList = cart
                  .map((item, idx) => {
                    const name = lang === 'ar' ? item.nameAr : item.nameEn;
                    const variant = (lang === 'ar' ? item.variantTitleAr : item.variantTitleEn) ? ` (${lang === 'ar' ? item.variantTitleAr : item.variantTitleEn})` : '';
                    return `${idx + 1}. ${name}${variant} - الكمية: ${item.quantity} - السعر التقديري: ${(item.price * item.quantity).toLocaleString()} ₪`;
                  })
                  .join('\n');
                
                const message = lang === 'ar'
                  ? `مرحباً، أود الاستفسار وطلب تسعيرة للطلبية التالية من موقع Ever Green:\n\n${itemsList}\n\nالإجمالي التقديري: ${subtotal.toLocaleString()} ₪\n\nيرجى تزويدي بالسعر النهائي وتفاصيل التوصيل.`
                  : `Hello, I would like to request pricing and confirmation for the following items from Ever Green:\n\n${itemsList}\n\nEstimated Subtotal: ${subtotal.toLocaleString()} ILS\n\nPlease provide final quote and delivery details.`;

                const whatsappUrl = `https://wa.me/${phoneTarget}?text=${encodeURIComponent(message)}`;

                return (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                    </svg>
                    <span>{lang === 'ar' ? 'إرسال الطلب عبر واتساب للتسعير' : 'Send Order via WhatsApp for Quote'}</span>
                  </a>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
