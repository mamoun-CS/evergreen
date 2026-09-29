import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { Trash2 } from 'lucide-react';
import { updateMessageStatus, deleteMessage } from '../actions/message-actions';

export const dynamic = 'force-dynamic';
const dateFormatter = new Intl.DateTimeFormat('ar-PS', { dateStyle: 'medium', timeStyle: 'short' });

export default async function MessagesPage() {
  await requireAdmin();
  const messages = await prisma.contactInquiry.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">رسائل التواصل</h1>
          <p className="mt-2 text-sm text-slate-700">استفسارات ورسائل الزوار من صفحة اتصل بنا.</p>
        </div>
      </div>
      
      <div className="space-y-4">
        {messages.map((msg) => (
          <article key={msg.id} className={`rounded-xl border p-5 shadow-sm ${msg.status === 'NEW' ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-bold text-lg text-slate-900">{msg.name}</h2>
                <p className="text-sm text-slate-600 font-medium">{msg.email} · <span className="text-slate-400 font-normal">{dateFormatter.format(msg.createdAt)}</span></p>
              </div>
              <div className="flex items-center gap-3">
                <form action={async (formData) => { 'use server'; await updateMessageStatus(msg.id, formData.get('status') as string); }} className="flex items-center gap-1">
                  <select name="status" defaultValue={msg.status} className="block w-28 rounded-md border-slate-300 py-1 text-xs focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 bg-white">
                    <option value="NEW">جديدة</option>
                    <option value="READ">مقروءة</option>
                    <option value="RESOLVED">تم الرد</option>
                  </select>
                  <button type="submit" className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded hover:bg-emerald-200">حفظ</button>
                </form>
                <form action={async () => { 'use server'; await deleteMessage(msg.id); }}>
                  <button type="submit" className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </form>
              </div>
            </div>
            <p className="text-slate-800 whitespace-pre-wrap text-sm leading-relaxed">{msg.message}</p>
          </article>
        ))}
        {messages.length === 0 && <div className="py-10 text-center text-sm text-slate-500 bg-white border border-slate-200 rounded-xl">لا توجد رسائل تواصل.</div>}
      </div>
    </div>
  );
}
