import { NextRequest, NextResponse } from 'next/server';
import { getClientIp } from '@/lib/auth-middleware';
import { consumeRateLimit, rateLimitConfig, rateLimitResponseHeaders } from '@/lib/rate-limit';
import { loadProductListing, loadProductSuggestions } from '@/lib/product-service';

export async function GET(req: NextRequest) {
  const rateLimit = await consumeRateLimit(`products:${getClientIp(req.headers)}`, rateLimitConfig.browse.maximum, rateLimitConfig.browse.windowMs);
  if (!rateLimit.allowed) return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429, headers: rateLimitResponseHeaders(rateLimit) });
  const { searchParams } = new URL(req.url);
  try {
    const payload = searchParams.get('view') === 'suggestions'
      ? await loadProductSuggestions(searchParams)
      : await loadProductListing(searchParams);
    // Responses contain current prices/stock. Do not stack CDN/browser caches
    // over application cache tags; tags cannot purge an external CDN copy.
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof RangeError) return NextResponse.json({ error: error.message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    console.error('API Error fetching products:', error);
    return NextResponse.json({ products: [], total: 0, page: 1, limit: 30, totalPages: 1 }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
