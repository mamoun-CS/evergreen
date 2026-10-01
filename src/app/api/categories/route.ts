import { NextResponse } from 'next/server';
import { getRootCategories } from '@/lib/storefront';

export const revalidate = 300;

export async function GET() {
  try {
    const categories = await getRootCategories();
    return NextResponse.json(
      { categories },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
    );
  } catch (error) {
    console.error('Unable to load root categories:', error);
    return NextResponse.json({ error: 'Unable to load categories.' }, { status: 500 });
  }
}
