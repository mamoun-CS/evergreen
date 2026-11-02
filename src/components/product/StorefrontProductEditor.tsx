import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ProductForm from '@/app/admin/products/[id]/ProductForm';

export default async function StorefrontProductEditor({ id }: { id: string }) {
 const user = await getCurrentUser();
 if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return null;
 const [product, categories, brands, applications, products] = await Promise.all([
  prisma.product.findUnique({ where: { id }, include: { categories: true, applications: true, accessories: { select: { id: true } }, variants: true, specifications: true, productImages: { orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }] } } }),
  prisma.category.findMany({ orderBy: { nameAr: 'asc' } }), prisma.brand.findMany(), prisma.application.findMany(), prisma.product.findMany({ select: { id: true, nameAr: true }, orderBy: { nameAr: 'asc' } }),
 ]);
 if (!product) return null;
 const plain = JSON.parse(JSON.stringify({ ...product, images: product.productImages.length ? product.productImages.map(image => image.path) : product.images, categoryIds: product.categories.map(item => item.id), applicationIds: product.applications.map(item => item.id), accessoryIds: product.accessories.map(item => item.id) }));
 return (
  <details className="container mx-auto my-6 px-4" dir="rtl">
   <summary className="flex cursor-pointer items-center justify-between rounded-lg bg-emerald-800 text-white p-4 font-bold shadow hover:bg-emerald-900 transition">
    <span>تعديل المنتج وحذفه — لوحة الأدمن</span>
    <span className="text-xs bg-emerald-700/80 px-3 py-1 rounded">اضغط للفتح / الإغلاق</span>
   </summary>
   <div className="mt-3">
    <ProductForm key={product.updatedAt.toISOString()} product={plain} categories={categories} brands={brands} applications={applications} products={products} storefront />
   </div>
  </details>
 );
}
