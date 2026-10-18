import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import ImageUploader from '@/components/admin/ImageUploader';
import { requirePermission } from '@/lib/auth-middleware';
import { IdSchema, PageSchema, validate } from '@/lib/validation';
import { prisma as adminPrisma } from '@/lib/admin-prisma';

export default async function ProductSEOFormPage({ params }: { params: { id?: string } }) {
  await requireAdmin();
  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) redirect('/admin/content/seo/products');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/content/seo/products" className="text-slate-500 hover:text-slate-700"><ChevronLeft className="h-5 w-5" /></Link>
        <h1 className="text-2xl font-extrabold text-slate-900">SEO للمنتج: {product.nameAr}</h1>
      </div>
      <form action={async (formData) => {
        'use server';
        await requirePermission('update', 'content');
        const id = validate(IdSchema, params.id);
        const data = validate(PageSchema.pick({ metaTitleAr: true, metaTitleEn: true, metaDescAr: true, metaDescEn: true, ogImage: true }), {
          metaTitleAr: formData.get('metaTitleAr') as string || null,
          metaTitleEn: formData.get('metaTitleEn') as string || null,
          metaDescAr: formData.get('metaDescAr') as string || null,
          metaDescEn: formData.get('metaDescEn') as string || null,
          ogImage: formData.get('ogImage') as string || null,
        });
        await adminPrisma.product.update({ where: { id }, data });
        redirect('/admin/content/seo/products');
      }} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="bg-slate-50 p-4 rounded-lg">
          <p className="text-sm text-slate-600"><strong>المنتج:</strong> {product.nameAr} / {product.nameEn}</p>
          <p className="text-sm text-slate-600"><strong>المسار:</strong> <code className="dir-ltr">{product.slug}</code></p>
          <p className="text-sm text-slate-600"><strong>الصور الحالية:</strong> {product.images.length > 0 ? product.images[0] : 'لا توجد'}</p>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-bold mb-4">إعدادات السيو (SEO)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium">Meta Title (عربي)</label><input name="metaTitleAr" defaultValue={product.metaTitleAr || ''} placeholder="اتركه فارغاً لاستخدام اسم المنتج" className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
            <div><label className="block text-sm font-medium">Meta Title (إنجليزي)</label><input name="metaTitleEn" defaultValue={product.metaTitleEn || ''} placeholder="Leave empty to use product name" className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium">Meta Description (عربي)</label><textarea name="metaDescAr" rows={2} defaultValue={product.metaDescAr || ''} placeholder="أقصى 160 حرف - سيتم استخدام الوصف القصير إذا ترك فارغاً" className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium">Meta Description (إنجليزي)</label><textarea name="metaDescEn" rows={2} defaultValue={product.metaDescEn || ''} placeholder="Max 160 characters - will use short description if empty" className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium">OG Image URL (للنشر على فيسبوك/تويتر)</label><input type="url" name="ogImage" defaultValue={product.ogImage || ''} className="mt-1 block w-full rounded border-slate-300 text-sm text-left dir-ltr" /></div>
            <div className="md:col-span-2"><label className="mb-2 block text-sm font-medium">أو اختر من صور المنتج / Or select from product images</label><ImageUploader name="ogImage" defaultValue={product.ogImage ? [product.ogImage] : (product.images[0] ? [product.images[0]] : [])} maxFiles={1} category="products" /></div>
          </div>
        </div>
        <div className="flex justify-end pt-4"><button type="submit" className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700">حفظ السيو</button></div>
      </form>
    </div>
  );
}
