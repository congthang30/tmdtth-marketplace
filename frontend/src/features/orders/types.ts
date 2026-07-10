import type { ApiMeta } from '@/types/api';
import type { CheckoutAddressSummary, PaymentMethod } from '@/features/checkout/types';

export type OrderItem = {
  id: string;
  idString: string;
  shopId: string;
  shopIdString: string;
  productId: string;
  productIdString: string;
  productVariantId: string;
  productVariantIdString: string;
  productNameSnapshot: string;
  variantNameSnapshot: string | null;
  skuSnapshot: string | null;
  unitPrice: string;
  quantity: number;
  discountAmount: string;
  lineTotal: string;
  itemStatus: string;
  createdAt: string;
};

export type OrderShipmentTrackingHistory = {
  id: string;
  idString: string;
  fromStatus: string | null;
  toStatus: string;
  locationText: string | null;
  note: string | null;
  createdAt: string;
};

export type OrderShipment = {
  id: string;
  idString: string;
  shipmentCode: string;
  trackingNumber: string | null;
  shipmentStatus: string;
  shippingFee: string;
  shippingCompany: {
    id: string;
    idString: string;
    companyName: string;
    slug: string;
  };
  shippingService: {
    id: string;
    idString: string;
    serviceCode: string;
    serviceName: string;
  };
  expectedDeliveryAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  trackingHistories: OrderShipmentTrackingHistory[];
  createdAt: string;
  updatedAt: string | null;
};

export type ShopOrder = {
  id: string;
  idString: string;
  shopOrderCode: string;
  shop: {
    id: string;
    idString: string;
    shopName: string;
    slug: string;
  };
  orderStatus: string;
  subtotalAmount: string;
  discountAmount: string;
  shippingFeeAmount: string;
  totalAmount: string;
  items: OrderItem[];
  shipments?: OrderShipment[];
  createdAt: string;
  updatedAt: string | null;
};

export type Payment = {
  id: string;
  idString: string;
  paymentCode: string;
  paymentMethod: PaymentMethod;
  providerName: string | null;
  amount: string;
  paymentStatus: string;
  paidAt: string | null;
  expiredAt: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type Order = {
  id: string;
  idString: string;
  orderCode: string;
  orderStatus: string;
  paymentStatus: string;
  subtotalAmount: string;
  discountAmount: string;
  shippingFeeAmount: string;
  totalAmount: string;
  customerNote: string | null;
  paymentMethod: PaymentMethod;
  shopOrders: ShopOrder[];
  payments: Payment[];
  createdAt: string;
  updatedAt: string | null;
};

export type OrderListItem = Order & {
  receiverName: string;
  receiverPhone: string;
  shippingAddress: {
    province: string;
    district: string;
    ward: string;
    streetAddress: string;
  };
};

export type OrderDetail = OrderListItem & {
  address?: CheckoutAddressSummary;
};

export type OrderListResponse = {
  items: OrderListItem[];
  meta?: ApiMeta;
};

export type CancelOrderResponse = {
  id: string;
  idString: string;
  orderCode: string;
  orderStatus: string;
  paymentStatus: string;
  cancelledAt: string;
};
