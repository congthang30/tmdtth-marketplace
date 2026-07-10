import { apiGet, apiPost } from '@/services/api';
import type {
  CheckoutPreviewResponse,
  CheckoutRequest,
  CreateOrderRequest,
  OrderResponse,
  PaymentMethod,
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
