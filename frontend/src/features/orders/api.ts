import { apiGetResponse, apiGet, apiPatch, apiPost } from '@/services/api';
import type {
  CancelOrderResponse,
  OrderDetail,
  OrderListItem,
  OrderListResponse,
} from './types';

export const ordersApi = {
  async listMyOrders(page = 1, limit = 10): Promise<OrderListResponse> {
    const response = await apiGetResponse<OrderListItem[]>('/orders/my', {
      params: { page, limit },
    });

    return {
      items: response.data,
      meta: response.meta,
    };
  },
  getMyOrder(id: string) {
    return apiGet<OrderDetail>(`/orders/${id}`);
  },
  cancelOrder(id: string, reason: string) {
    return apiPatch<CancelOrderResponse, { reason: string }>(
      `/orders/${id}/cancel`,
      { reason },
    );
  },
};

export type VnpayPaymentUrlResponse = {
  paymentUrl: string;
  expiresAt: string;
};

export type VnpayReturnResult = {
  success: boolean;
  paymentId: string | null;
  orderId: string | null;
  paymentStatus: string;
  message: string;
};

export const orderPaymentsApi = {
  createVnpayPaymentUrl(paymentId: string) {
    return apiPost<VnpayPaymentUrlResponse>(
      `/payments/${paymentId}/vnpay/payment-url`,
    );
  },
  getVnpayReturnResult(params: Record<string, string>) {
    return apiGet<VnpayReturnResult>("/payments/vnpay/return", { params });
  },
};
