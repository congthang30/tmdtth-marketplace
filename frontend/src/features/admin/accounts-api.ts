import { apiDelete, apiGetResponse, apiPatch } from '@/services/api';
import type { ApiMeta } from '@/types/api';

export type AdminAccount = {
  id: string;
  email: string;
  phoneNumber: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  userStatus: string;
  isSeller: boolean;
  shops: Array<{ id: string; shopName: string; shopStatus: string }>;
  createdAt: string;
  lastLoginAt: string | null;
};

export type AdminAccountParams = {
  page?: number;
  limit?: number;
  q?: string;
  type?: 'all' | 'seller' | 'customer';
  status?: 'Active' | 'Suspended';
};

export const adminAccountsApi = {
  async list(params: AdminAccountParams): Promise<{ items: AdminAccount[]; meta?: ApiMeta }> {
    const response = await apiGetResponse<AdminAccount[]>('/admin/users', { params });
    return { items: response.data, meta: response.meta };
  },
  update(id: string, body: { fullName?: string; phoneNumber?: string }) {
    return apiPatch<AdminAccount, typeof body>(`/admin/users/${id}`, body);
  },
  suspend(id: string) { return apiPatch<AdminAccount>(`/admin/users/${id}/suspend`); },
  activate(id: string) { return apiPatch<AdminAccount>(`/admin/users/${id}/activate`); },
  delete(id: string) { return apiDelete<{ id: string; deleted: true }>(`/admin/users/${id}`); },
};
