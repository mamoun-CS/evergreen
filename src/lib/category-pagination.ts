export const CATEGORY_PAGE_SIZE = 30;

export function categoryPage(value: string | string[] | undefined, total: number) {
  const requested = typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : 1;
  const totalPages = Math.max(1, Math.ceil(total / CATEGORY_PAGE_SIZE));
  const page = Number.isSafeInteger(requested) ? Math.min(requested, totalPages) : 1;
  return { page, totalPages, total, skip: (page - 1) * CATEGORY_PAGE_SIZE };
}
