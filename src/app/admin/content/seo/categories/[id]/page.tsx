import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import ImageUploader from '@/components/admin/ImageUploader';
import { getClientIp, requirePermission } from '@/lib/auth-middleware';
import { CategoryFormSchema, IdSchema, PageSchema, validate } from '@/lib/validation';
import { Prisma } from '@prisma/client';

export default async function CategorySEOFormPage({ params, searchParams }: { params: { id?: string }; searchParams?: { error?: string } }) {
  await requireAdmin();
  const isEditing = params.id && params.id !== 'new';
  const category = isEditing ? await prisma.category.findUnique({ where: { id: params.id }, include: { parent: true, children: true } }) : null;
  if (isEditing && !category) redirect('/admin/content/seo/categories');

  const parentOptions = await prisma.category.findMany({ where: { parentId: null }, select: { id: true, nameAr: true, nameEn: true, slug: true } });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/content/seo/categories" className="text-slate-500 hover:text-slate-700"><ChevronLeft className="h-5 w-5" /></Link>
        <h1 className="text-2xl font-extrabold text-slate-900">{isEditing ? 'تعديل SEO للقسم' : 'إضافة قسم جديد'}</h1>
      </div>
      {searchParams?.error === 'transaction-conflict' && (
        <p role="alert" className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          تعذر حفظ القسم بسبب تعديل متزامن. يرجى مراجعة البيانات وإعادة إدخال تغييراتك ثم الحفظ مجددًا.
          {' / '}A concurrent update prevented saving. Review the current data, re-enter your changes, and save again.
        </p>
      )}
      <form action={async (formData) => {
        'use server';
        const user = await requirePermission('update', 'content');
        await requirePermission(isEditing ? 'update' : 'create', 'category');
        const id = isEditing ? validate(IdSchema, params.id) : undefined;
        const data = validate(CategoryFormSchema.extend(PageSchema.pick({ metaTitleAr: true, metaTitleEn: true, metaDescAr: true, metaDescEn: true, ogImage: true }).shape), {
          nameAr: formData.get('nameAr') as string,
          nameEn: formData.get('nameEn') as string,
          slug: formData.get('slug') as string,
          parentId: formData.get('parentId') || undefined,
          imageUrl: formData.get('imageUrl') as string || null,
          metaTitleAr: formData.get('metaTitleAr') as string || null,
          metaTitleEn: formData.get('metaTitleEn') as string || null,
          metaDescAr: formData.get('metaDescAr') as string || null,
          metaDescEn: formData.get('metaDescEn') as string || null,
          ogImage: formData.get('ogImage') as string || null,
        });
        if (data.parentId) validate(IdSchema, data.parentId);
        // Existing category actions omit SEO fields. Keep the entire form and
        // hierarchy check atomic here, including concurrent parent changes.
        let transactionConflict = false;
        try {
          await prisma.$transaction(async (tx) => {
            const previous = id ? await tx.category.findUniqueOrThrow({ where: { id } }) : null;
            if (id && data.slug !== previous!.slug) throw new Error('Cannot change an existing category slug');
            if (data.parentId) {
              const categories = await tx.category.findMany({ select: { id: true, parentId: true } });
              const parents = new Map(categories.map((entry) => [entry.id, entry.parentId]));
              const visited = new Set<string>();
              let parent: string | null = data.parentId;
              while (parent) {
                if (parent === id || visited.has(parent)) throw new Error('Cannot create a circular category hierarchy');
                if (!parents.has(parent)) throw new Error('Parent category not found');
                visited.add(parent);
                parent = parents.get(parent) ?? null;
              }
            }
            const values = { ...data, parentId: data.parentId || null };
            const updated = id
              ? await tx.category.update({ where: { id }, data: values })
              : await tx.category.create({ data: values });
            await tx.adminAuditLog.create({ data: {
              userId: user.id, action: id ? 'update' : 'create', resourceType: 'category', resourceId: updated.id,
              oldData: previous ? {
                nameAr: previous.nameAr, nameEn: previous.nameEn, slug: previous.slug, parentId: previous.parentId,
                imageUrl: previous.imageUrl, metaTitleAr: previous.metaTitleAr, metaTitleEn: previous.metaTitleEn,
                metaDescAr: previous.metaDescAr, metaDescEn: previous.metaDescEn, ogImage: previous.ogImage,
              } : undefined,
              newData: values, ipAddress: getClientIp(),
            } });
          }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        } catch (error) {
          if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 'P2034') throw error;
          transactionConflict = true;
        }
        // Next redirects throw; keep both redirects outside the error handler.
        // Do not replay the transaction or any side effects automatically.
        if (transactionConflict) redirect(`/admin/content/seo/categories/${encodeURIComponent(id ?? 'new')}?error=transaction-conflict`);
        redirect('/admin/content/seo/categories');
      }} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isEditing ? (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-500">المعرف (ID) - لا يمكن تغييره</label>
              <input type="text" disabled value={category?.id} className="mt-1 block w-full rounded border-slate-200 bg-slate-50 text-sm text-slate-500 font-mono" />
            </div>
          ) : null}
          <div><label className="block text-sm font-medium">الاسم (عربي) *</label><input required name="nameAr" defaultValue={category?.nameAr || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          <div><label className="block text-sm font-medium">الاسم (إنجليزي) *</label><input required name="nameEn" defaultValue={category?.nameEn || ''} className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
          {isEditing ? (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-500">المسار (Slug) - لا يمكن تغييره</label>
              <input type="text" disabled value={category?.slug} className="mt-1 block w-full rounded border-slate-200 bg-slate-50 text-sm text-slate-500 dir-ltr" />
              <input type="hidden" name="slug" value={category?.slug} />
            </div>
          ) : (
            <div><label className="block text-sm font-medium">المسار (Slug) *</label><input required name="slug" placeholder="garden-fountains" className="mt-1 block w-full rounded border-slate-300 text-sm dir-ltr" /></div>
          )}
          <div><label className="block text-sm font-medium">القسم الأب (للقوائم الفرعية)</label>
            <select name="parentId" defaultValue={category?.parentId || ''} className="mt-1 block w-full rounded border-slate-300 text-sm">
              <option value="">— لا يوجد (رئيسي) —</option>
              {parentOptions.filter(p => p.id !== category?.id && !category?.children?.some(c => c.id === p.id)).map(p => (
                <option key={p.id} value={p.id}>{p.nameAr} / {p.nameEn}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-bold mb-4">صورة العرض والقسم</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className="mb-2 block text-sm font-medium">صورة القسم (Display Image) / Category display image</label><ImageUploader name="imageUrl" defaultValue={category?.imageUrl ? [category.imageUrl] : []} maxFiles={1} category="categories" /></div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-bold mb-4">إعدادات السيو (SEO)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium">Meta Title (عربي)</label><input name="metaTitleAr" defaultValue={category?.metaTitleAr || ''} placeholder="اتركه فارغاً لاستخدام الاسم" className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
            <div><label className="block text-sm font-medium">Meta Title (إنجليزي)</label><input name="metaTitleEn" defaultValue={category?.metaTitleEn || ''} placeholder="Leave empty to use name" className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium">Meta Description (عربي)</label><textarea name="metaDescAr" rows={2} defaultValue={category?.metaDescAr || ''} placeholder="أقصى 160 حرف" className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium">Meta Description (إنجليزي)</label><textarea name="metaDescEn" rows={2} defaultValue={category?.metaDescEn || ''} placeholder="Max 160 characters" className="mt-1 block w-full rounded border-slate-300 text-sm" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium">OG Image URL (للنشر على فيسبوك/تويتر)</label><input type="url" name="ogImage" defaultValue={category?.ogImage || ''} className="mt-1 block w-full rounded border-slate-300 text-sm text-left dir-ltr" /></div>
          </div>
        </div>
        <div className="flex justify-end pt-4"><button type="submit" className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700">حفظ</button></div>
      </form>
    </div>
  );
}
