import {
  apiGet,
  apiGetResponse,
  apiPatch,
  apiPost,
} from "@/services/api";
import type {
  Voucher,
  VoucherListResponse,
  VoucherRequest,
  VoucherSummary,
} from "./types";

const cleanParams = (params: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  );

export const adminVouchersApi = {
  async list(page = 1, limit = 10, status?: string): Promise<VoucherListResponse> {
    const response = await apiGetResponse<Voucher[]>("/admin/vouchers", {
      params: cleanParams({ page, limit, status }),
    });

    return { items: response.data, meta: response.meta };
  },
  create(body: VoucherRequest) {
    return apiPost<Voucher, VoucherRequest>("/admin/vouchers", body);
  },
  update(voucherId: string, body: VoucherRequest) {
    return apiPatch<Voucher, VoucherRequest>(
      `/admin/vouchers/${voucherId}`,
      body,
    );
  },
  deactivate(voucherId: string) {
    return apiPatch<Voucher>(`/admin/vouchers/${voucherId}/deactivate`);
  },
};

export const sellerVouchersApi = {
  async list(page = 1, limit = 10, status?: string): Promise<VoucherListResponse> {
    const response = await apiGetResponse<Voucher[]>("/seller/vouchers", {
      params: cleanParams({ page, limit, status }),
    });

    return { items: response.data, meta: response.meta };
  },
  create(body: VoucherRequest) {
    return apiPost<Voucher, VoucherRequest>("/seller/vouchers", body);
  },
  update(voucherId: string, body: VoucherRequest) {
    return apiPatch<Voucher, VoucherRequest>(
      `/seller/vouchers/${voucherId}`,
      body,
    );
  },
  deactivate(voucherId: string) {
    return apiPatch<Voucher>(`/seller/vouchers/${voucherId}/deactivate`);
  },
};

export const availableVouchersApi = {
  listAvailable(params: { shopId?: string; subtotal?: string }) {
    return apiGet<VoucherSummary[]>("/vouchers/available", {
      params: cleanParams(params),
    });
  },
};

