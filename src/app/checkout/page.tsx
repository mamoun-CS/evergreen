'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/components/layout/LanguageContext';
import { cartKey, useCart } from '@/components/cart/CartContext';
import { ShoppingCart, CheckCircle2, ShieldCheck, ArrowLeft, ArrowRight, CreditCard, Truck } from 'lucide-react';
import { DEFAULT_PAYMENT_METHOD } from '@/lib/payment-config';

export default function CheckoutPage() {
  const { lang, t } = useLanguage();
  const { cart, clearCart } = useCart();

  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingOptions, setShippingOptions] = useState<Array<{ code: string; nameAr: string; nameEn: string; price: number }>>([]);
  const [shippingOptionCode, setShippingOptionCode] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH_ON_DELIVERY'>(DEFAULT_PAYMENT_METHOD);
  const [showCardPaymentNotice, setShowCardPaymentNotice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState('');
  const submitting = useRef(false);
  const [hasAttempt, setHasAttempt] = useState(false);

  useEffect(() => { setHasAttempt(Boolean(sessionStorage.getItem('evergreen.checkout.attempt'))); }, []);

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const selectedShipping = useMemo(() => shippingOptions.find((option) => option.code === shippingOptionCode), [shippingOptions, shippingOptionCode]);
  const total = subtotal + Number(selectedShipping?.price || 0);

  useEffect(() => {
    fetch('/api/shipping/options').then((response) => response.ok ? response.json() : null).then((data) => {
      const options = data?.options || [];
      setShippingOptions(options);
      setShippingOptionCode(options[0]?.code || '');
    }).catch(() => undefined);
  }, []);

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError('');

    try {
      let key = sessionStorage.getItem('evergreen.checkout.attempt');
      if (!key) { key = crypto.randomUUID(); sessionStorage.setItem('evergreen.checkout.attempt', key); setHasAttempt(true); }
      let guestSecret = sessionStorage.getItem('evergreen.checkout.owner');
      if (!guestSecret) { guestSecret = crypto.randomUUID(); sessionStorage.setItem('evergreen.checkout.owner', guestSecret); }
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key, 'Checkout-Guest-Secret': guestSecret },
        body: JSON.stringify({
          language: lang,
          customerName,
          email,
          phone,
          shippingAddress,
          shippingOptionCode,
          couponCode,
          items: cart.map((i) => ({
            productId: i.id,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          createAccount: createAccount ? { password } : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        clearCart();
        window.location.assign(`/order-confirmation?token=${encodeURIComponent(data.order.paymentAccessToken)}`);
        return;
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.code === 'CHECKOUT_CONFLICT') setError(lang === 'ar' ? 'بيانات الطلب أو الحساب تغيرت بعد بدء المحاولة. استعد البيانات السابقة، أو ابدأ شراءً جديدًا بعد التأكد من حالة الطلب.' : 'The checkout details or account changed. Restore the original details, or start a new purchase after checking the order status.');
        else if (data.code === 'CHECKOUT_PENDING') setError(lang === 'ar' ? 'الطلب قيد المعالجة. أعد المحاولة بالمعلومات نفسها.' : 'Your order is being processed. Retry with the same details.');
        else setError(data.error || (lang === 'ar' ? 'تعذر تأكيد الطلب. يرجى المحاولة مرة أخرى.' : 'We could not confirm your order. Please try again.'));
      }
    } catch (err) {
      console.error(err);
      setError(lang === 'ar' ? 'تعذر الاتصال بالخدمة. يرجى المحاولة مرة أخرى.' : 'We could not reach the service. Please try again.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-extrabold text-gray-900">
          {t.checkout.title}
        </h1>
      </div>

      {cart.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500 space-y-4 border border-gray-200">
          <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto stroke-[1.5]" />
          <p className="text-sm font-semibold">{t.cart.empty}</p>
          <Link
            href="/shop"
            className="inline-block px-4 py-2 bg-brand-navy text-white text-xs font-bold rounded"
          >
            {t.cart.continueShopping}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Form Column */}
          <form onSubmit={handleOrderSubmit} className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
                {t.checkout.customerDetails}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label htmlFor="checkout-customer-name" className="block font-semibold text-gray-700 mb-1">
                    {t.checkout.fullName} *
                  </label>
                  <input
                    type="text"
                    id="checkout-customer-name"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-navy focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="checkout-email" className="block font-semibold text-gray-700 mb-1">
                    {t.checkout.email} *
                  </label>
                  <input
                    type="email"
                    id="checkout-email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-navy focus:outline-none"
                  />
                  <div className="mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={createAccount} 
                        onChange={(e) => setCreateAccount(e.target.checked)} 
                        className="accent-brand-navy"
                      />
                      <span>Create account for future orders?</span>
                    </label>
                  </div>
                  {createAccount && (
                    <div className="mt-2">
                      <label htmlFor="checkout-password" className="block font-semibold text-gray-700 mb-1">
                        Password (min 10 chars) *
                      </label>
                      <input
                        type="password"
                        id="checkout-password"
                        required={createAccount}
                        minLength={10}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-navy focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="checkout-phone" className="block font-semibold text-gray-700 mb-1">
                    {t.checkout.phone} *
                  </label>
                  <input
                    type="tel"
                    id="checkout-phone"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-navy focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="checkout-shipping-address" className="block font-semibold text-gray-700 mb-1">
                    {t.checkout.shippingDetails} *
                  </label>
                  <input
                    type="text"
                    id="checkout-shipping-address"
                    required
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-navy focus:outline-none"
                    placeholder="الموقع، المدينة، الحاي"
                  />
                </div>
              </div>
            </div>

            <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">طريقة الاستلام والتوصيل</h2>
              <label htmlFor="shipping-option" className="block text-xs font-semibold text-gray-700">اختر منطقة التوصيل أو الاستلام من المحل *</label>
              <select id="shipping-option" required value={shippingOptionCode} onChange={(event) => setShippingOptionCode(event.target.value)} className="min-h-11 w-full rounded border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-brand-navy focus:outline-none">
                <option value="" disabled>اختر الطريقة</option>
                {shippingOptions.map((option) => <option key={option.code} value={option.code}>{lang === 'ar' ? option.nameAr : option.nameEn} — {Number(option.price).toLocaleString()} ILS</option>)}
              </select>
              <div><label htmlFor="coupon-code" className="block text-xs font-semibold text-gray-700 mb-1">كود الخصم (اختياري)</label><input id="coupon-code" value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} maxLength={64} className="min-h-11 w-full rounded border border-gray-300 p-2 text-sm uppercase focus:ring-2 focus:ring-brand-navy focus:outline-none" /></div>
            </section>

            <fieldset className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <legend className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 w-full">
                {t.checkout.paymentMethod}
              </legend>
              <label className={`flex min-h-11 cursor-pointer gap-3 rounded-lg border p-3 text-xs transition-colors ${paymentMethod === 'CASH_ON_DELIVERY' ? 'border-brand-navy bg-slate-50' : 'border-slate-200 hover:border-slate-400'}`}>
                <input type="radio" name="paymentMethod" value="CASH_ON_DELIVERY" checked={paymentMethod === 'CASH_ON_DELIVERY'} onChange={() => setPaymentMethod('CASH_ON_DELIVERY')} className="mt-0.5 h-4 w-4 accent-brand-navy" />
                <Truck className="h-5 w-5 shrink-0 text-brand-navy" aria-hidden />
                <span className="space-y-1"><span className="block font-bold text-brand-navy">الدفع عند الاستلام</span><span className="block text-slate-700">ادفع عند وصول الطلب أو عند استلامه من المحل.</span></span>
              </label>
              <button
                type="button"
                onClick={() => setShowCardPaymentNotice(true)}
                aria-describedby={showCardPaymentNotice ? 'card-payment-notice' : undefined}
                className="flex min-h-11 w-full cursor-pointer gap-3 rounded-lg border border-slate-200 p-3 text-start text-xs transition-colors hover:border-brand-navy hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-navy"
              >
                <CreditCard className="h-5 w-5 shrink-0 text-slate-600" aria-hidden />
                <span className="space-y-1"><span className="block font-bold text-brand-navy">الدفع بالفيزا أو البطاقة</span><span className="block text-slate-700">قريبًا / Visa and card payments — coming soon</span></span>
              </button>
              {showCardPaymentNotice && <div id="card-payment-notice" role="status" className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-950"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden /><p>الدفع بالفيزا غير متاح حاليًا. سنستقبل دفعات الفيزا والبطاقات قريبًا، ويمكنك الآن اختيار الدفع عند الاستلام.</p></div>}
            </fieldset>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-11 py-3 bg-brand-navy text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-navy focus:ring-offset-2 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'جارٍ المعالجة...' : 'تأكيد طلب الدفع عند الاستلام'}</span>
              {lang === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>

            {/* Direct WhatsApp Quote Button */}
            {(() => {
              const phoneTarget = '972559401774';
              const itemsList = cart
                .map((item, idx) => {
                  const name = lang === 'ar' ? item.nameAr : item.nameEn;
                  const variant = (lang === 'ar' ? item.variantTitleAr : item.variantTitleEn) ? ` (${lang === 'ar' ? item.variantTitleAr : item.variantTitleEn})` : '';
                  return `${idx + 1}. ${name}${variant} - الكمية: ${item.quantity} - السعر: ${(item.price * item.quantity).toLocaleString()} ₪`;
                })
                .join('\n');
              
              const contactInfo = [
                customerName ? `الاسم: ${customerName}` : '',
                phone ? `الهاتف: ${phone}` : '',
                shippingAddress ? `العنوان: ${shippingAddress}` : ''
              ].filter(Boolean).join('\n');

              const message = lang === 'ar'
                ? `مرحباً، أود إرسال طلبية للتسعير والتأكيد عبر الواتساب من موقع Ever Green:\n\n${contactInfo ? `${contactInfo}\n\n` : ''}المنتجات المختارة:\n${itemsList}\n\nالمجموع التقديري: ${total.toLocaleString()} ₪\n\nيرجى التواصل معي للتسعير النهائي والتوصيل.`
                : `Hello, I would like to request an order quote from Ever Green:\n\n${contactInfo ? `${contactInfo}\n\n` : ''}Items:\n${itemsList}\n\nEstimated Total: ${total.toLocaleString()} ILS\n\nPlease contact me with final pricing and delivery confirmation.`;

              const whatsappUrl = `https://wa.me/${phoneTarget}?text=${encodeURIComponent(message)}`;

              return (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-11 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                  <span>{lang === 'ar' ? 'إرسال الطلبية عبر واتساب للتسعير' : 'Send Order via WhatsApp for Quote'}</span>
                </a>
              );
            })()}
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            {hasAttempt && <button type="button" disabled={loading} onClick={() => { if (window.confirm(lang === 'ar' ? 'بدء شراء جديد قد ينشئ طلبًا إضافيًا إذا نجحت المحاولة السابقة. هل تريد المتابعة؟' : 'Starting a new purchase can create another order if the previous attempt succeeded. Continue?')) { sessionStorage.removeItem('evergreen.checkout.attempt'); setHasAttempt(false); setError(''); } }} className="text-xs underline">{lang === 'ar' ? 'بدء شراء جديد' : 'Start a new purchase'}</button>}
          </form>

          {/* Cart Summary Column */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4 h-fit">
            <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
              ملخص السلة / Cart Summary
            </h2>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={cartKey(item)} className="flex justify-between text-xs border-b border-gray-100 pb-2">
                  <div>
                    <p className="font-bold text-gray-800">{lang === 'ar' ? item.nameAr : item.nameEn}</p>
                    {(item.variantTitleAr || item.variantTitleEn) && <p className="text-[11px] text-gray-500">{lang === 'ar' ? item.variantTitleAr : item.variantTitleEn}</p>}
                    <p className="text-[10px] text-gray-400">الكمية: {item.quantity}</p>
                  </div>
                  <span className="font-semibold text-brand-navy">
                    {(item.price * item.quantity).toLocaleString()} ILS
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-sm text-gray-900">
              <span>المجموع الكلي:</span>
              <span className="text-brand-navy text-base">{total.toLocaleString()} ILS</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
