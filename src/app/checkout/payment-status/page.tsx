'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { useLanguage } from '@/components/layout/LanguageContext';

type State = { orderNumber: string; paymentStatus: string } | null;

export default function PaymentStatusPage({ searchParams }: { searchParams: { token?: string } }) {
  const { lang } = useLanguage();
  const [state, setState] = useState<State>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!searchParams.token) { setError(lang === 'ar' ? 'رابط الدفع غير صالح.' : 'Payment link is invalid.'); return; }
    let cancelled = false;
    let attempts = 0;
    const check = async () => {
      try {
        const response = await fetch(`/api/orders/payment-status?token=${encodeURIComponent(searchParams.token!)}`, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error();
        if (!cancelled) setState(data);
        attempts += 1;
        if (!cancelled && !['PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(data.paymentStatus) && attempts < 12) window.setTimeout(check, 2500);
      } catch { if (!cancelled) setError(lang === 'ar' ? 'تعذر استرداد حالة الدفع.' : 'We could not retrieve this payment status.'); }
    };
    check();
    return () => { cancelled = true; };
  }, [searchParams.token, lang]);
  const paid = state?.paymentStatus === 'PAID';
  const failed = state?.paymentStatus === 'FAILED';
  const Icon = paid ? CheckCircle2 : failed ? XCircle : Clock3;
  const title = paid ? (lang === 'ar' ? 'تم الدفع بنجاح' : 'Payment successful') : failed ? (lang === 'ar' ? 'لم يكتمل الدفع' : 'Payment was not completed') : (lang === 'ar' ? 'جارٍ التحقق من الدفع الآمن' : 'Processing your secure payment');
  const copy = paid ? (lang === 'ar' ? 'تم التحقق من دفعتك عبر لحظة وتأكيد طلبك.' : 'Your payment has been verified by Lahza and your order is confirmed.') : failed ? (lang === 'ar' ? 'لم يتم تسجيل دفعة مؤكدة. يمكنك العودة لإتمام الطلب مرة أخرى.' : 'No confirmed payment was recorded. You may return to checkout to try again.') : (lang === 'ar' ? 'نتحقق من حالة الدفع مع لحظة. ستتحدث هذه الصفحة تلقائياً لفترة قصيرة.' : 'We are confirming the payment with Lahza. This page updates automatically for a short time.');
  return <main className="max-w-xl mx-auto my-12 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm space-y-4">
    <Icon className={`mx-auto h-14 w-14 ${paid ? 'text-emerald-600' : failed || error ? 'text-red-600' : 'text-amber-500'}`} />
    <h1 className="text-xl font-bold text-gray-900">{error || title}</h1>
    {state && <p className="font-mono text-xs font-bold text-brand-navy">{state.orderNumber}</p>}
    <p className="text-sm leading-6 text-gray-600">{error || copy}</p>
    {(paid || failed || error) && <div className="flex flex-wrap justify-center gap-3">{paid && searchParams.token && <Link href={`/order-confirmation?token=${encodeURIComponent(searchParams.token)}`} className="inline-flex min-h-11 items-center rounded-lg bg-brand-navy px-5 text-sm font-bold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-navy focus:ring-offset-2">{lang === 'ar' ? 'عرض تأكيد الطلب' : 'View order confirmation'}</Link>}<Link href={failed ? '/checkout' : '/'} className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-navy focus:ring-offset-2">{failed ? (lang === 'ar' ? 'العودة لإتمام الطلب' : 'Return to checkout') : (lang === 'ar' ? 'متابعة التسوق' : 'Continue shopping')}</Link></div>}
  </main>;
}
