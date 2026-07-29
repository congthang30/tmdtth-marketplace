import {
  apiDelete,
  apiGet,
  apiGetResponse,
  apiPatch,
  apiPost,
  apiClient,
} from '@/services/api';
import type { ApiResponse } from '@/types/api';
import type {
  AdminCategory,
  CarrierProvider,
  CarrierProviderListResponse,
  CategoryRequest,
  AdminProductListResponse,
} from './types';
import type { SellerProduct } from '@/features/seller/types';

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
  async uploadImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<{ url: string }>>('/uploads', formData);
    return response.data.data;
  },
  deactivate(categoryId: string) {
    return apiDelete<{ id: string; deactivated: true }>(
      `/admin/categories/${categoryId}`,
    );
  },
};

export const adminProductsApi = {
  async list(page = 1, limit = 10, status?: string): Promise<AdminProductListResponse> {
    const response = await apiGetResponse<SellerProduct[]>('/admin/products', { params: cleanParams({ page, limit, status }) });
    return { items: response.data, meta: response.meta };
  },
  approve(productId: string) {
    return apiPatch<SellerProduct>(`/admin/products/${productId}/approve`);
  },
  reject(productId: string) {
    return apiPatch<SellerProduct>(`/admin/products/${productId}/reject`);
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

