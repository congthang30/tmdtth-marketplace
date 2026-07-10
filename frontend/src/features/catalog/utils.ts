import type { CategoryTreeNode, ProductListItem } from './types';
import { formatMoney } from '@/utils/format';

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3100/api';

const getApiOrigin = () => {
  try {
    return new URL(apiBaseUrl, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
};

export function resolveMediaUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:')) {
    return url;
  }

  return `${getApiOrigin()}${url.startsWith('/') ? url : `/${url}`}`;
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
