export type CheckoutAddressSummary = {
  id: string;
  idString: string;
  receiverName: string;
  phoneNumber: string;
  province: string;
  district: string;
  ward: string;
  streetAddress: string;
  fullAddress: string | null;
};

export type CheckoutPaymentMethodSummary = {
  id: string;
  idString: string;
  methodCode: string;
  methodName: string;
  isOnline: boolean;
};

export type CheckoutShopSummary = {
  id: string;
  idString: string;
  shopName: string;
  slug: string;
};

export type OrderProductImageSummary = {
  imageUrl: string;
  altText: string | null;
};

export type CheckoutProductSummary = {
  id: string;
  idString: string;
  productName: string;
  slug: string;
  thumbnailImage: OrderProductImageSummary | null;
};

export type CheckoutVariantSummary = {
  id: string;
  idString: string;
  sku: string;
  variantName: string;
};

export type CheckoutPreviewItem = {
  cartItemId: string;
  cartItemIdString: string;
  quantity: number;
  unitPriceSnapshot: string;
  unitPrice: string;
  priceChanged: boolean;
  quantityAvailable: number;
  lineSubtotal: string;
  discountAmount: string;
  lineTotal: string;
  product: CheckoutProductSummary;
  variant: CheckoutVariantSummary;
  shop: CheckoutShopSummary;
};

export type CheckoutPreviewShopGroup = {
  shop: CheckoutShopSummary;
  items: CheckoutPreviewItem[];
  subtotalAmount: string;
  discountAmount: string;
  shippingFeeAmount: string;
  totalAmount: string;
};

export type CheckoutPreviewResponse = {
  address: CheckoutAddressSummary;
  paymentMethod: CheckoutPaymentMethodSummary;
  items: CheckoutPreviewItem[];
  shopGroups: CheckoutPreviewShopGroup[];
  selectedCartItemCount: number;
  selectedItemCount: number;
  subtotalAmount: string;
  discountAmount: string;
  shippingFeeAmount: string;
  totalAmount: string;
  voucher: null;
};

export type OrderItemResponse = {
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
  createdAt: Date;
};

export type OrderShipmentTrackingHistoryResponse = {
  id: string;
  idString: string;
  fromStatus: string | null;
  toStatus: string;
  locationText: string | null;
  note: string | null;
  createdAt: Date;
};

export type OrderShipmentResponse = {
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
  expectedDeliveryAt: Date | null;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
  trackingHistories: OrderShipmentTrackingHistoryResponse[];
  createdAt: Date;
  updatedAt: Date | null;
};

export type ShopOrderResponse = {
  id: string;
  idString: string;
  shopOrderCode: string;
  shop: CheckoutShopSummary;
  orderStatus: string;
  subtotalAmount: string;
  discountAmount: string;
  shippingFeeAmount: string;
  totalAmount: string;
  items: OrderItemResponse[];
  shipments?: OrderShipmentResponse[];
  createdAt: Date;
  updatedAt: Date | null;
};

export type PaymentResponse = {
  id: string;
  idString: string;
  paymentCode: string;
  paymentMethod: CheckoutPaymentMethodSummary;
  providerName: string | null;
  amount: string;
  paymentStatus: string;
  paidAt: Date | null;
  expiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
};

export type OrderResponse = {
  id: string;
  idString: string;
  orderCode: string;
  orderStatus: string;
  paymentStatus: string;
  address: CheckoutAddressSummary;
  paymentMethod: CheckoutPaymentMethodSummary;
  subtotalAmount: string;
  discountAmount: string;
  shippingFeeAmount: string;
  totalAmount: string;
  customerNote: string | null;
  shopOrders: ShopOrderResponse[];
  payments: PaymentResponse[];
  createdAt: Date;
  updatedAt: Date | null;
};

export type CancelOrderResponse = {
  id: string;
  idString: string;
  orderCode: string;
  orderStatus: string;
  paymentStatus: string;
  cancelledAt: Date;
};

export type OrderListItemResponse = Omit<OrderResponse, 'address'> & {
  receiverName: string;
  receiverPhone: string;
  shippingAddress: {
    province: string;
    district: string;
    ward: string;
    streetAddress: string;
  };
};

export type SellerShopOrderResponse = {
  id: string;
  idString: string;
  shopOrderCode: string;
  orderId: string;
  orderIdString: string;
  orderCode: string;
  orderStatus: string;
  orderPaymentStatus: string;
  shop: CheckoutShopSummary;
  receiverName: string;
  receiverPhone: string;
  shippingAddress: {
    province: string;
    district: string;
    ward: string;
    streetAddress: string;
  };
  customerNote: string | null;
  subtotalAmount: string;
  discountAmount: string;
  shippingFeeAmount: string;
  totalAmount: string;
  sellerNote: string | null;
  confirmedAt: Date | null;
  preparedAt: Date | null;
  completedAt: Date | null;
  items: OrderItemResponse[];
  createdAt: Date;
  updatedAt: Date | null;
};
