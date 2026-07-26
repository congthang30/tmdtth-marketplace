import type { ApiMeta } from '@/types/api';
import type { Shop } from '@/features/seller/types';

export type AdminCategory = {
  id: string;
  idString: string;
  parentCategoryId: string | null;
  categoryName: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
};

export type CategoryRequest = {
  categoryName?: string;
  slug?: string;
  description?: string | null;
  parentCategoryId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type AdminShopListResponse = {
  items: Shop[];
  meta?: ApiMeta;
};

/**
 * Read-only view of the fixed carrier registry (currently GHN only) as
 * returned by GET /admin/shipping-providers. Carriers are static
 * platform-level entities; there is no create/update/delete here since
 * providers can no longer be registered by end users.
 */
export type CarrierProvider = {
  id: string;
  idString: string;
  provider: string;
  code: string;
  companyName: string;
  slug: string;
  companyStatus: string;
  isConfigured: boolean;
};

export type CarrierProviderListResponse = {
  message: string;
  data: CarrierProvider[];
};

export type ShippingService = {
  id: string;
  idString: string;
  shippingCompanyId: string;
  shippingCompanyIdString: string;
  serviceCode: string;
  serviceName: string;
  carrierServiceCode: string;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
};

export type ShippingServiceListResponse = {
  items: ShippingService[];
  meta?: ApiMeta;
};

