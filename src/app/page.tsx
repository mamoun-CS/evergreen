import HomeView from "@/components/home/HomeView";
import { getHomepageContent, getRootCategories } from "@/lib/storefront";

export const revalidate = 120;

export default async function HomePage() {
  const [categories, content] = await Promise.all([
    getRootCategories().catch(() => []),
    getHomepageContent().catch(() => ({})),
  ]);
  return <HomeView categories={categories} content={content} />;
}
