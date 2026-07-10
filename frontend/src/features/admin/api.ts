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
  CategoryRequest,
  ShippingCompany,
  ShippingCompanyListResponse,
  ShippingCompanyRequest,
  ShippingService,
  ShippingServiceListResponse,
  ShippingServiceRequest,
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

export const adminShippingCompaniesApi = {
  async list(page = 1, limit = 10): Promise<ShippingCompanyListResponse> {
    const response = await apiGetResponse<ShippingCompany[]>(
      '/admin/shipping-companies',
      {
        params: { page, limit },
      },
    );

    return {
      items: response.data,
      meta: response.meta,
    };
  },
  create(body: ShippingCompanyRequest) {
    return apiPost<ShippingCompany, ShippingCompanyRequest>(
      '/admin/shipping-companies',
      body,
    );
  },
  get(companyId: string) {
    return apiGet<ShippingCompany>(`/admin/shipping-companies/${companyId}`);
  },
  update(companyId: string, body: ShippingCompanyRequest) {
    return apiPatch<ShippingCompany, ShippingCompanyRequest>(
      `/admin/shipping-companies/${companyId}`,
      body,
    );
  },
  delete(companyId: string) {
    return apiDelete<{ id: string; deleted: true }>(
      `/admin/shipping-companies/${companyId}`,
    );
  },
};

export const adminShippingServicesApi = {
  async list(
    page = 1,
    limit = 10,
    shippingCompanyId?: string,
  ): Promise<ShippingServiceListResponse> {
    const response = await apiGetResponse<ShippingService[]>(
      '/admin/shipping-services',
      {
        params: cleanParams({ page, limit, shippingCompanyId }),
      },
    );

    return {
      items: response.data,
      meta: response.meta,
    };
  },
  create(body: ShippingServiceRequest) {
    return apiPost<ShippingService, ShippingServiceRequest>(
      '/admin/shipping-services',
      body,
    );
  },
  get(serviceId: string) {
    return apiGet<ShippingService>(`/admin/shipping-services/${serviceId}`);
  },
  update(serviceId: string, body: ShippingServiceRequest) {
    return apiPatch<ShippingService, ShippingServiceRequest>(
      `/admin/shipping-services/${serviceId}`,
      body,
    );
  },
  deactivate(serviceId: string) {
    return apiDelete<{ id: string; deactivated: true }>(
      `/admin/shipping-services/${serviceId}`,
    );
  },
};
