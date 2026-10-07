import CategoryPageClient from './CategoryPageClient';

/** A parent category is a browse step, never a mixed product listing. */
export default function CategoryPage({ params }: { params: { identifier: string } }) {
  return <CategoryPageClient identifier={params.identifier} />;
}
