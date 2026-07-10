import {
  apiClient,
  apiDelete,
  apiGet,
  apiGetResponse,
  apiPatch,
  apiPost,
} from '@/services/api';
import type { ApiResponse } from '@/types/api';
import type { OrderShipment } from '@/features/orders/types';
import type {
  InventoryRequest,
  ProductImageRequest,
  ProductRequest,
  SellerImage,
  SellerInventory,
  SellerOrderListResponse,
  SellerProduct,
  SellerProductListResponse,
  SellerShopOrder,
  SellerVariant,
  SellerNoteRequest,
  ShipmentRequest,
  ShipmentTrackingRequest,
  ShippingServiceListResponse,
  Shop,
  ShopRequest,
  UploadListResponse,
  UploadedFile,
  VariantRequest,
} from './types';

const cleanParams = (params: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  );

export const sellerShopApi = {
  getMyShop() {
    return apiGet<Shop | null>('/shops/me');
  },
  createShop(body: ShopRequest) {
    return apiPost<Shop, ShopRequest>('/shops', body);
  },
};

export const sellerProductsApi = {
  async list(page = 1, limit = 10): Promise<SellerProductListResponse> {
    const response = await apiGetResponse<SellerProduct[]>('/seller/products', {
      params: { page, limit },
    });

    return {
      items: response.data,
      meta: response.meta,
    };
  },
  create(body: ProductRequest) {
    return apiPost<SellerProduct, ProductRequest>('/seller/products', body);
  },
  update(productId: string, body: ProductRequest) {
    return apiPatch<SellerProduct, ProductRequest>(
      `/seller/products/${productId}`,
      body,
    );
  },
  delete(productId: string) {
    return apiDelete<SellerProduct>(`/seller/products/${productId}`);
  },
  listVariants(productId: string) {
    return apiGet<SellerVariant[]>(`/seller/products/${productId}/variants`);
  },
  createVariant(productId: string, body: VariantRequest) {
    return apiPost<SellerVariant, VariantRequest>(
      `/seller/products/${productId}/variants`,
      body,
    );
  },
  updateVariant(productId: string, variantId: string, body: Partial<VariantRequest>) {
    return apiPatch<SellerVariant, Partial<VariantRequest>>(
      `/seller/products/${productId}/variants/${variantId}`,
      body,
    );
  },
  deleteVariant(productId: string, variantId: string) {
    return apiDelete<SellerVariant>(
      `/seller/products/${productId}/variants/${variantId}`,
    );
  },
  listImages(productId: string) {
    return apiGet<SellerImage[]>(`/seller/products/${productId}/images`);
  },
  createImage(productId: string, body: ProductImageRequest) {
    return apiPost<SellerImage, ProductImageRequest>(
      `/seller/products/${productId}/images`,
      body,
    );
  },
  updateImage(productId: string, imageId: string, body: Partial<ProductImageRequest>) {
    return apiPatch<SellerImage, Partial<ProductImageRequest>>(
      `/seller/products/${productId}/images/${imageId}`,
      body,
    );
  },
  deleteImage(productId: string, imageId: string) {
    return apiDelete<{ id: string; deleted: true }>(
      `/seller/products/${productId}/images/${imageId}`,
    );
  },
  getInventory(productId: string, variantId: string) {
    return apiGet<SellerInventory>(
      `/seller/products/${productId}/variants/${variantId}/inventory`,
    );
  },
  setInventory(productId: string, variantId: string, body: InventoryRequest) {
    return apiPatch<SellerInventory, InventoryRequest>(
      `/seller/products/${productId}/variants/${variantId}/inventory`,
      body,
    );
  },
};

export const sellerOrdersApi = {
  async list(page = 1, limit = 10): Promise<SellerOrderListResponse> {
    const response = await apiGetResponse<SellerShopOrder[]>('/seller/orders', {
      params: { page, limit },
    });

    return {
      items: response.data,
      meta: response.meta,
    };
  },
  get(id: string) {
    return apiGet<SellerShopOrder>(`/seller/orders/${id}`);
  },
  confirm(id: string, body: SellerNoteRequest) {
    return apiPatch<SellerShopOrder, SellerNoteRequest>(
      `/seller/orders/${id}/confirm`,
      body,
    );
  },
  prepare(id: string, body: SellerNoteRequest) {
    return apiPatch<SellerShopOrder, SellerNoteRequest>(
      `/seller/orders/${id}/prepare`,
      body,
    );
  },
  createShipment(shopOrderId: string, body: ShipmentRequest) {
    return apiPost<OrderShipment, ShipmentRequest>(
      `/seller/orders/${shopOrderId}/shipments`,
      body,
    );
  },
  updateShipmentTracking(
    shopOrderId: string,
    shipmentId: string,
    body: ShipmentTrackingRequest,
  ) {
    return apiPatch<OrderShipment, ShipmentTrackingRequest>(
      `/seller/orders/${shopOrderId}/shipments/${shipmentId}/tracking`,
      body,
    );
  },
};

export const sellerShippingApi = {
  async listActiveServices(shopId?: string): Promise<ShippingServiceListResponse> {
    const response = await apiGetResponse<ShippingServiceListResponse['items']>(
      '/shipping/services',
      {
        params: cleanParams({ shopId, page: 1, limit: 100 }),
      },
    );

    return {
      items: response.data,
      meta: response.meta,
    };
  },
};

export const sellerUploadsApi = {
  async list(page = 1, limit = 8): Promise<UploadListResponse> {
    const response = await apiGetResponse<UploadListResponse['items']>('/uploads', {
      params: { page, limit },
    });

    return {
      items: response.data,
      meta: response.meta,
    };
  },
  async upload(file: File): Promise<UploadedFile> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<ApiResponse<UploadedFile>>(
      '/uploads',
      formData,
    );

    return response.data.data;
  },
};
