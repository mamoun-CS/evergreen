import { redirect } from 'next/navigation';

export default function CategoryPage({ params }: { params: { identifier: string } }) {
  redirect(`/shop?category=${params.identifier}`);
}
