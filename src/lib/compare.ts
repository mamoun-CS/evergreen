export function parseCompareSlugs(input: string | null) {
  if (!input) return null;
  const slugs = input.split(',').map((value) => value.trim()).filter(Boolean);
  if (!slugs.length || slugs.length > 4 || slugs.some((slug) => slug.length > 160) || new Set(slugs).size !== slugs.length) return null;
  return slugs;
}
