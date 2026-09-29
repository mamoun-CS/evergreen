'use client';

import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react';
import { useLanguage } from '@/components/layout/LanguageContext';

interface ImageUploaderProps {
  value?: string[];
  defaultValue?: string[];
  onChange?: (urls: string[]) => void;
  name?: string;
  multiple?: boolean;
  maxFiles?: number;
  category?: string;
}

export default function ImageUploader({ value, defaultValue = [], onChange, name, multiple = false, maxFiles = 30, category = 'products' }: ImageUploaderProps) {
  const [localUrls, setLocalUrls] = useState(defaultValue);
  const [urlInput, setUrlInput] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const urls = value ?? localUrls;
  const update = (next: string[]) => { if (value === undefined) setLocalUrls(next); onChange?.(next); };
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const label = (arabic: string, english: string) => ar ? arabic : english;

  const upload = async (files: FileList | File[]) => {
    const selected = Array.from(files);
    if (!selected.length) return;
    if (selected.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setError(label('اختر ملفات JPEG أو PNG أو WebP بحجم أقصاه 5 ميغابايت.','Choose JPEG, PNG, or WebP files up to 5 MB each.')); return;
    }
    if (urls.length + selected.length > maxFiles || (!multiple && selected.length > 1)) {
      setError(label(`يسمح بحد أقصى ${multiple ? maxFiles : 1} صورة.`,`You can add up to ${multiple ? maxFiles : 1} image(s).`)); return;
    }
    setError(''); setProgress(1);
    const body = new FormData(); selected.forEach((file) => body.append('files', file)); body.append('category', category);
    try {
      const response = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/admin/upload'); xhr.withCredentials = true;
        xhr.upload.onprogress = (event) => { if (event.lengthComputable) setProgress(Math.round(event.loaded / event.total * 100)); };
        xhr.onload = () => resolve(new Response(xhr.responseText, { status: xhr.status, headers: { 'Content-Type': 'application/json' } }));
        xhr.onerror = () => reject(new Error(label('تعذر الاتصال بالخادم.','Could not reach the server.')));
        xhr.send(body);
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || label('فشل رفع الصور.','Image upload failed.'));
      update([...urls, ...result.files.map((file: { url: string }) => file.url)]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : label('فشل رفع الصور.','Image upload failed.')); }
    finally { setProgress(0); if (inputRef.current) inputRef.current.value = ''; }
  };

  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    try { if (url.startsWith('/') && !url.startsWith('//')) { update([...urls, url]); setUrlInput(''); return; } const parsed = new URL(url); if (parsed.protocol !== 'https:') throw new Error(); }
    catch { setError(label('أدخل رابط صورة صالحاً.','Enter a valid image URL.')); return; }
    if (urls.length >= maxFiles || (!multiple && urls.length)) { setError(label('وصلت إلى حد الصور المسموح.','Image limit reached.')); return; }
    setError(''); update([...urls, url]); setUrlInput('');
  };
  const move = (index: number, direction: -1 | 1) => { const target = index + direction; if (target < 0 || target >= urls.length) return; const next = [...urls]; [next[index], next[target]] = [next[target], next[index]]; update(next); };

  return <section className="space-y-3" aria-label={label('رفع الصور','Image upload')}>
    {name && urls.map((url, index) => <input key={`${url}-${index}`} type="hidden" name={name} value={url} />)}
    <div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files); }} className={`rounded-xl border-2 border-dashed p-5 text-center ${dragging ? 'border-emerald-700 bg-emerald-50' : 'border-slate-300'}`}>
      <ImagePlus className="mx-auto h-7 w-7 text-emerald-800" /><p className="mt-2 text-sm font-semibold">{label('اسحب الصور هنا أو','Drop images here or')}</p>
      <button type="button" onClick={() => inputRef.current?.click()} className="mt-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-bold text-white">{label('اختر الصور','Choose images')}</button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple={multiple} className="sr-only" onChange={(event) => event.target.files && void upload(event.target.files)} />
      <p className="mt-2 text-xs text-slate-500">JPEG, PNG, WebP · 5 MB {label('كحد أقصى لكل صورة','maximum per image')}</p>
    </div>
    {progress > 0 && <div role="status" className="space-y-1 text-xs"><p>{label('جارٍ رفع الصور','Uploading images')} · {progress}%</p><div className="h-2 rounded bg-slate-100"><div className="h-full rounded bg-emerald-700 transition-all" style={{ width: `${progress}%` }} /></div></div>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{urls.map((url, index) => <figure key={`${url}-${index}`} className="group relative rounded-lg border border-slate-200 p-2"><img src={url} alt={label(`معاينة الصورة ${index + 1}`,`Image preview ${index + 1}`)} className="h-28 w-full rounded object-contain" />{index === 0 && <figcaption className="mt-1 text-center text-[11px] font-bold">{label('الصورة الرئيسية','Primary')}</figcaption>}<div className="absolute end-2 top-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"><button type="button" onClick={() => move(index,-1)} disabled={index===0} aria-label={label('تحريك للأعلى','Move up')} className="rounded bg-white p-1 shadow disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button><button type="button" onClick={() => move(index,1)} disabled={index===urls.length-1} aria-label={label('تحريك للأسفل','Move down')} className="rounded bg-white p-1 shadow disabled:opacity-40"><ArrowDown className="h-4 w-4" /></button><button type="button" onClick={() => update(urls.filter((_, itemIndex) => itemIndex!==index))} aria-label={label('إزالة الصورة','Remove image')} className="rounded bg-white p-1 text-red-700 shadow"><Trash2 className="h-4 w-4" /></button></div></figure>)}</div>
    <div className="flex flex-col gap-2 sm:flex-row"><input type="url" value={urlInput} onChange={(event) => setUrlInput(event.target.value)} placeholder={label('أو ألصق رابط صورة','Or paste an image URL')} className="min-h-10 min-w-0 flex-1 rounded border border-slate-300 px-3 text-sm" dir="ltr" /><button type="button" onClick={addUrl} className="min-h-10 rounded-lg border border-slate-300 px-4 text-sm font-bold">{label('إضافة الرابط','Add URL')}</button></div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}
