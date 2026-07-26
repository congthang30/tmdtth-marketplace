import {
  apiDelete,
  apiGet,
  apiGetResponse,
  apiPatch,
  apiPost,
} from '@/services/api';
import type { Shop } from '@/features/seller/types';
import type {
  AdminCategory,
  AdminShopListResponse,
  CarrierProvider,
  CarrierProviderListResponse,
  CategoryRequest,
} from './types';

const cleanParams = (params: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  );

export const adminCategoriesApi = {
  list() {
    return apiGet<AdminCategory[]>('/admin/categories');
  },
  create(body: CategoryRequest) {
    return apiPost<AdminCategory, CategoryRequest>('/admin/categories', body);
  },
  update(categoryId: string, body: CategoryRequest) {
    return apiPatch<AdminCategory, CategoryRequest>(
      `/admin/categories/${categoryId}`,
      body,
    );
  },
  deactivate(categoryId: string) {
    return apiDelete<{ id: string; deactivated: true }>(
      `/admin/categories/${categoryId}`,
    );
  },
};

export const adminShopsApi = {
  async list(page = 1, limit = 10, status?: string): Promise<AdminShopListResponse> {
    const response = await apiGetResponse<Shop[]>('/admin/shops', {
      params: cleanParams({ page, limit, status }),
    });

    return {
      items: response.data,
      meta: response.meta,
    };
  },
  approve(shopId: string) {
    return apiPatch<Shop>(`/admin/shops/${shopId}/approve`);
  },
  reject(shopId: string, reason?: string) {
    return apiPatch<Shop, { reason?: string }>(`/admin/shops/${shopId}/reject`, {
      reason,
    });
  },
};

export const adminShippingProvidersApi = {
  async list(): Promise<CarrierProvider[]> {
    const response = await apiGet<CarrierProviderListResponse>(
      '/admin/shipping-providers',
    );
    return response.data;
  },
};

