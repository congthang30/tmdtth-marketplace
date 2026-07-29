import { apiGet, apiGetResponse } from '@/services/api';
import type {
  CategoryTreeNode,
  ProductListItem,
  ProductListQuery,
  PublicProductReview,
} from './types';

const cleanParams = (params: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  );

export const categoriesApi = {
  list() {
    return apiGet<CategoryTreeNode[]>('/categories');
  },
};

export type TopSearchedProduct = { product: ProductListItem; searchCount: string };

export const catalogApi = {
  async listProducts(query: ProductListQuery) {
    const response = await apiGetResponse<ProductListItem[]>('/products', {
      params: cleanParams(query),
    });

    return {
      items: response.data,
      meta: response.meta,
    };
  },
  listTopSearched(limit = 6) {
    return apiGet<TopSearchedProduct[]>('/products/discovery/top-searched', { params: { limit } });
  },
  getProduct(slug: string) {
    return apiGet<ProductListItem>(`/products/${slug}`);
  },
  async listReviews(slug: string, page = 1, limit = 5) {
    const response = await apiGetResponse<PublicProductReview[]>(
      `/products/${slug}/reviews`,
      {
        params: { page, limit },
      },
    );

    return {
      items: response.data,
      meta: response.meta,
    };
  },
};
