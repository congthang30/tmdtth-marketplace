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

export type ShippingCompany = {
  id: string;
  idString: string;
  ownerUserId: string;
  ownerUserIdString: string;
  code: string;
  companyName: string;
  slug: string;
  email: string | null;
  phoneNumber: string | null;
  taxCode: string | null;
  addressText: string | null;
  companyStatus: string;
  approvedByUserId: string | null;
  approvedByUserIdString: string | null;
  approvedAt: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
};

export type ShippingCompanyRequest = {
  companyName?: string;
  slug?: string;
  email?: string;
  phoneNumber?: string;
  taxCode?: string;
  addressText?: string;
  companyStatus?: 'PendingApproval' | 'Approved' | 'Rejected' | 'Suspended' | 'Inactive';
};

export type ShippingCompanyListResponse = {
  items: ShippingCompany[];
  meta?: ApiMeta;
};

export type ShippingService = {
  id: string;
  idString: string;
  shippingCompanyId: string;
  shippingCompanyIdString: string;
  serviceCode: string;
  serviceName: string;
  baseFee: string;
  feePerKg: string;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
};

export type ShippingServiceRequest = {
  shippingCompanyId?: string;
  serviceCode?: string;
  serviceName?: string;
  baseFee?: string;
  feePerKg?: string;
  estimatedMinDays?: number;
  estimatedMaxDays?: number;
  isActive?: boolean;
};

export type ShippingServiceListResponse = {
  items: ShippingService[];
  meta?: ApiMeta;
};
