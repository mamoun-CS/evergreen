export default function RouteLoading() {
  return <main dir="auto" className="mx-auto min-h-screen max-w-7xl animate-pulse px-4 py-10" aria-busy="true" aria-label="Loading / جارٍ التحميل">
    <div className="h-8 w-48 rounded bg-emerald-100" />
    <div className="mt-6 h-40 rounded-2xl bg-white shadow-sm" />
    <p className="sr-only">جارٍ التحميل / Loading</p>
  </main>;
}
