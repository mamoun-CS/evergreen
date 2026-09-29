import { prisma } from './prisma';

interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

export async function trackAbandonedCart(email: string, items: CartItem[]) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || items.length < 1 || items.length > 50) throw new Error('INVALID_CART');
  const quantities = new Map<string, {productId:string;variantId?:string;quantity:number}>();
  for (const item of items) {
    if (!item || typeof item.productId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(item.productId) || item.variantId !== undefined && (typeof item.variantId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(item.variantId)) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) throw new Error('INVALID_CART');
    const key = `${item.productId}:${item.variantId || ''}`;
    const prior = quantities.get(key);
    quantities.set(key, { productId:item.productId, variantId:item.variantId, quantity:(prior?.quantity || 0) + item.quantity });
  }
  const products = await prisma.product.findMany({where:{id:{in:[...new Set([...quantities.values()].map(item=>item.productId))]},isAvailable:true,purchaseMode:'PURCHASABLE'},include:{variants:true}});
  const lines = [...quantities.values()].map(item => {
    const product = products.find(entry=>entry.id===item.productId);
    const variant = item.variantId ? product?.variants.find(entry=>entry.id===item.variantId) : null;
    const price = variant?.price ?? product?.discountPrice ?? product?.basePrice;
    const stock = variant ? variant.stock : product?.stockQuantity;
    if (!product || product.variants.length && !variant || !product.variants.length && item.variantId || !price || stock === undefined || stock < item.quantity) throw new Error('UNAVAILABLE_PRODUCT');
    return { productId:product.id, variantId:variant?.id, quantity:item.quantity, price:Number(price), product:{nameEn:product.nameEn,nameAr:product.nameAr,slug:product.slug} };
  });
  const subtotal = lines.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  const existing = await prisma.abandonedCart.findFirst({
    where: { email:normalizedEmail, recoveredAt: null },
    orderBy: { createdAt: 'desc' }
  });

  if (existing) {
    return prisma.abandonedCart.update({
      where: { id: existing.id },
      data: { items: lines, subtotal, abandonedAt: new Date() }
    });
  }

  return prisma.abandonedCart.create({
    data: { email:normalizedEmail, items:lines, subtotal }
  });
}

