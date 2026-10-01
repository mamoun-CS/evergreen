import CategoryPageClient from './CategoryPageClient';

export default function CategoryPage({ params }: { params: { identifier: string } }) {
  return <CategoryPageClient identifier={params.identifier} />;
}
