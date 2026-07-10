import {
  apiDelete,
  apiGet,
  apiGetResponse,
  apiPatch,
  apiPost,
} from '@/services/api';
import type {
  Address,
  AddressListResponse,
  AddressRequest,
  DeleteAddressResponse,
  UpdateMeRequest,
  UserMe,
} from './types';

export const profileApi = {
  getMe() {
    return apiGet<UserMe>('/users/me');
  },
  updateMe(body: UpdateMeRequest) {
    return apiPatch<UserMe, UpdateMeRequest>('/users/me', body);
  },
};

export const addressesApi = {
  async list(page = 1, limit = 100): Promise<AddressListResponse> {
    const response = await apiGetResponse<Address[]>('/addresses', {
      params: { page, limit },
    });

    return {
      items: response.data,
      meta: response.meta,
    };
  },
  create(body: AddressRequest) {
    return apiPost<Address, AddressRequest>('/addresses', body);
  },
  update(id: string, body: Partial<AddressRequest>) {
    return apiPatch<Address, Partial<AddressRequest>>(`/addresses/${id}`, body);
  },
  delete(id: string) {
    return apiDelete<DeleteAddressResponse>(`/addresses/${id}`);
  },
  setDefault(id: string) {
    return apiPatch<Address>(`/addresses/${id}/default`);
  },
};
