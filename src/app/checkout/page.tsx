'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  const [paymentMethod, setPaymentMethod] = useState<'CASH_ON_DELIVERY' | 'LAHZA'>(DEFAULT_PAYMENT_METHOD);
  const [lahzaEnabled, setLahzaEnabled] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState('');

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

  useEffect(() => {
    fetch('/api/payments/lahza/config', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setLahzaEnabled(Boolean(data?.enabled)))
      .catch(() => setLahzaEnabled(false));
  }, []);

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(paymentMethod === 'LAHZA' ? '/api/payments/lahza/initialize' : '/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        if (paymentMethod === 'LAHZA') {
          if (!data.authorizationUrl) throw new Error('Missing secure payment URL');
          clearCart();
          window.location.assign(data.authorizationUrl);
          return;
        }
        setOrderNumber(data.order.orderNumber);
        if (data.order.paymentAccessToken) setAccessToken(data.order.paymentAccessToken);
        setSubmitted(true);
        clearCart();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || (lang === 'ar' ? 'تعذر تأكيد الطلب. يرجى المحاولة مرة أخرى.' : 'We could not confirm your order. Please try again.'));
      }
    } catch (err) {
      console.error(err);
      setError(lang === 'ar' ? 'تعذر الاتصال بالخدمة. يرجى المحاولة مرة أخرى.' : 'We could not reach the service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center bg-white rounded-2xl border border-gray-200 shadow-sm space-y-4 my-8">
        <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto" />
        <h1 className="text-xl font-bold text-gray-900">
          {lang === 'ar' ? 'تم استلام طلبك!' : 'Order received!'}
        </h1>
        <p className="text-xs text-brand-navy font-mono font-bold bg-slate-100 py-1.5 px-3 rounded inline-block">
          {orderNumber}
        </p>
        <p className="text-xs text-gray-600 leading-relaxed">
          {lang === 'ar'
            ? 'سيقوم فريقنا بمراجعة طلبك وتأكيده قريباً.'
            : 'Our team will review and confirm your order soon.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/"
            className="inline-block px-6 py-2.5 bg-brand-navy text-white text-xs font-bold rounded-lg hover:bg-slate-800"
          >
            {t.cart.continueShopping}
          </Link>
          {accessToken && (
            <Link
              href={`/track/${orderNumber}?token=${accessToken}`}
              className="inline-block px-6 py-2.5 border border-brand-navy text-brand-navy text-xs font-bold rounded-lg hover:bg-slate-50"
            >
              {lang === 'ar' ? 'تتبع الطلب' : 'Track Order'}
            </Link>
          )}
        </div>
      </div>
    );
  }

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
              {lahzaEnabled && <label className={`flex min-h-11 cursor-pointer gap-3 rounded-lg border p-3 text-xs transition-colors ${paymentMethod === 'LAHZA' ? 'border-brand-navy bg-emerald-50/40' : 'border-slate-200 hover:border-slate-400'}`}>
                <input type="radio" name="paymentMethod" value="LAHZA" checked={paymentMethod === 'LAHZA'} onChange={() => setPaymentMethod('LAHZA')} className="mt-0.5 h-4 w-4 accent-brand-navy" />
                <CreditCard className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
                <span className="space-y-1"><span className="block font-bold text-brand-navy">دفع آمن عبر لحظة / Secure Lahza payment</span><span className="block text-slate-700">سيتم التحقق من المبلغ وحالة الدفع على الخادم قبل تأكيد الطلب. / Your total is verified securely on our server before confirmation.</span></span>
              </label>}
              {paymentMethod === 'LAHZA' && <div role="status" className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs leading-5 text-emerald-950"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden /><p>بعد الضغط على زر الدفع سيتم تحويلك إلى صفحة لحظة الآمنة. هناك فقط ستدخل رقم البطاقة وتاريخ الانتهاء ورمز الأمان، وتحدد البوابة تلقائيًا إن كانت البطاقة Visa أو Mastercard.</p></div>}
            </fieldset>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-11 py-3 bg-brand-navy text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-navy focus:ring-offset-2 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'جارٍ المعالجة...' : paymentMethod === 'LAHZA' ? 'الدفع الآمن عبر لحظة / Pay securely with Lahza' : 'تأكيد طلب الدفع عند الاستلام'}</span>
              {lang === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
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
