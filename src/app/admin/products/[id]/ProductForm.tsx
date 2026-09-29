'use client';

import { ProductFormSchema } from '@/lib/validation';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PurchaseMode } from '@prisma/client';
import { createProduct, updateProduct, deleteProduct, ProductInput } from '../../actions/product-actions';
import { createVariant, updateVariant, deleteVariant, createSpec, deleteSpec } from '../../actions/variant-spec-actions';
import { Trash2, Plus, Image as ImageIcon, PlusCircle } from 'lucide-react';
import ImageUploader from '@/components/admin/ImageUploader';

export default function ProductForm({ product, categories, brands, applications }: any) {
  const router = useRouter();
  const isEditing = !!product;
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('basic');
  const [images, setImages] = useState<string[]>(product?.images || []);
  const [newSpec, setNewSpec] = useState({ keyAr: '', keyEn: '', valueAr: '', valueEn: '' });
  const [newVariant, setNewVariant] = useState({ titleAr: '', titleEn: '', sku: '', price: '', stock: '0' });

  async function handleSaveBasic(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const data: ProductInput = {
      nameAr: formData.get('nameAr') as string,
      nameEn: formData.get('nameEn') as string,
      slug: formData.get('slug') as string,
      sku: (formData.get('sku') as string) || undefined,
      descriptionAr: (formData.get('descriptionAr') as string) || undefined,
      descriptionEn: (formData.get('descriptionEn') as string) || undefined,
      purchaseMode: formData.get('purchaseMode') as PurchaseMode,
      currency: 'ILS',
      isAvailable: formData.get('isAvailable') === 'on',
      isFeatured: formData.get('isFeatured') === 'on',
      stockQuantity: Number(formData.get('stockQuantity')),
      basePrice: formData.get('basePrice') === '' ? undefined : Number(formData.get('basePrice')),
      discountPrice: formData.get('discountPrice') === '' ? undefined : Number(formData.get('discountPrice')),
      brandId: (formData.get('brandId') as string) || undefined,
      material: (formData.get('material') as string) || undefined,
      images: images,
      categories: formData.getAll('categories') as string[],
      applications: formData.getAll('applications') as string[],
    };

    try {
      const parsed = ProductFormSchema.safeParse(data);
      if (!parsed.success) throw new Error(parsed.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; '));
      if (isEditing) {
        await updateProduct(product.id, data);
      } else {
        const p = await createProduct(data);
        router.push(`/admin/products/${p.id}`);
        return;
      }
      alert('تم الحفظ بنجاح');
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء الحفظ');
    }
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="border-b border-slate-200">
        <nav className="flex overflow-x-auto">
          {['basic', 'images', 'variants', 'specs'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-3 text-sm font-semibold whitespace-nowrap ${tab === t ? 'border-b-2 border-emerald-600 text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'basic' ? 'المعلومات الأساسية' : t === 'images' ? 'الصور' : t === 'variants' ? 'الأنواع والمتغيرات' : 'المواصفات'}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {tab === 'basic' && (
          <form onSubmit={handleSaveBasic} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-sm font-medium">الاسم (عربي)</label><input name="nameAr" required defaultValue={product?.nameAr} className="mt-1 block w-full rounded-md border-slate-300" /></div>
              <div><label className="block text-sm font-medium">الاسم (إنجليزي)</label><input name="nameEn" required defaultValue={product?.nameEn} className="mt-1 block w-full rounded-md border-slate-300" /></div>
              <div><label className="block text-sm font-medium">الرابط (Slug)</label><input name="slug" required defaultValue={product?.slug} className="mt-1 block w-full rounded-md border-slate-300" /></div>
              <div><label className="block text-sm font-medium">رمز SKU</label><input name="sku" defaultValue={product?.sku} className="mt-1 block w-full rounded-md border-slate-300" /></div>
              
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 border-y border-slate-100 py-4 my-2">
                <div><label className="block text-sm font-medium">وضع الشراء</label>
                  <select name="purchaseMode" defaultValue={product?.purchaseMode || 'PURCHASABLE'} className="mt-1 block w-full rounded-md border-slate-300">
                    <option value="PURCHASABLE">قابل للشراء (Purchasable)</option>
                    <option value="CONTACT_FOR_PRICE">تواصل للسعر</option>
                  </select>
                </div>
                <div><label className="block text-sm font-medium">السعر الأساسي (ILS)</label><input type="number" step="0.01" name="basePrice" defaultValue={product?.basePrice} className="mt-1 block w-full rounded-md border-slate-300" /></div>
                <div><label className="block text-sm font-medium">سعر الخصم (ILS)</label><input type="number" step="0.01" name="discountPrice" defaultValue={product?.discountPrice} className="mt-1 block w-full rounded-md border-slate-300" /></div>
                <div><label className="block text-sm font-medium">الكمية في المخزون</label><input type="number" name="stockQuantity" defaultValue={product?.stockQuantity ?? 0} className="mt-1 block w-full rounded-md border-slate-300" /></div>
                <div className="flex items-center gap-2 mt-6"><input type="checkbox" name="isAvailable" defaultChecked={product ? product.isAvailable : true} id="isAvail" className="rounded text-emerald-600 focus:ring-emerald-500" /><label htmlFor="isAvail" className="text-sm font-medium">متاح للبيع (Available)</label></div>
                <div className="flex items-center gap-2 mt-6"><input type="checkbox" name="isFeatured" defaultChecked={product?.isFeatured} id="isFeat" className="rounded text-emerald-600 focus:ring-emerald-500" /><label htmlFor="isFeat" className="text-sm font-medium">منتج مميز (Featured)</label></div>
              </div>

              <div><label className="block text-sm font-medium">الوصف (عربي)</label><textarea name="descriptionAr" rows={3} defaultValue={product?.descriptionAr} className="mt-1 block w-full rounded-md border-slate-300" /></div>
              <div><label className="block text-sm font-medium">الوصف (إنجليزي)</label><textarea name="descriptionEn" rows={3} defaultValue={product?.descriptionEn} className="mt-1 block w-full rounded-md border-slate-300" /></div>
              
              <div>
                <label className="block text-sm font-medium">العلامة التجارية</label>
                <select name="brandId" defaultValue={product?.brandId || ''} className="mt-1 block w-full rounded-md border-slate-300">
                  <option value="">-- بدون --</option>
                  {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium">الخامة / المادة (Material)</label><input name="material" defaultValue={product?.material} className="mt-1 block w-full rounded-md border-slate-300" /></div>

              <div>
                <label className="block text-sm font-medium">الأقسام</label>
                <select multiple name="categories" defaultValue={product?.categoryIds || []} className="mt-1 block w-full rounded-md border-slate-300 h-32">
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
                </select>
                <p className="text-xs text-slate-500 mt-1">اضغط Ctrl لتحديد أكثر من قسم.</p>
              </div>
              <div>
                <label className="block text-sm font-medium">الاستخدامات</label>
                <select multiple name="applications" defaultValue={product?.applicationIds || []} className="mt-1 block w-full rounded-md border-slate-300 h-32">
                  {applications.map((c: any) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <button disabled={loading} type="submit" className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700">{isEditing ? 'حفظ التعديلات' : 'إنشاء المنتج'}</button>
            </div>
          </form>
        )}

        {tab === 'images' && (
          <div className="space-y-6">
            {!isEditing && <p className="text-amber-600 text-sm">يجب حفظ المنتج أولاً قبل إدارة الصور المتقدمة، أو يمكنك إضافة الصور كنصوص في الواجهة الأساسية.</p>}
            <ImageUploader value={images} onChange={setImages} multiple maxFiles={30} />
            {isEditing && (
              <div className="pt-4 border-t border-slate-100">
                <button onClick={async () => {
                  setLoading(true);
                  await updateProduct(product.id, { ...product, images, categories: product.categoryIds, applications: product.applicationIds });
                  alert('تم حفظ الصور');
                  setLoading(false);
                }} disabled={loading} className="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white">حفظ الصور في قاعدة البيانات</button>
              </div>
            )}
          </div>
        )}

        {tab === 'variants' && (
          <div className="space-y-6">
            {!isEditing ? <p className="text-sm">يجب حفظ المنتج أولاً.</p> : (
              <>
                <table className="w-full text-sm text-right divide-y divide-slate-100">
                  <thead><tr><th>الاسم (ع)</th><th>الاسم (إ)</th><th>SKU</th><th>السعر</th><th>المخزون</th><th></th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {product.variants?.map((v: any) => (
                      <tr key={v.id}>
                        <td className="py-2">{v.titleAr}</td><td>{v.titleEn}</td><td>{v.sku}</td><td>{v.price}</td><td>{v.stock}</td>
                        <td><button onClick={() => deleteVariant(v.id, product.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="bg-slate-50 p-4 rounded-lg flex gap-3 items-end">
                  <div><label className="block text-xs mb-1">الاسم (ع)</label><input value={newVariant.titleAr} onChange={e=>setNewVariant({...newVariant, titleAr: e.target.value})} className="w-full rounded border-slate-300 text-sm" /></div>
                  <div><label className="block text-xs mb-1">الاسم (إ)</label><input value={newVariant.titleEn} onChange={e=>setNewVariant({...newVariant, titleEn: e.target.value})} className="w-full rounded border-slate-300 text-sm" /></div>
                  <div><label className="block text-xs mb-1">SKU</label><input value={newVariant.sku} onChange={e=>setNewVariant({...newVariant, sku: e.target.value})} className="w-full rounded border-slate-300 text-sm" /></div>
                  <div><label className="block text-xs mb-1">السعر</label><input type="number" value={newVariant.price} onChange={e=>setNewVariant({...newVariant, price: e.target.value})} className="w-full rounded border-slate-300 text-sm" /></div>
                  <div><label className="block text-xs mb-1">المخزون</label><input type="number" value={newVariant.stock} onChange={e=>setNewVariant({...newVariant, stock: e.target.value})} className="w-full rounded border-slate-300 text-sm" /></div>
                  <button onClick={async () => {
                    await createVariant({ productId: product.id, titleAr: newVariant.titleAr, titleEn: newVariant.titleEn, sku: newVariant.sku, price: parseFloat(newVariant.price) || undefined, stock: parseInt(newVariant.stock)||0 });
                    setNewVariant({ titleAr: '', titleEn: '', sku: '', price: '', stock: '0' });
                  }} className="bg-emerald-600 text-white p-2 rounded hover:bg-emerald-700"><PlusCircle className="w-5 h-5" /></button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'specs' && (
          <div className="space-y-6">
            {!isEditing ? <p className="text-sm">يجب حفظ المنتج أولاً.</p> : (
              <>
                <table className="w-full text-sm text-right divide-y divide-slate-100">
                  <thead><tr><th>المفتاح (ع)</th><th>القيمة (ع)</th><th>المفتاح (إ)</th><th>القيمة (إ)</th><th></th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {product.specifications?.map((s: any) => (
                      <tr key={s.id}>
                        <td className="py-2">{s.keyAr}</td><td>{s.valueAr}</td><td>{s.keyEn}</td><td>{s.valueEn}</td>
                        <td><button onClick={() => deleteSpec(s.id, product.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="bg-slate-50 p-4 rounded-lg flex gap-3 items-end">
                  <div><label className="block text-xs mb-1">المفتاح (ع)</label><input value={newSpec.keyAr} onChange={e=>setNewSpec({...newSpec, keyAr: e.target.value})} className="w-full rounded border-slate-300 text-sm" /></div>
                  <div><label className="block text-xs mb-1">القيمة (ع)</label><input value={newSpec.valueAr} onChange={e=>setNewSpec({...newSpec, valueAr: e.target.value})} className="w-full rounded border-slate-300 text-sm" /></div>
                  <div><label className="block text-xs mb-1">المفتاح (إ)</label><input value={newSpec.keyEn} onChange={e=>setNewSpec({...newSpec, keyEn: e.target.value})} className="w-full rounded border-slate-300 text-sm" /></div>
                  <div><label className="block text-xs mb-1">القيمة (إ)</label><input value={newSpec.valueEn} onChange={e=>setNewSpec({...newSpec, valueEn: e.target.value})} className="w-full rounded border-slate-300 text-sm" /></div>
                  <button onClick={async () => {
                    await createSpec({ productId: product.id, keyAr: newSpec.keyAr, valueAr: newSpec.valueAr, keyEn: newSpec.keyEn, valueEn: newSpec.valueEn });
                    setNewSpec({ keyAr: '', keyEn: '', valueAr: '', valueEn: '' });
                  }} className="bg-emerald-600 text-white p-2 rounded hover:bg-emerald-700"><PlusCircle className="w-5 h-5" /></button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
