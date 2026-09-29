import { NextRequest, NextResponse } from 'next/server';
import { get } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const contentTypes: Record<string, string> = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };

export async function GET(_request: NextRequest, { params }: { params: { path: string[] } }) {
  const relative = params.path.join('/');
  const extension = relative.split('.').pop()?.toLowerCase() || '';
  const contentType = contentTypes[extension];
  if (!contentType || relative.includes('\\')) return new NextResponse(null, { status: 404 });
  const result = await get(`/uploads/${relative}`);
  if (!result) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(result.bytes), { headers: {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=2592000, immutable',
  } });
}
