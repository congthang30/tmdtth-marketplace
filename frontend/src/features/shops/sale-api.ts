import { apiGet, apiPatch, apiPost } from '@/services/api';

export type SaleCampaignItem = { id: string; productVariantId: string; productName: string; variantName: string; regularPrice: string; salePrice: string };
export type SaleCampaign = { id: string; campaignName: string; startsAt: string; endsAt: string; status: 'Draft' | 'Scheduled' | 'Active' | 'Ended' | 'Cancelled'; items: SaleCampaignItem[] };
export type CreateSaleCampaignBody = { campaignName: string; startsAt: string; endsAt: string; status: 'Draft' | 'Scheduled'; items: Array<{ productVariantId: string; salePrice: string }> };

export const sellerSaleCampaignsApi = {
  list: () => apiGet<SaleCampaign[]>('/seller/sale-campaigns'),
  create: (body: CreateSaleCampaignBody) => apiPost<{ id: string }, CreateSaleCampaignBody>('/seller/sale-campaigns', body),
  cancel: (id: string) => apiPatch<{ id: string; status: string }, Record<string, never>>(`/seller/sale-campaigns/${id}/cancel`, {}),
};
