import { apiDelete, apiGet, apiPatch, apiPost, apiClient } from '@/services/api';
import type { ApiResponse } from '@/types/api';

export type SellerShopCategory = { id: string; idString: string; parentShopCategoryId: string | null; categoryName: string; slug: string; description: string | null; sortOrder: number; isActive: boolean; productIds: string[] };
export type ShopCategoryBody = { categoryName: string; parentShopCategoryId?: string; description?: string; sortOrder?: number; isActive?: boolean };

export const sellerShopCategoriesApi = {
  list: () => apiGet<SellerShopCategory[]>('/seller/shop-categories'),
  create: (body: ShopCategoryBody) => apiPost<SellerShopCategory, ShopCategoryBody>('/seller/shop-categories', body),
  update: (id: string, body: ShopCategoryBody) => apiPatch<SellerShopCategory, ShopCategoryBody>(`/seller/shop-categories/${id}`, body),
  assignProducts: async (id: string, productIds: string[]) => {
    const response = await apiClient.put<ApiResponse<SellerShopCategory[]>>(`/seller/shop-categories/${id}/products`, { productIds });
    return response.data.data;
  },
  remove: (id: string) => apiDelete<{ success: boolean }>(`/seller/shop-categories/${id}`),
};
