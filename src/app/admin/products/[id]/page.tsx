import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { PurchaseMode } from '@prisma/client';
import ProductForm from './ProductForm';

export const dynamic = 'force-dynamic';

export default async function ProductEditPage({ params }: { params: { id?: string } }) {
  await requireAdmin();
  const isEditing = params.id && params.id !== 'new';
  
  const product = isEditing ? await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      categories: { select: { id: true } },
      applications: { select: { id: true } },
      accessories: { select: { id: true } },
      variants: true,
      specifications: true,
    }
  }) : null;

  const categories = await prisma.category.findMany({ orderBy: { nameAr: 'asc' } });
  const products = await prisma.product.findMany({ select: { id: true, nameAr: true }, orderBy: { nameAr: 'asc' } });
  const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' } });
  const applications = await prisma.application.findMany({ orderBy: { nameAr: 'asc' } });

  const plainProduct = product ? {
    ...product,
    basePrice: product.basePrice ? Number(product.basePrice) : undefined,
    discountPrice: product.discountPrice ? Number(product.discountPrice) : undefined,
    lengthCm: product.lengthCm ? Number(product.lengthCm) : undefined,
    widthCm: product.widthCm ? Number(product.widthCm) : undefined,
    heightCm: product.heightCm ? Number(product.heightCm) : undefined,
    weightKg: product.weightKg ? Number(product.weightKg) : undefined,
    categoryIds: product.categories.map(c => c.id),
    accessoryIds: product.accessories.map(c => c.id),
    applicationIds: product.applications.map(c => c.id),
    variants: product.variants.map(v => ({ ...v, price: v.price ? Number(v.price) : undefined })),
    specifications: product.specifications,
  } : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{isEditing ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h1>
      </div>
      <ProductForm 
        products={products}
        key={product?.updatedAt.toISOString() || "new"}
        product={plainProduct} 
        categories={categories} 
        brands={brands} 
        applications={applications} 
      />
    </div>
  );
}
