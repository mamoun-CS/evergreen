import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requirePermission, logAdminAction } from '@/lib/auth-middleware';
import { requireAdmin } from '@/lib/auth';
import { consumeRateLimit, rateLimitConfig, rateLimitResponseHeaders } from '@/lib/rate-limit';
import { validateImageUpload } from '@/lib/upload-validation';
import { storeImage } from '@/lib/storage';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Large camera images are wasteful for product pages. This keeps enough detail
// for the product gallery while sharply reducing storage and transfer size.
const MAX_IMAGE_DIMENSION = 1600;
const WEBP_QUALITY = 80;

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 105 * 1024 * 1024) return NextResponse.json({ error: 'Upload request is too large. / حجم الطلب كبير جداً.' }, { status: 413 });
  const origin = request.headers.get('origin');
  let sameOrigin = false;
  try { sameOrigin = Boolean(origin && new URL(origin).origin === new URL(request.url).origin); } catch { sameOrigin = false; }
  if (!sameOrigin) return NextResponse.json({ error: 'Same-origin upload required. / يجب رفع الصور من الموقع نفسه.' }, { status: 403 });
  let admin;
  try {
    const adminUser = await requireAdmin();
    if (!adminUser) throw new Error('Forbidden');
    admin = await requirePermission('create', 'upload');
  }
  catch { return NextResponse.json({ error: 'Admin access required. / يلزم صلاحية المدير.' }, { status: 403 }); }
  const limit = await consumeRateLimit(`upload:${admin.id}`, rateLimitConfig.write.maximum, rateLimitConfig.write.windowMs);
  if (!limit.allowed) return NextResponse.json({ error: 'Upload limit reached. / تم بلوغ حد رفع الملفات.' }, { status: 429, headers: rateLimitResponseHeaders(limit) });
  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: 'Invalid upload form. / نموذج رفع الملفات غير صالح.' }, { status: 400 }); }
  const files = form.getAll('files').filter((entry): entry is File => entry instanceof File);
  if (!files.length || files.length > 20) return NextResponse.json({ error: 'Select between 1 and 20 images. / اختر من صورة واحدة إلى 20 صورة.' }, { status: 400 });

  const validated: Array<{ bytes: Buffer; type: NonNullable<ReturnType<typeof validateImageUpload>>; size: number }> = [];
  for (const file of files) {
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Each image must be up to 5 MB. / يجب ألا يتجاوز حجم الصورة 5 ميغابايت.' }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const type = validateImageUpload(bytes, file.type, file.size);
    if (!type) return NextResponse.json({ error: 'Only valid JPEG, PNG, or WebP files up to 5 MB are allowed. / يسمح فقط بملفات JPEG أو PNG أو WebP صالحة بحجم أقصاه 5 ميغابايت.' }, { status: 400 });
    validated.push({ bytes, type, size: file.size });
  }
  const categoryValue = form.get('category');
  const category = typeof categoryValue === 'string' && /^[a-z0-9-]{1,40}$/.test(categoryValue) ? categoryValue : 'products';
  const results: Array<{ url: string; contentType: string; size: number }> = [];
  const saved: string[] = [];
  try {
    for (const image of validated) {
      const output = await sharp(image.bytes, { limitInputPixels: 40_000_000, failOn: 'error' })
        .rotate()
        .resize({
          width: MAX_IMAGE_DIMENSION,
          height: MAX_IMAGE_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY, effort: 5, smartSubsample: true })
        .toBuffer();
      const url = await storeImage(output, 'image/webp', category);
      saved.push(url);
      results.push({ url, contentType: 'image/webp', size: output.length });
    }
  } catch {
    await Promise.all(saved.map(async (url) => {
      const { remove } = await import('@/lib/storage');
      await remove(url).catch(() => undefined);
    }));
    return NextResponse.json({ error: 'The images could not be processed. / تعذرت معالجة الصور.' }, { status: 400 });
  }
  await logAdminAction({ userId: admin.id, action: 'IMAGE_UPLOAD', resourceType: 'upload', resourceId: randomUUID(), newData: { files: results.map(({ contentType, size }) => ({ contentType, size })) } });
  return NextResponse.json({ files: results }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
