import type { CategoryTreeNode, ProductListItem } from './types';
import { formatMoney } from '@/utils/format';

export function resolveMediaUrl(url: string | null | undefined) {
  if (!url?.startsWith('https://')) {
    return null;
  }

  return url;
}

export function getProductPriceLabel(product: ProductListItem) {
  if (product.priceMin === product.priceMax) {
    return formatMoney(product.priceMin);
  }

  return `${formatMoney(product.priceMin)} - ${formatMoney(product.priceMax)}`;
}

export type FlatCategory = {
  id: string;
  label: string;
};

export function flattenCategories(
  categories: CategoryTreeNode[],
  depth = 0,
): FlatCategory[] {
  return categories.flatMap((category) => [
    {
      id: category.id,
      label: `${'  '.repeat(depth)}${category.categoryName}`,
    },
    ...flattenCategories(category.children, depth + 1),
  ]);
}
