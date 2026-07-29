import { apiClient, apiDelete, apiGet, apiPatch, apiPost } from '@/services/api';
import type { ApiResponse } from '@/types/api';
import type {
  SaveSellerContactRequest,
  SaveSellerVerificationRequest,
  SellerDocumentAccess,
  SellerDocumentType,
  SellerVerificationDocument,
  SellerVerificationOverview,
  SellerVerificationProfile,
} from './types';

export const sellerVerificationQueryKey = ['seller', 'verification', 'me'] as const;

export const sellerVerificationApi = {
  getMine() {
    return apiGet<SellerVerificationOverview>('/shops/verification/me');
  },
  createDraft(body: SaveSellerVerificationRequest) {
    return apiPost<SellerVerificationProfile, SaveSellerVerificationRequest>(
      '/shops/verification',
      body,
    );
  },
  updateDraft(body: SaveSellerVerificationRequest) {
    return apiPatch<SellerVerificationProfile, SaveSellerVerificationRequest>(
      '/shops/verification/me',
      body,
    );
  },
  updateContact(body: SaveSellerContactRequest) {
    return apiPatch<SellerVerificationProfile, SaveSellerContactRequest>(
      '/shops/verification/me/contact',
      body,
    );
  },

  async uploadDocument(documentType: SellerDocumentType, file: File) {
    const body = new FormData();
    body.append('documentType', documentType);
    body.append('file', file);
    const response = await apiClient.post<ApiResponse<SellerVerificationDocument>>(
      '/shops/verification/me/documents',
      body,
    );
    return response.data.data;
  },
  accessDocument(documentId: string) {
    return apiGet<SellerDocumentAccess>(
      `/shops/verification/me/documents/${documentId}/access`,
    );
  },
  deleteDocument(documentId: string) {
    return apiDelete<{ deleted: true }>(
      `/shops/verification/me/documents/${documentId}`,
    );
  },
  sendEmailCode(email: string) {
    return apiPost<{ challengeId: string; expiresInSeconds: number; resendAfterSeconds: number; developmentCode?: string }, { email: string }>('/shops/verification/me/email/send-code', { email });
  },
  verifyEmailCode(email: string, challengeId: string, code: string) {
    return apiPost<SellerVerificationProfile, { email: string; challengeId: string; code: string }>('/shops/verification/me/email/verify-code', { email, challengeId, code });
  },
  submit() {
    return apiPost<SellerVerificationProfile>('/shops/verification/me/submit');
  },
};
