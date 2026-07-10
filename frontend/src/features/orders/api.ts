import { apiGetResponse, apiGet, apiPatch, apiPost } from '@/services/api';
import type { Payment } from './types';
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

export const orderPaymentsApi = {
  markFakeSuccess(paymentId: string) {
    return apiPost<Payment>(`/payments/${paymentId}/fake-success`);
  },
};
