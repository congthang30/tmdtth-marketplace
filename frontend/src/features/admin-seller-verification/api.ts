import { apiGet, apiGetResponse, apiPatch } from '@/services/api';
import type { ApiMeta } from '@/types/api';
import type {
  BusinessType,
  IdentityDocumentType,
  SellerDocumentType,
  SellerType,
  VerificationStatus,
} from '@/features/seller-verification/types';

export type AdminSellerVerificationListItem = {
  id: string;
  shop: { id: string; shopName: string; shopStatus: string; province: string | null; ward: string | null; streetAddress: string | null };
  sellerType: SellerType;
  businessType: BusinessType | null;
  legalName: string;
  taxCodeMasked: string;
  verificationStatus: VerificationStatus;
  submittedAt: string | null;
  createdAt: string;
  documentCount: number;
};

export type AdminSellerVerificationDocument = {
  id: string;
  documentType: SellerDocumentType;
  mimeType: string;
  originalFileName: string;
  bytes: number;
  documentStatus: string;
  expiresAt: string | null;
  createdAt: string;
};

export type AdminSellerVerificationDetail = {
  id: string;
  shop: { id: string; shopName: string; shopStatus: string; province: string | null; ward: string | null; streetAddress: string | null };
  sellerType: SellerType;
  businessType: BusinessType | null;
  legalName: string;
  identityDocumentType: IdentityDocumentType | null;
  identityNumber: string | null;
  taxCode: string | null;
  businessRegistrationNumber: string | null;
  legalRepresentativeName: string | null;
  registeredAddress: string | null;
  dateOfBirth: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  useAccountPhone: boolean;
  faceVerified: boolean;
  verificationStatus: VerificationStatus;
  submittedAt: string | null;
  reviewedAt: string | null;

  documents: AdminSellerVerificationDocument[];
  reviews: Array<{ id: string; reviewStatus: string; reason: string | null; createdAt: string }>;
  histories: Array<{ id: string; fromStatus: VerificationStatus | null; toStatus: VerificationStatus; createdAt: string }>;
};

export type AdminSellerVerificationParams = {
  page?: number;
  limit?: number;
  q?: string;
  status?: VerificationStatus;
  sellerType?: SellerType;
  sortBy?: 'createdAt' | 'submittedAt' | 'legalName';
  sortOrder?: 'asc' | 'desc';
};

export const adminSellerVerificationKeys = {
  all: ['admin', 'seller-verifications'] as const,
  list: (params: AdminSellerVerificationParams) => [...adminSellerVerificationKeys.all, 'list', params] as const,
  detail: (id: string) => [...adminSellerVerificationKeys.all, 'detail', id] as const,
};

export const adminSellerVerificationApi = {
  async list(params: AdminSellerVerificationParams): Promise<{ items: AdminSellerVerificationListItem[]; meta?: ApiMeta }> {
    const response = await apiGetResponse<AdminSellerVerificationListItem[]>('/admin/seller-verifications', { params });
    return { items: response.data, meta: response.meta };
  },
  detail(id: string) {
    return apiGet<AdminSellerVerificationDetail>(`/admin/seller-verifications/${id}`);
  },
  async accessDocument(profileId: string, documentId: string) {
    return apiGet<{ signedUrl: string; expiresIn: number }>(
      `/admin/seller-verifications/${profileId}/documents/${documentId}/access`,
    );
  },
  requestRevision(id: string, reason: string) {
    return apiPatch<AdminSellerVerificationDetail, { reason: string }>(
      `/admin/seller-verifications/${id}/request-revision`, { reason },
    );
  },
  approve(id: string) {
    return apiPatch<AdminSellerVerificationDetail>(`/admin/seller-verifications/${id}/approve`);
  },
  reject(id: string, reason: string) {
    return apiPatch<AdminSellerVerificationDetail, { reason: string }>(
      `/admin/seller-verifications/${id}/reject`, { reason },
    );
  },
};
