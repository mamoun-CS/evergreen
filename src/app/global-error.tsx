'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="ar" dir="rtl"><body><main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center font-sans">
    <h1>حدث خطأ في الموقع / A site error occurred</h1><p>يرجى إعادة المحاولة. / Please try again.</p>
    <button onClick={reset}>إعادة المحاولة / Try again</button><a href="/">الرئيسية / Home</a><a href="/shop">المتجر / Shop</a>
  </main></body></html>;
}
