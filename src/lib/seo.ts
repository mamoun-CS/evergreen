import type { Metadata } from 'next';

/** One document title is emitted for crawlers (English). Arabic copy is stored
 * in extra meta tags so the language switcher can update the tab title. */
export function bilingualMetadata(input: {
  path: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  image?: string | null;
}): Metadata {
  const image = input.image || undefined;
  return {
    title: input.titleEn,
    description: input.descriptionEn,
    alternates: {
      canonical: input.path,
      languages: { en: input.path, ar: input.path },
    },
    openGraph: {
      title: input.titleEn,
      description: input.descriptionEn,
      images: image ? [{ url: image }] : [],
      locale: 'en_US',
      alternateLocale: ['ar_PS'],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: input.titleEn,
      description: input.descriptionEn,
      images: image ? [image] : [],
    },
    other: {
      'x-title-ar': input.titleAr,
      'x-title-en': input.titleEn,
      'x-description-ar': input.descriptionAr,
      'x-description-en': input.descriptionEn,
    },
  };
}
