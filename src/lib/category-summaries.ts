type CategoryNode = { id: string; parentId: string | null };
type Preview = { id: string; images: string[]; categories: { id: string }[] };

export function descendantCategoryIds(root: string, hierarchy: CategoryNode[]) {
  const ids = new Set([root]);
  for (const id of ids) {
    for (const node of hierarchy) if (node.parentId === id) ids.add(node.id);
  }
  return ids;
}

/** Products arrive newest-first. Count each product once per child subtree,
 * even when several of its category assignments belong to that subtree. */
export function summarizeChildren<T extends { id: string }>(children: T[], hierarchy: CategoryNode[], products: Preview[]) {
  return children.map(child => {
    const ids = descendantCategoryIds(child.id, hierarchy);
    const matches = products.filter(product => product.categories.some(category => ids.has(category.id)));
    return { ...child, _count: { products: matches.length }, products: matches.length ? [{ images: matches[0].images }] : [] };
  });
}
