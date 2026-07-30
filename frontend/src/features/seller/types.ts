import type { ApiMeta } from '@/types/api';
import type { ProductImage, ProductListItem } from '@/features/catalog/types';
import type { OrderItem, OrderShipment } from '@/features/orders/types';

export type Shop = {
  id: string;
  idString: string;
  ownerUserId: string;
  ownerUserIdString: string;
  shopName: string;
  slug: string;
  description: string | null;
  email: string | null;
  phoneNumber: string | null;
  province: string | null;
  ward: string | null;
  streetAddress: string | null;
  taxCode: string | null;
  shopStatus: string;
  operationMode: 'Open' | 'PausedUntil' | 'PausedIndefinitely';
  pauseStartsAt: string | null;
  pauseEndsAt: string | null;
  pauseReason: string | null;
  operationUpdatedAt: string | null;
  isAcceptingOrders: boolean;
  approvedByUserId: string | null;
  approvedByUserIdString: string | null;
  approvedAt: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string | null;
  sellerVerificationId?: string | null;
  verificationStatus?: string | null;
};

export type ShopRequest = {
  shopName: string;
  description?: string;
  email?: string;
  phoneNumber?: string;
  province?: string;
  ward?: string;
  streetAddress?: string;
  taxCode?: string;
};

export type SellerProduct = ProductListItem & {
  productStatus: string;
  warrantyMonths: number;
  isViolation: boolean;
  isDeleted: boolean;
};

export type SellerProductListResponse = {
  items: SellerProduct[];
  meta?: ApiMeta;
};

export type ProductRequest = {
  shopId?: string;
  categoryId?: string;
  productName?: string;
  description?: string;
  brand?: string;
  basePrice?: string;
  compareAtPrice?: string;
  warrantyMonths?: number;
  shopCategoryIds?: string[];
};

export type SellerVariant = {
  id: string;
  idString: string;
  productId: string;
  productIdString: string;
  sku: string;
  variantName: string;
  attributes: Record<string, string>;
  price: string;
  compareAtPrice: string | null;
  weightGram: number;
  variantStatus: string;
  quantityAvailable: number;
  createdAt: string;
  updatedAt: string | null;
};

export type VariantUpdateRequest = {
  attributes?: Record<string, string>;
  price?: string;
  compareAtPrice?: string;
  weightGram?: number;
  variantStatus?: 'Active' | 'Inactive';
};

export type VariantCreateRequest = {
  attributes: Record<string, string>;
  price: string;
  compareAtPrice?: string;
  weightGram?: number;
  quantityOnHand: number;
  variantStatus?: 'Active' | 'Inactive';
};

export type VariantBatchCreateRequest = {
  variants: VariantCreateRequest[];
};

export type SellerImage = ProductImage & {
  productId: string;
  productIdString: string;
  productVariantId: string | null;
  productVariantIdString: string | null;
  createdAt: string;
};

export type ProductImageRequest = {
  productVariantId?: string;
  assetId?: string;
  altText?: string;
  sortOrder?: number;
  isThumbnail?: boolean;
};

export type SellerInventory = {
  id: string | null;
  idString: string | null;
  productId: string;
  productIdString: string;
  productVariantId: string;
  productVariantIdString: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  quantityDamaged: number;
  quantityIncoming: number;
  lowStockThreshold: number;
  updatedAt: string | null;
};

export type InventoryRequest = {
  quantityReceived: number;
};

export type DamagedInventoryRequest = {
  quantity: number;
  reason: string;
};

export type InventoryAffectedBucket = "AVAILABLE" | "ON_HAND" | "RESERVED" | "UNKNOWN";

export type SellerInventoryTransaction = {
  id: string;
  idString: string;
  transactionType: string;
  affectedBucket: InventoryAffectedBucket;
  quantityChange: number;
  quantityAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  note: string | null;
  createdBy: { id: string; email: string } | null;
  createdAt: string;
};

export type SellerInventoryTransactionListResponse = {
  items: SellerInventoryTransaction[];
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
};

export type SellerShippingSelection = {
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
  estimatedMinDays: number;
  estimatedMaxDays: number;
};

export type SellerShopOrder = {
  id: string;
  idString: string;
  shopOrderCode: string;
  orderId: string;
  orderIdString: string;
  orderCode: string;
  orderStatus: string;
  orderPaymentStatus: string;
  shop: {
    id: string;
    idString: string;
    shopName: string;
    slug: string;
  };
  receiverName: string;
  receiverPhone: string;
  shippingAddress: {
    province: string;
    ward: string;
    streetAddress: string;
  };
  customerNote: string | null;
  subtotalAmount: string;
  discountAmount: string;
  shippingFeeAmount: string;
  totalAmount: string;
  sellerNote: string | null;
  confirmedAt: string | null;
  preparedAt: string | null;
  completedAt: string | null;
  shippingSelection: SellerShippingSelection | null;
  items: OrderItem[];
  shipments?: OrderShipment[];
  createdAt: string;
  updatedAt: string | null;
};

export type SellerOrderListResponse = {
  items: SellerShopOrder[];
  meta?: ApiMeta;
};

export type SellerNoteRequest = {
  sellerNote?: string;
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
  createdAt: string;
  updatedAt: string | null;
};

export type ShippingServiceListResponse = {
  items: ShippingServiceOption[];
  meta?: ApiMeta;
};

export type ShipmentRequest = {
  handoverMethod: 'Pickup' | 'Dropoff';
  pickupStationId?: number;
};

export type HandoverStation = {
  id: number;
  name: string;
  address: string;
  wardName: string | null;
  districtName: string | null;
  provinceName: string | null;
};

export type HandoverStationListResponse = {
  items: HandoverStation[];
};

export type ShipmentLabelResponse = {
  printUrl: string;
  expiresAt: string;
};

export type UploadedFile = {
  id: string;
  assetId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
};

export type StoredUploadFile = {
  id: string;
  assetId: string;
  fileName: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  url: string;
};

export type UploadListResponse = {
  items: StoredUploadFile[];
  meta?: ApiMeta;
};
