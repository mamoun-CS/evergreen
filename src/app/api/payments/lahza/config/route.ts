import { NextResponse } from 'next/server';
import { isLahzaConfigured } from '@/lib/lahza-config';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ enabled: isLahzaConfigured() }, { headers: { 'Cache-Control': 'no-store' } });
}
