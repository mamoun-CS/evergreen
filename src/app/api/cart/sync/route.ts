import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const guestCart: Array<{ id: string; variantId?: string; quantity: number }> = Array.isArray(body?.cart)
      ? body.cart.filter((item: any) => item && typeof item.id === 'string' && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 100)
      : [];

    const cartItemSelect = {
      include: {
        product: { select: { id: true, slug: true, nameEn: true, nameAr: true, images: true, basePrice: true, discountPrice: true } },
        variant: { select: { id: true, titleEn: true, titleAr: true, price: true, stock: true } },
      },
    } as const;

    // 1. Get or create user's DB cart
    let dbCart = await prisma.cart.findUnique({
      where: { sessionId: user.id },
      include: { items: cartItemSelect },
    });

    if (!dbCart) {
      try {
        dbCart = await prisma.cart.create({
          data: { sessionId: user.id },
          include: { items: cartItemSelect },
        });
      } catch (error) {
        // Another request may have created this user's cart after our read.
        const target = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' ? error.meta?.target : undefined;
        if (!Array.isArray(target) || !target.includes('sessionId')) throw error;
        dbCart = await prisma.cart.findUnique({ where: { sessionId: user.id }, include: { items: cartItemSelect } });
        if (!dbCart) throw error;
      }
    }

    const dbItemMap = new Map(dbCart!.items.map(i => [`${i.productId}:${i.variantId || ''}`, i]));

    // 2. Batch-fetch all products referenced by the guest cart in a SINGLE query (fixes N+1).
    //    Previously, findUnique was called inside the loop — one query per guest item.
    if (guestCart.length > 0) {
      const productIds = [...new Set(guestCart.map(i => i.id))];
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          isAvailable: true,
          stockQuantity: true,
          variants: { select: { id: true, stock: true } },
        },
      });
      const productMap = new Map(products.map(p => [p.id, p]));

      // 3. Merge guest cart into DB cart using the pre-fetched product map
      for (const item of guestCart) {
        const product = productMap.get(item.id);
        if (!product || !product.isAvailable) continue;

        const hasVariants = product.variants.length > 0;
        const variant = item.variantId ? product.variants.find(v => v.id === item.variantId) : null;
        const available = hasVariants
          ? Boolean(variant && variant.stock >= item.quantity)
          : product.stockQuantity >= item.quantity;

        if (!available) continue;

        const key = `${item.id}:${item.variantId || ''}`;
        if (dbItemMap.has(key)) {
          const existing = dbItemMap.get(key)!;
          if (existing.quantity < item.quantity) {
            await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: item.quantity } });
          }
        } else {
          if (hasVariants && !variant) continue;
          if (!hasVariants && item.variantId) continue;
          await prisma.cartItem.create({
            data: {
              cartId: dbCart!.id,
              productId: product.id,
              variantId: variant?.id,
              quantity: item.quantity,
            },
          });
        }
      }
    }

    // 4. Fetch final merged cart
    const finalDbCart = await prisma.cart.findUnique({
      where: { sessionId: user.id },
      include: { items: cartItemSelect },
    });

    const mergedCart = finalDbCart!.items.map(dbItem => ({
      id: dbItem.product.id,
      variantId: dbItem.variant?.id,
      variantTitleEn: dbItem.variant?.titleEn,
      variantTitleAr: dbItem.variant?.titleAr,
      slug: dbItem.product.slug,
      nameEn: dbItem.product.nameEn,
      nameAr: dbItem.product.nameAr,
      image: dbItem.product.images[0] || '',
      price: Number(dbItem.variant?.price ?? dbItem.product.discountPrice ?? dbItem.product.basePrice ?? 0),
      quantity: dbItem.quantity,
    }));

    return NextResponse.json({ cart: mergedCart });
  } catch (error) {
    console.error('Cart sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
