import { NextResponse } from 'next/server';
import { getHomepageContent } from '@/lib/storefront';

export const revalidate = 300;

export async function GET() {
  const content = await getHomepageContent();
  return NextResponse.json(
    { content },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
  );
}
