export function canAccessWishlistItem(ownerId: string, requestingUserId: string) {
  return Boolean(ownerId && requestingUserId && ownerId === requestingUserId);
}
