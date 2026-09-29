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
    const guestCart: Array<{ id: string; variantId?: string; quantity: number }> = Array.isArray(body?.cart) ? body.cart.filter((item: any) => item && typeof item.id === 'string' && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 100) : [];

    // 1. Get or create user's DB cart
    let dbCart = await prisma.cart.findUnique({
      where: { sessionId: user.id },
      include: {
        items: {
          include: {
            product: { select: { id: true, slug: true, nameEn: true, nameAr: true, images: true, basePrice: true, discountPrice: true } },
            variant: { select: { id: true, titleEn: true, titleAr: true, price: true, stock: true } }
          }
        }
      }
    });

    if (!dbCart) {
      dbCart = await prisma.cart.create({
        data: { sessionId: user.id },
        include: { items: { include: { product: true, variant: true } } }
      }) as any;
    }

    const dbItemMap = new Map(dbCart!.items.map(i => [`${i.productId}:${i.variantId || ''}`, i]));

    // 2. Merge guest cart into DB cart
    for (const item of guestCart) {
      const key = `${item.id}:${item.variantId || ''}`;
      if (dbItemMap.has(key)) {
        // Update quantity if needed (or just take max/sum)
        const existing = dbItemMap.get(key)!;
        const product = await prisma.product.findUnique({ where: { id: item.id }, include: { variants: true } });
        const variant = item.variantId ? product?.variants.find((entry) => entry.id === item.variantId) : null;
        const available = product && product.isAvailable && (item.variantId ? Boolean(variant && variant.stock >= item.quantity) : product.stockQuantity >= item.quantity && product.variants.length === 0);
        if (available && existing.quantity < item.quantity) {
          await prisma.cartItem.update({
            where: { id: existing.id },
            data: { quantity: item.quantity }
          });
        }
      } else {
        // Verify product exists and get price
        const product = await prisma.product.findUnique({ where: { id: item.id }, include: { variants: true } });
        if (product && product.isAvailable) {
          const variant = item.variantId ? product.variants.find((entry) => entry.id === item.variantId && entry.stock > 0) : null;
          if ((product.variants.length && !variant) || (!product.variants.length && item.variantId)) continue;
          await prisma.cartItem.create({
            data: {
              cartId: dbCart!.id,
              productId: product.id,
              variantId: variant?.id,
              quantity: item.quantity
            }
          });
        }
      }
    }

    // 3. Fetch final merged cart
    const finalDbCart = await prisma.cart.findUnique({
      where: { sessionId: user.id },
      include: {
        items: {
          include: {
            product: { select: { id: true, slug: true, nameEn: true, nameAr: true, images: true, basePrice: true, discountPrice: true } },
            variant: { select: { id: true, titleEn: true, titleAr: true, price: true, stock: true } }
          }
        }
      }
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
      quantity: dbItem.quantity
    }));

    return NextResponse.json({ cart: mergedCart });
  } catch (error) {
    console.error('Cart sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
