import { NextResponse } from 'next/server';
import { clearedAdminSessionCookie } from '@/lib/admin-auth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(clearedAdminSessionCookie());
  return response;
}
