import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateShippingOption } from '../actions/commerce-actions';

export const dynamic = 'force-dynamic';

export default async function ShippingPage() {
  const user = await requireAdmin(); if (!user) return null;
  const options = await prisma.shippingOption.findMany({ orderBy: { sortOrder: 'asc' } });
  return <div className="max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8"><div><h1 className="text-2xl font-extrabold text-slate-900">الشحن والاستلام</h1><p className="mt-1 text-sm text-slate-600">حدّد أسعار الضفة الغربية والداخل والاستلام من المحل.</p></div><div className="space-y-4">{options.map((option) => <form key={option.id} action={async (formData) => { 'use server'; await updateShippingOption(option.id, { price: Number(formData.get('price')), isActive: formData.get('isActive') === 'on' }); }} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr_160px_auto]"><div><h2 className="font-bold text-slate-900">{option.nameAr}</h2><p className="text-sm text-slate-500">{option.nameEn}</p></div><div><label className="block text-xs font-semibold text-slate-600">السعر (ILS)</label><input name="price" type="number" min="0" step="0.01" defaultValue={Number(option.price)} className="mt-1 min-h-11 w-full rounded border border-slate-300 px-3" /></div><div className="flex items-end gap-3"><label className="flex min-h-11 items-center gap-2 text-sm"><input name="isActive" type="checkbox" defaultChecked={option.isActive} />نشط</label><button type="submit" className="min-h-11 rounded bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2">حفظ</button></div></form>)}</div></div>;
}
