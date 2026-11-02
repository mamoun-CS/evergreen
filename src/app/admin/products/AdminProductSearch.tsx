'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';

export default function AdminProductSearch({ initialSearch = '' }: { initialSearch?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();

  function handleSearch(term: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (term.trim()) {
      params.set('q', term.trim());
      params.set('page', '1');
    } else {
      params.delete('q');
      params.set('page', '1');
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleClear() {
    setQuery('');
    handleSearch('');
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSearch(query);
      }}
      className="relative flex flex-1 max-w-md items-center"
      role="search"
    >
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
        <Search className={`h-4 w-4 ${isPending ? 'animate-pulse text-emerald-600' : ''}`} />
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ابحث بالاسم العربي، الإنجليزي، SKU، أو المعرف..."
        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-10 pl-10 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="مسح البحث"
          className="absolute inset-y-0 left-12 flex items-center text-slate-400 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="mr-2 inline-flex items-center rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 transition disabled:opacity-50"
      >
        {isPending ? 'بحث...' : 'بحث'}
      </button>
    </form>
  );
}
