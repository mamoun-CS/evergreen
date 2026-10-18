type WishlistEntry = { product: { id: string; [key: string]: unknown } };

/** The caller owns single-flight/cancellation. Failed writes remain local so a
 * later synchronization can retry them without resending server-owned items. */
export async function synchronizeWishlist(stored: string[], signal: AbortSignal) {
  const read = () => fetch('/api/wishlist', { cache: 'no-store', signal });
  const response = await read();
  if (response.status === 401) return null;
  if (!response.ok) throw new Error('Wishlist could not be loaded');
  let result: { items: WishlistEntry[] } = await response.json();
  const serverIds = new Set(result.items.map(item => item.product.id));
  const missing = [...new Set(stored)].filter(id => !serverIds.has(id));
  const pending = new Set(missing);
  let changed = false;
  for (const productId of missing) {
    const saved = await fetch('/api/wishlist', {
      method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    });
    if (saved.status === 401) return null;
    if (saved.ok) { pending.delete(productId); changed = true; }
  }
  if (changed) {
    const refreshed = await read();
    if (refreshed.status === 401) return null;
    if (!refreshed.ok) throw new Error('Wishlist could not be refreshed');
    result = await refreshed.json();
  }
  return { products: result.items.map(item => item.product), ids: [...new Set([...result.items.map(item => item.product.id), ...pending])] };
}
