import { apiGet, apiGetResponse, apiPost } from '@/services/api';
import type {
  CheckoutPreviewResponse,
  CheckoutRequest,
  CreateOrderRequest,
  OrderResponse,
  PaymentMethod,
  ShippingQuote,
  ShippingQuoteRequest,
  ShippingServiceListResponse,
} from './types';

export const paymentsApi = {
  listMethods() {
    return apiGet<PaymentMethod[]>('/payments/methods');
  },
};

export const checkoutApi = {
  preview(body: CheckoutRequest) {
    return apiPost<CheckoutPreviewResponse, CheckoutRequest>(
      '/orders/checkout-preview',
      body,
    );
  },
  createOrder(body: CreateOrderRequest) {
    return apiPost<OrderResponse, CreateOrderRequest>('/orders', body);
  },
};

export const checkoutShippingApi = {
  async listActiveServices(shopId?: string): Promise<ShippingServiceListResponse> {
    const response = await apiGetResponse<ShippingServiceListResponse['items']>(
      '/shipping/services',
      {
        params: { shopId, page: 1, limit: 100 },
      },
    );

    return {
      items: response.data,
      meta: response.meta,
    };
  },
  createQuote(body: ShippingQuoteRequest) {
    return apiPost<ShippingQuote, ShippingQuoteRequest>('/shipping/quotes', body);
  },
};
