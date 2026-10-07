import HomeView from "@/components/home/HomeView";
import { getHomepageBrands, getHomepageContent, getHomepageProducts, getRootCategories } from "@/lib/storefront";

export const revalidate = 120;

export default async function HomePage() {
  const [categories, content, products, brands] = await Promise.all([
    getRootCategories().catch(() => []),
    getHomepageContent().catch(() => ({})),
    getHomepageProducts().catch(() => ({ featured: [], latest: [] })),
    getHomepageBrands().catch(() => []),
  ]);
  return <HomeView categories={categories} content={content} products={products} brands={brands} />;
}
