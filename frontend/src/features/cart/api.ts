import { apiDelete, apiGet, apiPatch, apiPost } from '@/services/api';
import type {
  CartItemResponse,
  CartResponse,
  DeleteCartItemResponse,
} from './types';

export type AddCartItemRequest = {
  productVariantId: string;
  quantity: number;
};

export type UpdateCartItemRequest = {
  quantity?: number;
  isSelected?: boolean;
};

export const cartQueryKey = ['cart'];

export const cartApi = {
  getCart() {
    return apiGet<CartResponse>('/cart');
  },
  addItem(body: AddCartItemRequest) {
    return apiPost<CartItemResponse, AddCartItemRequest>('/cart/items', body);
  },
  updateItem(id: string, body: UpdateCartItemRequest) {
    return apiPatch<CartItemResponse, UpdateCartItemRequest>(
      `/cart/items/${id}`,
      body,
    );
  },
  selectItem(id: string, isSelected: boolean) {
    return apiPatch<CartItemResponse, UpdateCartItemRequest>(
      `/cart/items/${id}/select`,
      { isSelected },
    );
  },
  deleteItem(id: string) {
    return apiDelete<DeleteCartItemResponse>(`/cart/items/${id}`);
  },
};
