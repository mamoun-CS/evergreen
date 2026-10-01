import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { get } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const contentTypes: Record<string, string> = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };

export async function GET(_request: NextRequest, { params }: { params: { path: string[] } }) {
  const relative = params.path.join('/');
  const extension = relative.split('.').pop()?.toLowerCase() || '';
  const contentType = contentTypes[extension];
  if (!contentType || relative.includes('\\') || relative.split('/').some((part) => !part || part === '.' || part === '..')) return new NextResponse(null, { status: 404 });

  let bytes = (await get(`/uploads/${relative}`))?.bytes;

  // The As Titanium catalogue was imported before the managed upload store.
  // Keep its already-local product assets available without exposing arbitrary files.
  const legacyFile = relative.startsWith('products/') ? relative.slice('products/'.length) : '';
  if (!bytes && /^as-titanium-product-[a-z0-9]+_\d+\.(?:webp|png|jpe?g)$/.test(legacyFile)) {
    const legacyRoot = path.resolve(process.cwd(), 'public', 'products');
    const legacyPath = path.resolve(legacyRoot, legacyFile);
    if (legacyPath.startsWith(`${legacyRoot}${path.sep}`) && (await stat(legacyPath).catch(() => null))?.isFile()) bytes = await readFile(legacyPath);
  }

  if (!bytes) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(bytes), { headers: {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=2592000, immutable',
  } });
}
