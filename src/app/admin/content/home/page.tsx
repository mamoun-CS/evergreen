import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { saveHomepageSectionLayout, deleteHomepageSection, moveHomepageSection } from '../../actions/cms-actions';
import Link from 'next/link';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

export const dynamic = 'force-dynamic';

const SECTION_TYPES = [
  { value: 'HERO', label: 'Hero (القسم الرئيسي)' },
  { value: 'CATEGORIES', label: 'الأقسام (Categories)' },
  { value: 'BRANDS', label: 'العلامات التجارية (Brands)' },
  { value: 'BANNERS', label: 'البنرات (Banners)' },
  { value: 'PROMO', label: 'الترويج / بنر (Promo)' },
  { value: 'TEXT', label: 'نص حر (Text Block)' },
];

export default async function HomepageContentPage() {
  await requireAdmin();
  const sections = await prisma.homepageSection.findMany({ orderBy: { order: 'asc' } });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">محتوى الصفحة الرئيسية</h1>
          <p className="mt-1 text-sm text-slate-500">إدارة أقسام الصفحة الرئيسية - يمكن إعادة الترتيب، تفعيل/تعطيل، وإضافة أقسام جديدة.</p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link href="/admin/content/home/new" className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-900">
            <Plus className="h-4 w-4" /> إضافة قسم جديد
          </Link>
        </div>
      </div>

      {sections.length > 0 && (
        <>
        <form action={(async (formData) => {
          'use server';
          const sectionIds = formData.getAll('sectionId') as string[];
          await saveHomepageSectionLayout(sectionIds.map((id) => ({
            id,
            order: parseInt(formData.get(`order_${id}`) as string) || 0,
            isActive: formData.get(`isActive_${id}`) === 'on',
          })));
        })} className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="w-24 px-3 py-3.5 text-right text-sm font-semibold">ترتيب</th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold">المفتاح (Key)</th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold">النوع</th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold">العنوان (عربي)</th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold">الترتيب</th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold">الحالة</th>
                  <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">إجراءات</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sections.map((section, index) => (
                  <tr key={section.id}>
                    <td className="px-3 py-4 text-sm">
                      <div className="flex gap-1">
                        <button type="submit" form={`move-up-${section.id}`} disabled={index === 0} className="rounded border border-slate-200 p-1 text-slate-600 disabled:opacity-30" aria-label="تحريك للأعلى"><ChevronUp className="h-4 w-4" /></button>
                        <button type="submit" form={`move-down-${section.id}`} disabled={index === sections.length - 1} className="rounded border border-slate-200 p-1 text-slate-600 disabled:opacity-30" aria-label="تحريك للأسفل"><ChevronDown className="h-4 w-4" /></button>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm font-mono text-slate-700">{section.key}</td>
                    <td className="px-3 py-4 text-sm text-slate-500">{SECTION_TYPES.find((type) => type.value === section.type)?.label || section.type}</td>
                    <td className="px-3 py-4 text-sm font-bold text-slate-900 max-w-xs truncate">{section.titleAr || section.key}</td>
                    <td className="px-3 py-4 text-sm text-slate-500">
                      <input type="hidden" name="sectionId" value={section.id} />
                      <input type="number" name={`order_${section.id}`} defaultValue={section.order} className="w-16 rounded border-slate-300 text-sm text-center" />
                    </td>
                    <td className="px-3 py-4 text-sm">
                      <input type="checkbox" name={`isActive_${section.id}`} defaultChecked={section.isActive} className="rounded text-emerald-600 focus:ring-emerald-500" />
                    </td>
                    <td className="relative py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6">
                      <div className="flex justify-end gap-3">
                        <Link href={`/admin/content/home/${section.id}`} className="text-emerald-600 hover:text-emerald-900"><Pencil className="h-4 w-4" /></Link>
                        {section.key !== 'hero' && (
                          <button type="submit" form={`delete-${section.id}`} className="text-red-500 hover:text-red-700" aria-label="حذف"><Trash2 className="h-4 w-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end pt-4"><button type="submit" className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700">حفظ الترتيب والحالة</button></div>
        </form>
        {sections.map((section) => (
          <div key={`move-${section.id}`} className="hidden">
            <form id={`move-up-${section.id}`} action={(async () => { 'use server'; await moveHomepageSection(section.id, 'up'); })} />
            <form id={`move-down-${section.id}`} action={(async () => { 'use server'; await moveHomepageSection(section.id, 'down'); })} />
            {section.key !== 'hero' ? <form id={`delete-${section.id}`} action={(async () => { 'use server'; await deleteHomepageSection(section.id); })} /> : null}
          </div>
        ))}
        </>
      )}

      {sections.length === 0 && (
        <div className="text-center py-10 rounded-xl border border-dashed border-slate-300 bg-slate-50">
          <p className="text-slate-500">لا توجد أقسام. أضف القسم الأول.</p>
        </div>
      )}
    </div>
  );
}
