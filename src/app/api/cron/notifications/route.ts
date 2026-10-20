import { NextRequest, NextResponse } from 'next/server';
import { processNotificationOutbox } from '@/lib/notification-outbox';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const configuredSecret = process.env.CRON_SECRET;
  if (configuredSecret && configuredSecret.length >= 16) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token === configuredSecret) return true;
    }

    const customHeader = req.headers.get('x-cron-secret');
    if (customHeader && customHeader === configuredSecret) return true;
  }

  try {
    const user = await getCurrentUser();
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return true;
  } catch {
    // Not in a browser request context or unauthenticated
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    if (!await isAuthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    const { searchParams } = new URL(req.url);
    const rawBatch = parseInt(searchParams.get('limit') || '10', 10);
    const limit = Number.isInteger(rawBatch) && rawBatch > 0 ? Math.min(rawBatch, 25) : 10;

    const result = await processNotificationOutbox({ limit });
    return NextResponse.json(
      { success: true, ...result, timestamp: new Date().toISOString() },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Notification cron worker encountered an unhandled error:', error);
    return NextResponse.json(
      { error: 'Notification processing failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function GET(req: NextRequest) {
  // Support GET for standard HTTP cron ping services with the same authentication
  return POST(req);
}
