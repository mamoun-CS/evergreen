'use client';

import dynamic from 'next/dynamic';
import { useCart } from './CartContext';

const CartDrawer = dynamic(() => import('./CartDrawer'));

/** Fetch and hydrate the drawer only after the visitor opens the cart. */
export default function CartDrawerLoader() {
  const { isCartOpen } = useCart();
  return isCartOpen ? <CartDrawer /> : null;
}
