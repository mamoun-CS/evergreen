import { NextRequest, NextResponse } from 'next/server';
import { trackAbandonedCart } from '@/lib/abandoned-cart';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const items = body?.items;
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !items || !Array.isArray(items) || items.length === 0 || items.length > 50 || body?.consent !== true) {
      return NextResponse.json({ error: 'Email and items are required' }, { status: 400 });
    }
    if (!user || user.email.toLowerCase() !== email) return NextResponse.json({ error: 'Sign in with this email to enable cart recovery.' }, { status: 401 });
    const recent = await prisma.abandonedCart.count({where:{email,createdAt:{gte:new Date(Date.now()-60*60*1000)}}});
    if (recent >= 3) return NextResponse.json({error:'Too many recovery requests.'},{status:429});
    
    const cart = await trackAbandonedCart(email, items);
    
    return NextResponse.json({ success: true, cartId: cart.id });
  } catch (error) {
    console.error('Error saving cart:', error);
    return NextResponse.json({ error: 'Failed to save cart' }, { status: 500 });
  }
}
