import type { ApiMeta } from '@/types/api';

export type CheckoutAddressSummary = {
  id: string;
  idString: string;
  receiverName: string;
  phoneNumber: string;
  province: string;
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
    weightGram: number;
  };
  shop: CheckoutShopSummary;
};

export type CheckoutShippingSelection = {
  shippingQuoteId: string;
  shippingQuoteIdString: string;
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
  quotedFee: string;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  expiresAt: string;
};

export type AppliedVoucherSummary = {
  id: string;
  idString: string;
  voucherCode: string;
  voucherName: string;
  discountType: "Percentage" | "FixedAmount";
  discountAmount: string;
};

export type CheckoutPreviewShopGroup = {
  shop: CheckoutShopSummary;
  items: CheckoutPreviewItem[];
  subtotalAmount: string;
  discountAmount: string;
  shippingFeeAmount: string;
  totalAmount: string;
  shippingSelection: CheckoutShippingSelection | null;
  shopVoucher: AppliedVoucherSummary | null;
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
  platformVoucher: AppliedVoucherSummary | null;
};

export type ShopVoucherSelectionRequest = {
  shopId: string;
  voucherCode: string;
};

export type CheckoutRequest = {
  addressId: string;
  paymentMethodId: string;
  selectedCartItemIds?: string[];
  platformVoucherCode?: string;
  shopVoucherCodes?: ShopVoucherSelectionRequest[];
  shippingSelections?: CheckoutShippingSelectionRequest[];
};

export type CreateOrderRequest = CheckoutRequest & {
  customerNote?: string;
};

export type CheckoutShippingSelectionRequest = {
  shopId: string;
  shippingServiceId: string;
  shippingQuoteId: string;
};

export type ShippingServiceOption = {
  id: string;
  idString: string;
  shippingCompanyId: string;
  shippingCompanyIdString: string;
  serviceCode: string;
  serviceName: string;
  carrierServiceCode: string;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  isActive: boolean;
};

export type ShippingServiceListResponse = {
  items: ShippingServiceOption[];
  meta?: ApiMeta;
};

export type ShippingQuoteRequest = {
  shopId: string;
  shippingServiceId: string;
  destinationProvince: string;
  destinationWard: string;
  totalWeightGram: number;
};

export type ShippingQuote = {
  id: string;
  idString: string;
  shop: CheckoutShopSummary;
  shippingCompany: CheckoutShippingSelection['shippingCompany'];
  shippingService: CheckoutShippingSelection['shippingService'];
  destinationProvince: string;
  destinationWard: string;
  totalWeightGram: number;
  quotedFee: string;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  expiresAt: string;
  createdAt: string;
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
  payments: Array<{
    id: string;
    idString: string;
    paymentCode: string;
    paymentMethod: PaymentMethod;
    amount: string;
    paymentStatus: string;
    expiredAt: string | null;
  }>;
  createdAt: string;
  updatedAt: string | null;
};
