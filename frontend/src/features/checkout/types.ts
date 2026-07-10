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

export type PaymentMethod = {
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
  product: {
    id: string;
    idString: string;
    productName: string;
    slug: string;
    thumbnailImage: {
      imageUrl: string;
      altText: string | null;
    } | null;
  };
  variant: {
    id: string;
    idString: string;
    sku: string;
    variantName: string;
  };
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
  paymentMethod: PaymentMethod;
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

export type CheckoutRequest = {
  addressId: string;
  paymentMethodId: string;
  selectedCartItemIds?: string[];
  voucherCode?: string;
};

export type CreateOrderRequest = CheckoutRequest & {
  customerNote?: string;
};

export type OrderResponse = {
  id: string;
  idString: string;
  orderCode: string;
  orderStatus: string;
  paymentStatus: string;
  address: CheckoutAddressSummary;
  paymentMethod: PaymentMethod;
  subtotalAmount: string;
  discountAmount: string;
  shippingFeeAmount: string;
  totalAmount: string;
  customerNote: string | null;
  createdAt: string;
  updatedAt: string | null;
};
