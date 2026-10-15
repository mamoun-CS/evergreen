'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProduct, updateProduct, ProductInput } from '../../actions/product-actions';
import { createVariant, updateVariant, deleteVariant, createSpec, updateSpec, deleteSpec } from '../../actions/variant-spec-actions';
import ImageUploader from '@/components/admin/ImageUploader';

const fields = [
 ['nameAr','الاسم العربي'],['nameEn','الاسم الإنجليزي'],['slug','رابط المنتج'],['sku','SKU'],
 ['descriptionAr','الوصف العربي','textarea'],['descriptionEn','الوصف الإنجليزي','textarea'],
 ['currency','العملة'],['basePrice','السعر الأساسي','number'],['discountPrice','سعر الخصم','number'],['stockQuantity','المخزون','number'],
 ['material','الخامة'],['color','اللون'],['style','النمط'],['seriesModel','الموديل'],
 ['lengthCm','الطول (سم)','number'],['widthCm','العرض (سم)','number'],['heightCm','الارتفاع (سم)','number'],['weightKg','الوزن (كغم)','number'],
 ['countryOfOrigin','بلد المنشأ'],['warrantyInfoAr','الضمان بالعربي','textarea'],['warrantyInfoEn','الضمان بالإنجليزي','textarea'],
 ['datasheetUrl','رابط ورقة البيانات'],['manualUrl','رابط الدليل'],['externalId','معرّف الاستيراد'],['sourceUrl','رابط المصدر'],['externalSize','مقاس المصدر'],['importDetails','تفاصيل الاستيراد','textarea'],
 ['metaTitleAr','عنوان SEO العربي'],['metaTitleEn','عنوان SEO الإنجليزي'],['metaDescAr','وصف SEO العربي','textarea'],['metaDescEn','وصف SEO الإنجليزي','textarea'],['ogImage','صورة المشاركة'],
];
const inputClass = 'mt-1 w-full rounded-md border border-slate-300 p-2 text-slate-900 bg-white';
export default function ProductForm({ product, categories, brands, applications, products = [], storefront = false }: any) {
 const router = useRouter();
 const [images, setImages] = useState<string[]>(product?.images || []);
 const [busy, setBusy] = useState(false);
 const [message, setMessage] = useState('');
 async function run(action: () => Promise<any>) {
  setBusy(true); setMessage('');
  try { await action(); setMessage('تم الحفظ بنجاح'); router.refresh(); }
  catch (error) { setMessage(error instanceof Error ? error.message : 'تعذر الحفظ'); }
  finally { setBusy(false); }
 }
 function selection(name: string, label: string, options: any[], selected: string[]) {
  return <fieldset><legend className="font-medium">{label}</legend><div className="max-h-60 overflow-y-auto rounded border p-3 space-y-2">{options.map(option => <label key={option.id} className="flex gap-2 items-center min-h-11"><input type="checkbox" name={name} value={option.id} defaultChecked={selected.includes(option.id)} />{option.nameAr || option.name}</label>)}</div></fieldset>;
 }
 return <div dir="rtl" className="rounded-xl border bg-white p-4 sm:p-6 space-y-6 text-slate-900">
  <p role="status" aria-live="polite">{busy ? 'جارٍ الحفظ' : message}</p>
  <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void run(async () => {
   const data: any = { images, categories: form.getAll('categories'), applications: form.getAll('applications'), accessories: form.getAll('accessories'), brandId: form.get('brandId') || undefined, purchaseMode: form.get('purchaseMode'), isAvailable: form.has('isAvailable'), isFeatured: form.has('isFeatured') };
   for (const [key,,type] of fields) { const value = String(form.get(key) ?? '').trim(); data[key] = type === 'number' ? (value === '' ? undefined : Number(value)) : value; }
   if (product) { const saved = await updateProduct(product.id, data as ProductInput); if (storefront && saved.slug !== product.slug) router.replace(`/products/${saved.slug}`); }
   else { const saved = await createProduct(data); router.push(`/admin/products/${saved.id}`); }
  }); }} className="space-y-6">
   <div className="grid md:grid-cols-2 gap-4">{fields.map(([key,label,type]) => <label key={key} className="block text-sm font-medium">{label}{type === 'textarea' ? <textarea name={key} defaultValue={product?.[key] ?? ''} rows={3} className={inputClass} /> : <input name={key} type={type || 'text'} step={key === 'stockQuantity' ? '1' : '0.01'} min={type === 'number' ? 0 : undefined} required={['nameAr','nameEn','slug','currency','stockQuantity'].includes(key)} defaultValue={product?.[key] ?? (key === 'currency' ? 'ILS' : key === 'stockQuantity' ? 0 : '')} className={inputClass} />}</label>)}
    <label>وضع الشراء<select name="purchaseMode" defaultValue={product?.purchaseMode || 'CONTACT_FOR_PRICE'} className={inputClass}><option value="PURCHASABLE">قابل للشراء</option><option value="CONTACT_FOR_PRICE">تواصل للسعر</option></select></label>
    <label>العلامة التجارية<select name="brandId" defaultValue={product?.brandId || ''} className={inputClass}><option value="">بدون</option>{brands.map((brand: any) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
    <label className="flex items-center gap-2 min-h-11"><input name="isAvailable" type="checkbox" defaultChecked={product?.isAvailable ?? true} />متاح للبيع</label>
    <label className="flex items-center gap-2 min-h-11"><input name="isFeatured" type="checkbox" defaultChecked={product?.isFeatured} />منتج مميز</label>
    {selection('categories','التصنيفات (مطلوب)',categories,product?.categoryIds || [])}
    {selection('applications','الاستخدامات',applications,product?.applicationIds || [])}
    {selection('accessories','الإكسسوارات والمنتجات المرتبطة',products.filter((item: any) => item.id !== product?.id),product?.accessoryIds || [])}
   </div>
   <fieldset><legend className="font-medium mb-2">الصور — الصورة الأولى هي الرئيسية</legend><ImageUploader value={images} onChange={setImages} multiple maxFiles={30} />
    <div className="space-y-2 mt-3">{images.map((path,index) => <div key={path} className="flex gap-2 items-center"><span className="truncate flex-1">{path}</span><button type="button" disabled={index === 0} onClick={() => setImages([path,...images.filter((_,i) => i !== index)])} className="border rounded p-2">جعلها الرئيسية</button><button type="button" onClick={() => setImages(images.filter((_,i) => i !== index))} aria-label="Remove image" className="border rounded p-2">إزالة</button></div>)}</div>
   </fieldset>
   <button disabled={busy} className="bg-emerald-700 text-white rounded px-6 py-3">{product ? 'حفظ كل بيانات المنتج' : 'إنشاء المنتج'}</button>
  </form>
  {product && <>{['variants','specifications'].map(kind => {
   const variant = kind === 'variants';
   const rowFields = variant ? [['titleAr','الاسم العربي'],['titleEn','الاسم الإنجليزي'],['sku','SKU'],['price','السعر'],['stock','المخزون'],['options','الخيارات JSON']] : [['keyAr','اسم المواصفة بالعربي'],['valueAr','القيمة بالعربي'],['keyEn','اسم المواصفة بالإنجليزي'],['valueEn','القيمة بالإنجليزي'],['groupAr','المجموعة بالعربي'],['groupEn','المجموعة بالإنجليزي']];
   return <section key={kind} className="border-t pt-4 space-y-4"><h2 className="font-bold">{variant ? 'المتغيرات' : 'المواصفات'}</h2>{[...(product[kind] || []),null].map((row: any,index: number) => <form key={row?.id || 'new'} className="border rounded p-3 space-y-3" onSubmit={event => { event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); void run(async () => {
    const data: any = { productId: product.id }; for (const [key] of rowFields) { const value = String(form.get(key) ?? ''); data[key] = ['price','stock'].includes(key) ? (value === '' ? (key === 'stock' ? 0 : undefined) : Number(value)) : key === 'options' ? (value ? JSON.parse(value) : {}) : value; }
    if (variant) { if (row) await updateVariant(row.id, product.id, data); else await createVariant(data); }
    else { if (row) await updateSpec(row.id, product.id, data); else await createSpec(data); }
    if (!row) formElement.reset();
   }); }}><h3>{row ? `تعديل ${index + 1}` : 'إضافة جديد'}</h3><div className="grid md:grid-cols-3 gap-3">{rowFields.map(([key,label]) => <label key={key} className="text-sm">{label}<input name={key} type={['price','stock'].includes(key) ? 'number' : 'text'} min={0} step={key === 'stock' ? 1 : '0.01'} defaultValue={key === 'options' ? JSON.stringify(row?.options || {}) : row?.[key] ?? ''} className={inputClass} /></label>)}</div><button disabled={busy} className="bg-emerald-700 text-white px-4 py-2 rounded">{row ? 'حفظ التعديل' : 'إضافة'}</button>{row && <button type="button" disabled={busy} onClick={() => void run(() => variant ? deleteVariant(row.id,product.id) : deleteSpec(row.id,product.id))} className="text-red-700 px-4 py-2">حذف</button>}</form>)}</section>;
  })}</>}
 </div>;
}
