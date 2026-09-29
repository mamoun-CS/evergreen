import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.cart)) {
      return NextResponse.json({ error: 'Invalid cart data' }, { status: 400 });
    }

    if (body.cart.length > 50 || body.cart.some((item: any) => !item || typeof item.id !== 'string' || item.id.length > 100 || item.variantId !== undefined && (typeof item.variantId !== 'string' || item.variantId.length > 100) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100)) return NextResponse.json({ error: 'Invalid cart item.' }, { status: 400 });
    const newCartItems: Array<{ id: string; variantId?: string; quantity: number }> = body.cart;

    // Run in a transaction: delete old cart and insert new cart
    await prisma.$transaction(async (tx) => {
      // 1. Get or create cart for user
      let dbCart = await tx.cart.findUnique({ where: { sessionId: user.id } });
      if (!dbCart) {
        dbCart = await tx.cart.create({ data: { sessionId: user.id } });
      }

      // 2. Delete all existing cart items for this user
      await tx.cartItem.deleteMany({
        where: { cartId: dbCart.id }
      });

      // 3. Filter valid products and insert them
      if (newCartItems.length > 0) {
        const productIds = newCartItems.map(i => i.id);
        const validProducts = await tx.product.findMany({
          where: { id: { in: productIds }, isAvailable: true },
          select: { id: true, variants: { select: { id: true, stock: true } } }
        });
        const validProductIds = new Map(validProducts.map(p => [p.id, p]));

        const insertData = newCartItems
          .filter(item => {
            const product = validProductIds.get(item.id);
            if (!product) return false;
            return product.variants.length ? product.variants.some(variant => variant.id === item.variantId && variant.stock > 0) : !item.variantId;
          })
          .map(item => ({
            cartId: dbCart!.id,
            productId: item.id,
            variantId: item.variantId,
            quantity: item.quantity
          }));

        if (insertData.length > 0) {
        await tx.cartItem.createMany({
            data: insertData
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cart update error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
