export default function LoadingCategory() {
  return <main className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6"><div className="h-8 w-48 animate-pulse rounded bg-slate-200" /><div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-72 animate-pulse rounded-xl bg-slate-100" />)}</div></main>;
}
