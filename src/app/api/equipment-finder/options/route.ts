import { NextResponse } from 'next/server';
import { getFilterOptions } from '@/lib/storefront';

export const revalidate = 300;

export async function GET() {
  try {
    const options = await getFilterOptions();
    return NextResponse.json(options, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('API Error in equipment-finder options:', error);
    return NextResponse.json({ categories: [], brands: [], applications: [] }, { status: 500 });
  }
}
