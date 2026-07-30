import {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { setupApp } from '../src/common/setup-app';
import { AppRole } from '../src/modules/auth/app-role.enum';
import { AuthenticatedRequest } from '../src/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { AuthenticatedUser } from '../src/modules/auth/types';
import { CartController } from '../src/modules/cart/cart.controller';
import { CartService } from '../src/modules/cart/cart.service';
import { HealthController } from '../src/modules/health/health.controller';
import { OrdersController } from '../src/modules/orders/orders.controller';
import { OrdersService } from '../src/modules/orders/orders.service';
import { SellerOrdersController } from '../src/modules/orders/seller-orders.controller';
import { PaymentsController } from '../src/modules/payments/payments.controller';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { ProductsService } from '../src/modules/products/products.service';
import { SellerProductsController } from '../src/modules/products/seller-products.controller';
import { PublicProductReviewsController } from '../src/modules/reviews/public-product-reviews.controller';
import { ReviewsController } from '../src/modules/reviews/reviews.controller';
import { ReviewsService } from '../src/modules/reviews/reviews.service';
import { AdminShippingProvidersController } from '../src/modules/shipping/admin-shipping-providers.controller';
import { SellerShipmentsController } from '../src/modules/shipping/seller-shipments.controller';
import { ShippingController } from '../src/modules/shipping/shipping.controller';
import { ShippingService } from '../src/modules/shipping/shipping.service';
import { ShopsController } from '../src/modules/shops/shops.controller';
import { ShopsService } from '../src/modules/shops/shops.service';

type HealthE2eResponse = {
  success: boolean;
  message: string;
  data: {
    status: string;
    service: string;
    timestamp: string;
    uptimeSeconds: number;
  };
};

type CartItemE2eResponse = {
  id: string;
  idString: string;
  quantity: number;
  isSelected: boolean;
  unitPriceSnapshot: string;
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
    price: string;
    quantityAvailable: number;
  };
  shop: {
    id: string;
    idString: string;
    shopName: string;
    slug: string;
  };
  createdAt: string;
  updatedAt: string | null;
};

type CartE2eResponse = {
  id: string;
  idString: string;
  cartStatus: string;
  items: CartItemE2eResponse[];
  itemCount: number;
  selectedItemCount: number;
  subtotal: string;
  selectedSubtotal: string;
  createdAt: string;
  updatedAt: string | null;
};

type DeleteCartItemE2eResponse = {
  id: string;
  deleted: true;
};

type CheckoutPreviewItemE2eResponse = {
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
  shop: {
    id: string;
    idString: string;
    shopName: string;
    slug: string;
  };
};

type CheckoutPreviewE2eResponse = {
  address: {
    id: string;
    idString: string;
    receiverName: string;
    phoneNumber: string;
    province: string;
    ward: string;
    streetAddress: string;
    fullAddress: string | null;
  };
  paymentMethod: {
    id: string;
    idString: string;
    methodCode: string;
    methodName: string;
    isOnline: boolean;
  };
  items: CheckoutPreviewItemE2eResponse[];
  shopGroups: Array<{
    shop: CheckoutPreviewItemE2eResponse['shop'];
    items: CheckoutPreviewItemE2eResponse[];
    subtotalAmount: string;
    discountAmount: string;
    shippingFeeAmount: string;
    totalAmount: string;
  }>;
  selectedCartItemCount: number;
  selectedItemCount: number;
  subtotalAmount: string;
  discountAmount: string;
  shippingFeeAmount: string;
  totalAmount: string;
  voucher: null;
};

type ShopE2eResponse = {
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
  approvedByUserId: string | null;
  approvedByUserIdString: string | null;
  approvedAt: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string | null;
};

type ProductE2eResponse = {
  id: string;
  idString: string;
  productName: string;
  slug: string;
  description: string | null;
  brand: string | null;
  basePrice: string;
  compareAtPrice: string | null;
  priceMin: string;
  priceMax: string;
  thumbnailImage: null;
  images: [];
  variants: [];
  quantityAvailable: number;
  soldCount: string;
  viewCount: string;
  shop: {
    id: string;
    idString: string;
    shopName: string;
    slug: string;
  };
  category: {
    id: string;
    idString: string;
    categoryName: string;
    slug: string;
  };
  createdAt: string;
  updatedAt: string;
  productStatus: string;
  warrantyMonths: number;
  isViolation: boolean;
  isDeleted: boolean;
};

type ProductVariantE2eResponse = {
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

type ProductImageE2eResponse = {
  id: string;
  idString: string;
  productId: string;
  productIdString: string;
  productVariantId: string | null;
  productVariantIdString: string | null;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
  isThumbnail: boolean;
  createdAt: string;
};

type DeleteImageE2eResponse = {
  id: string;
  deleted: true;
};

type InventoryE2eResponse = {
  id: string | null;
  idString: string | null;
  productId: string;
  productIdString: string;
  productVariantId: string;
  productVariantIdString: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  lowStockThreshold: number;
  updatedAt: string | null;
};

type OrderItemE2eResponse = {
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

type OrderPaymentE2eResponse = {
  id: string;
  idString: string;
  paymentCode: string;
  paymentMethod: {
    id: string;
    idString: string;
    methodCode: string;
    methodName: string;
    isOnline: boolean;
  };
  providerName: string | null;
  amount: string;
  paymentStatus: string;
  paidAt: string | null;
  expiredAt: string | null;
  createdAt: string;
  updatedAt: string | null;
};

type OrderShipmentE2eResponse = {
  id: string;
  idString: string;
  shipmentCode: string;
  trackingNumber: string | null;
  carrierOrderCode: string | null;
  carrierStatus: string | null;
  shipmentStatus: string;
  shippingFee: string;
  handoverMethod: 'Pickup' | 'Dropoff';
  pickupStation: {
    id: number;
    name: string;
    address: string;
  } | null;
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
  trackingHistories: Array<{
    id: string;
    idString: string;
    fromStatus: string | null;
    toStatus: string;
    locationText: string | null;
    note: string | null;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string | null;
};

type OrderShopOrderE2eResponse = {
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
  items: OrderItemE2eResponse[];
  shipments?: OrderShipmentE2eResponse[];
  createdAt: string;
  updatedAt: string | null;
};

type OrderE2eResponse = {
  id: string;
  idString: string;
  orderCode: string;
  orderStatus: string;
  paymentStatus: string;
  address: CheckoutPreviewE2eResponse['address'];
  paymentMethod: CheckoutPreviewE2eResponse['paymentMethod'];
  subtotalAmount: string;
  discountAmount: string;
  shippingFeeAmount: string;
  totalAmount: string;
  customerNote: string | null;
  shopOrders: OrderShopOrderE2eResponse[];
  payments: OrderPaymentE2eResponse[];
  createdAt: string;
  updatedAt: string | null;
};

type CancelOrderE2eResponse = {
  id: string;
  idString: string;
  orderCode: string;
  orderStatus: string;
  paymentStatus: string;
  cancelledAt: string;
};

type OrderListItemE2eResponse = Omit<OrderE2eResponse, 'address'> & {
  receiverName: string;
  receiverPhone: string;
  shippingAddress: {
    province: string;
    ward: string;
    streetAddress: string;
  };
};

type SellerShopOrderE2eResponse = {
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
  items: OrderItemE2eResponse[];
  createdAt: string;
  updatedAt: string | null;
};

type CarrierProviderE2eResponse = {
  id: string;
  idString: string;
  provider: string;
  code: string;
  companyName: string;
  slug: string;
  companyStatus: string;
  isConfigured: boolean;
};

type ShippingServiceE2eResponse = {
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

type ShippingQuoteE2eResponse = {
  id: string;
  idString: string;
  shop: {
    id: string;
    idString: string;
    shopName: string;
    slug: string;
  };
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
  destinationProvince: string;
  destinationWard: string;
  totalWeightGram: number;
  quotedFee: string;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  expiresAt: string;
  createdAt: string;
};

type ShipmentE2eResponse = {
  id: string;
  idString: string;
  shopOrderId: string;
  shopOrderIdString: string;
  shipmentCode: string;
  trackingNumber: string | null;
  carrierOrderCode: string | null;
  carrierStatus: string | null;
  shipmentStatus: string;
  shippingFee: string;
  codAmount: string;
  handoverMethod: 'Pickup' | 'Dropoff';
  pickupStation: {
    id: number;
    name: string;
    address: string;
  } | null;
  pickupAddress: string | null;
  deliveryAddress: string;
  recipientName: string;
  recipientPhone: string;
  expectedDeliveryAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  shippingCompany: {
    id: string;
    idString: string;
    companyName: string;
    slug: string;
    provider: string;
  };
  shippingService: {
    id: string;
    idString: string;
    serviceCode: string;
    serviceName: string;
  };
  items: Array<{
    id: string;
    idString: string;
    orderItemId: string;
    orderItemIdString: string;
    quantity: number;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string | null;
};

type ProductReviewE2eResponse = {
  id: string;
  idString: string;
  orderItemId: string;
  orderItemIdString: string;
  product: {
    id: string;
    idString: string;
    productName: string;
    slug: string;
  };
  productVariant: {
    id: string;
    idString: string;
    sku: string;
    variantName: string;
  } | null;
  userId: string;
  userIdString: string;
  rating: number;
  reviewTitle: string | null;
  reviewContent: string | null;
  reviewStatus: string;
  createdAt: string;
  updatedAt: string | null;
};

type PublicProductReviewE2eResponse = {
  id: string;
  idString: string;
  orderItemId: string;
  orderItemIdString: string;
  productVariant: {
    id: string;
    idString: string;
    sku: string;
    variantName: string;
  } | null;
  reviewer: {
    displayName: string;
  };
  rating: number;
  reviewTitle: string | null;
  reviewContent: string | null;
  createdAt: string;
  updatedAt: string | null;
};

type SuccessBody<T> = {
  success: boolean;
  message: string;
  data: T;
};

type PaginatedE2eResponse<T> = {
  items: T[];
  message?: string;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type ErrorBody = {
  success: false;
  error: {
    code: string;
    message: string;
    details: unknown[];
  };
};

type CartServiceMock = {
  getMyCart: jest.Mock<Promise<CartE2eResponse>, [AuthenticatedUser]>;
  addItem: jest.Mock<
    Promise<CartItemE2eResponse>,
    [AuthenticatedUser, unknown]
  >;
  updateItem: jest.Mock<
    Promise<CartItemE2eResponse>,
    [AuthenticatedUser, string, unknown]
  >;
  selectItem: jest.Mock<
    Promise<CartItemE2eResponse>,
    [AuthenticatedUser, string, unknown]
  >;
  deleteItem: jest.Mock<
    Promise<DeleteCartItemE2eResponse>,
    [AuthenticatedUser, string]
  >;
};

type ShopsServiceMock = {
  createShop: jest.Mock<Promise<ShopE2eResponse>, [AuthenticatedUser, unknown]>;
};

type ProductsServiceMock = {
  createSellerProduct: jest.Mock<
    Promise<ProductE2eResponse>,
    [AuthenticatedUser, unknown]
  >;
  updateSellerProduct: jest.Mock<
    Promise<ProductE2eResponse>,
    [AuthenticatedUser, string, unknown]
  >;
  deleteSellerProduct: jest.Mock<
    Promise<ProductE2eResponse>,
    [AuthenticatedUser, string]
  >;
  listSellerProductVariants: jest.Mock<
    Promise<ProductVariantE2eResponse[]>,
    [AuthenticatedUser, string]
  >;
  createSellerProductVariant: jest.Mock<
    Promise<ProductVariantE2eResponse>,
    [AuthenticatedUser, string, unknown]
  >;
  createSellerProductVariantsBatch: jest.Mock<
    Promise<ProductVariantE2eResponse[]>,
    [AuthenticatedUser, string, unknown]
  >;
  updateSellerProductVariant: jest.Mock<
    Promise<ProductVariantE2eResponse>,
    [AuthenticatedUser, string, string, unknown]
  >;
  deleteSellerProductVariant: jest.Mock<
    Promise<ProductVariantE2eResponse>,
    [AuthenticatedUser, string, string]
  >;
  listSellerProductImages: jest.Mock<
    Promise<ProductImageE2eResponse[]>,
    [AuthenticatedUser, string]
  >;
  createSellerProductImage: jest.Mock<
    Promise<ProductImageE2eResponse>,
    [AuthenticatedUser, string, unknown]
  >;
  updateSellerProductImage: jest.Mock<
    Promise<ProductImageE2eResponse>,
    [AuthenticatedUser, string, string, unknown]
  >;
  deleteSellerProductImage: jest.Mock<
    Promise<DeleteImageE2eResponse>,
    [AuthenticatedUser, string, string]
  >;
  getSellerVariantInventory: jest.Mock<
    Promise<InventoryE2eResponse>,
    [AuthenticatedUser, string, string]
  >;
  receiveSellerVariantInventory: jest.Mock<
    Promise<InventoryE2eResponse>,
    [AuthenticatedUser, string, string, unknown]
  >;
  listSellerProducts: jest.Mock<
    Promise<PaginatedE2eResponse<ProductE2eResponse>>,
    [AuthenticatedUser, unknown]
  >;
  getSellerProduct: jest.Mock<
    Promise<ProductE2eResponse>,
    [AuthenticatedUser, string]
  >;
  submitSellerProduct: jest.Mock<
    Promise<ProductE2eResponse>,
    [AuthenticatedUser, string]
  >;
  stopSellingProduct: jest.Mock<
    Promise<ProductE2eResponse>,
    [AuthenticatedUser, string]
  >;
  resumeSellingProduct: jest.Mock<
    Promise<ProductE2eResponse>,
    [AuthenticatedUser, string]
  >;
};

type OrdersServiceMock = {
  checkoutPreview: jest.Mock<
    Promise<CheckoutPreviewE2eResponse>,
    [AuthenticatedUser, unknown]
  >;
  createOrder: jest.Mock<
    Promise<OrderE2eResponse>,
    [AuthenticatedUser, unknown]
  >;
  cancelMyOrder: jest.Mock<
    Promise<CancelOrderE2eResponse>,
    [AuthenticatedUser, string, unknown]
  >;
  listMyOrders: jest.Mock<
    Promise<PaginatedE2eResponse<OrderListItemE2eResponse>>,
    [AuthenticatedUser, unknown]
  >;
  getMyOrderDetail: jest.Mock<
    Promise<OrderListItemE2eResponse>,
    [AuthenticatedUser, string]
  >;
  listSellerShopOrders: jest.Mock<
    Promise<PaginatedE2eResponse<SellerShopOrderE2eResponse>>,
    [AuthenticatedUser, unknown]
  >;
  getSellerShopOrderDetail: jest.Mock<
    Promise<SellerShopOrderE2eResponse>,
    [AuthenticatedUser, string]
  >;
  confirmSellerShopOrder: jest.Mock<
    Promise<SellerShopOrderE2eResponse>,
    [AuthenticatedUser, string, unknown]
  >;
  prepareSellerShopOrder: jest.Mock<
    Promise<SellerShopOrderE2eResponse>,
    [AuthenticatedUser, string, unknown]
  >;
};

type PaymentsServiceMock = {
  listActiveMethods: jest.Mock<
    Promise<CheckoutPreviewE2eResponse['paymentMethod'][]>,
    []
  >;
};

type ShippingServiceMock = {
  listCarrierProviders: jest.Mock<
    Promise<{ message: string; data: CarrierProviderE2eResponse[] }>,
    []
  >;
  listActiveShippingServices: jest.Mock<
    Promise<PaginatedE2eResponse<ShippingServiceE2eResponse>>,
    [unknown]
  >;
  createShippingQuote: jest.Mock<Promise<ShippingQuoteE2eResponse>, [unknown]>;
  createSellerShipment: jest.Mock<
    Promise<ShipmentE2eResponse>,
    [AuthenticatedUser, string, unknown]
  >;
  listSellerHandoverStations: jest.Mock<
    Promise<{ items: HandoverStationE2eResponse[] }>,
    [AuthenticatedUser, string, unknown]
  >;
  syncSellerShipment: jest.Mock<
    Promise<ShipmentE2eResponse>,
    [AuthenticatedUser, string, string]
  >;
  getSellerShipmentLabel: jest.Mock<
    Promise<{ printUrl: string; expiresAt: Date }>,
    [AuthenticatedUser, string, string]
  >;
};

type HandoverStationE2eResponse = {
  id: number;
  name: string;
  address: string;
  wardName: string | null;
  districtName: string | null;
  provinceName: string | null;
};

type ReviewsServiceMock = {
  createProductReview: jest.Mock<
    Promise<ProductReviewE2eResponse>,
    [AuthenticatedUser, unknown]
  >;
  listPublicProductReviews: jest.Mock<
    Promise<PaginatedE2eResponse<PublicProductReviewE2eResponse>>,
    [string, unknown]
  >;
};

const sellerUser: AuthenticatedUser = {
  id: 7n,
  idString: '7',
  email: 'seller@example.com',
  phoneNumber: null,
  userStatus: 'Active',
  roles: [AppRole.Customer, AppRole.Seller],
  profile: null,
};

const shopResponse: ShopE2eResponse = {
  id: '1',
  idString: '1',
  ownerUserId: '7',
  ownerUserIdString: '7',
  shopName: 'Seller Home',
  slug: 'seller-home',
  description: 'Home goods',
  email: 'seller@example.com',
  phoneNumber: '0900000001',
  province: 'TP.HCM',
  ward: 'Ben Nghe',
  streetAddress: '10 Demo',
  taxCode: 'TAX001',
  shopStatus: 'PendingApproval',
  approvedByUserId: null,
  approvedByUserIdString: null,
  approvedAt: null,
  isDeleted: false,
  createdAt: '2026-07-03T00:00:00.000Z',
  updatedAt: '2026-07-03T00:00:00.000Z',
};

const productResponse: ProductE2eResponse = {
  id: '100',
  idString: '100',
  productName: 'Đèn bàn gỗ',
  slug: 'den-ban-go',
  description: 'Đèn bàn cho phòng ngủ',
  brand: 'Home Demo',
  basePrice: '159000',
  compareAtPrice: '199000',
  priceMin: '159000',
  priceMax: '159000',
  thumbnailImage: null,
  images: [],
  variants: [],
  quantityAvailable: 0,
  soldCount: '0',
  viewCount: '0',
  shop: {
    id: '1',
    idString: '1',
    shopName: 'Seller Home',
    slug: 'seller-home',
  },
  category: {
    id: '10',
    idString: '10',
    categoryName: 'Đèn ngủ',
    slug: 'den-ngu',
  },
  createdAt: '2026-07-03T00:00:00.000Z',
  updatedAt: '2026-07-03T00:00:00.000Z',
  productStatus: 'Draft',
  warrantyMonths: 6,
  isViolation: false,
  isDeleted: false,
};

const variantResponse: ProductVariantE2eResponse = {
  id: '200',
  idString: '200',
  productId: '100',
  productIdString: '100',
  sku: 'DEN-BAN-GO',
  variantName: 'Màu gỗ',
  attributes: { 'Màu sắc': 'Gỗ' },
  price: '159000',
  compareAtPrice: '199000',
  weightGram: 450,
  variantStatus: 'Active',
  quantityAvailable: 8,
  createdAt: '2026-07-03T00:00:00.000Z',
  updatedAt: '2026-07-03T00:00:00.000Z',
};

const imageResponse: ProductImageE2eResponse = {
  id: '300',
  idString: '300',
  productId: '100',
  productIdString: '100',
  productVariantId: null,
  productVariantIdString: null,
  imageUrl: 'https://images.example.com/demo/den-ban-go.jpg',
  altText: 'Đèn bàn gỗ',
  sortOrder: 1,
  isThumbnail: true,
  createdAt: '2026-07-03T00:00:00.000Z',
};

const inventoryResponse: InventoryE2eResponse = {
  id: '400',
  idString: '400',
  productId: '100',
  productIdString: '100',
  productVariantId: '200',
  productVariantIdString: '200',
  quantityOnHand: 12,
  quantityReserved: 2,
  quantityAvailable: 10,
  lowStockThreshold: 3,
  updatedAt: '2026-07-03T00:00:00.000Z',
};

const cartItemResponse: CartItemE2eResponse = {
  id: '500',
  idString: '500',
  quantity: 2,
  isSelected: true,
  unitPriceSnapshot: '159000',
  lineTotal: '318000',
  product: {
    id: '100',
    idString: '100',
    productName: 'Wood desk lamp',
    slug: 'wood-desk-lamp',
    thumbnailImage: {
      imageUrl: 'https://images.example.com/demo/wood-desk-lamp.jpg',
      altText: 'Wood desk lamp',
    },
  },
  variant: {
    id: '200',
    idString: '200',
    sku: 'WOOD-LAMP',
    variantName: 'Natural wood',
    price: '159000',
    quantityAvailable: 8,
  },
  shop: {
    id: '1',
    idString: '1',
    shopName: 'Seller Home',
    slug: 'seller-home',
  },
  createdAt: '2026-07-03T00:00:00.000Z',
  updatedAt: '2026-07-03T00:00:00.000Z',
};

const cartResponse: CartE2eResponse = {
  id: '400',
  idString: '400',
  cartStatus: 'Active',
  items: [cartItemResponse],
  itemCount: 2,
  selectedItemCount: 2,
  subtotal: '318000',
  selectedSubtotal: '318000',
  createdAt: '2026-07-03T00:00:00.000Z',
  updatedAt: '2026-07-03T00:00:00.000Z',
};

const checkoutPreviewItemResponse: CheckoutPreviewItemE2eResponse = {
  cartItemId: '500',
  cartItemIdString: '500',
  quantity: 2,
  unitPriceSnapshot: '159000',
  unitPrice: '160000',
  priceChanged: true,
  quantityAvailable: 8,
  lineSubtotal: '320000',
  discountAmount: '0',
  lineTotal: '320000',
  product: {
    id: '100',
    idString: '100',
    productName: 'Wood desk lamp',
    slug: 'wood-desk-lamp',
    thumbnailImage: {
      imageUrl: 'https://images.example.com/demo/wood-desk-lamp.jpg',
      altText: 'Wood desk lamp',
    },
  },
  variant: {
    id: '200',
    idString: '200',
    sku: 'WOOD-LAMP',
    variantName: 'Natural wood',
  },
  shop: {
    id: '1',
    idString: '1',
    shopName: 'Seller Home',
    slug: 'seller-home',
  },
};

const checkoutPreviewResponse: CheckoutPreviewE2eResponse = {
  address: {
    id: '10',
    idString: '10',
    receiverName: 'Customer Demo',
    phoneNumber: '0900000003',
    province: 'TP.HCM',
    ward: 'Ben Nghe',
    streetAddress: '10 Demo',
    fullAddress: '10 Demo, Ben Nghe, TP.HCM',
  },
  paymentMethod: {
    id: '20',
    idString: '20',
    methodCode: 'COD',
    methodName: 'Cash on delivery',
    isOnline: false,
  },
  items: [checkoutPreviewItemResponse],
  shopGroups: [
    {
      shop: {
        id: '1',
        idString: '1',
        shopName: 'Seller Home',
        slug: 'seller-home',
      },
      items: [checkoutPreviewItemResponse],
      subtotalAmount: '320000',
      discountAmount: '0',
      shippingFeeAmount: '0',
      totalAmount: '320000',
    },
  ],
  selectedCartItemCount: 1,
  selectedItemCount: 2,
  subtotalAmount: '320000',
  discountAmount: '0',
  shippingFeeAmount: '0',
  totalAmount: '320000',
  voucher: null,
};

const sellerShopOrderResponse: SellerShopOrderE2eResponse = {
  id: '501',
  idString: '501',
  shopOrderCode: 'SORD-20260703-DEMO',
  orderId: '900',
  orderIdString: '900',
  orderCode: 'ORD-20260703-DEMO',
  orderStatus: 'WaitingForSeller',
  orderPaymentStatus: 'Pending',
  shop: {
    id: '1',
    idString: '1',
    shopName: 'Seller Home',
    slug: 'seller-home',
  },
  receiverName: 'Customer Demo',
  receiverPhone: '0900000003',
  shippingAddress: {
    province: 'TP.HCM',
    ward: 'Phường Bến Nghé',
    streetAddress: '10 Demo',
  },
  customerNote: 'Giao giờ hành chính',
  subtotalAmount: '159000',
  discountAmount: '0',
  shippingFeeAmount: '0',
  totalAmount: '159000',
  sellerNote: null,
  confirmedAt: null,
  preparedAt: null,
  completedAt: null,
  items: [
    {
      id: '700',
      idString: '700',
      shopId: '1',
      shopIdString: '1',
      productId: '100',
      productIdString: '100',
      productVariantId: '200',
      productVariantIdString: '200',
      productNameSnapshot: 'Đèn bàn gỗ',
      variantNameSnapshot: 'Màu gỗ',
      skuSnapshot: 'DEN-BAN-GO',
      unitPrice: '159000',
      quantity: 1,
      discountAmount: '0',
      lineTotal: '159000',
      itemStatus: 'Active',
      createdAt: '2026-07-03T00:00:00.000Z',
    },
  ],
  createdAt: '2026-07-03T00:00:00.000Z',
  updatedAt: '2026-07-03T00:00:00.000Z',
};

const checkoutOrderResponse: OrderE2eResponse = {
  id: '900',
  idString: '900',
  orderCode: 'ORD-20260703-DEMO',
  orderStatus: 'Created',
  paymentStatus: 'Pending',
  address: checkoutPreviewResponse.address,
  paymentMethod: checkoutPreviewResponse.paymentMethod,
  subtotalAmount: '320000',
  discountAmount: '0',
  shippingFeeAmount: '0',
  totalAmount: '320000',
  customerNote: 'Leave at door',
  shopOrders: [
    {
      id: '501',
      idString: '501',
      shopOrderCode: 'SORD-20260703-DEMO',
      shop: {
        id: '1',
        idString: '1',
        shopName: 'Seller Home',
        slug: 'seller-home',
      },
      orderStatus: 'WaitingForSeller',
      subtotalAmount: '320000',
      discountAmount: '0',
      shippingFeeAmount: '0',
      totalAmount: '320000',
      items: [
        {
          id: '700',
          idString: '700',
          shopId: '1',
          shopIdString: '1',
          productId: '100',
          productIdString: '100',
          productVariantId: '200',
          productVariantIdString: '200',
          productNameSnapshot: 'Wood desk lamp',
          variantNameSnapshot: 'Natural wood',
          skuSnapshot: 'WOOD-LAMP',
          unitPrice: '160000',
          quantity: 2,
          discountAmount: '0',
          lineTotal: '320000',
          itemStatus: 'Active',
          createdAt: '2026-07-03T00:00:00.000Z',
        },
      ],
      createdAt: '2026-07-03T00:00:00.000Z',
      updatedAt: '2026-07-03T00:00:00.000Z',
    },
  ],
  payments: [
    {
      id: '800',
      idString: '800',
      paymentCode: 'PAY-20260703-DEMO',
      paymentMethod: checkoutPreviewResponse.paymentMethod,
      providerName: 'COD',
      amount: '320000',
      paymentStatus: 'Pending',
      paidAt: null,
      expiredAt: null,
      createdAt: '2026-07-03T00:00:00.000Z',
      updatedAt: '2026-07-03T00:00:00.000Z',
    },
  ],
  createdAt: '2026-07-03T00:00:00.000Z',
  updatedAt: '2026-07-03T00:00:00.000Z',
};

const myOrderResponse: OrderListItemE2eResponse = {
  id: '900',
  idString: '900',
  orderCode: 'ORD-20260703-DEMO',
  orderStatus: 'Shipping',
  paymentStatus: 'Paid',
  receiverName: 'Customer Demo',
  receiverPhone: '0900000003',
  shippingAddress: {
    province: 'TP.HCM',
    ward: 'Ben Nghe',
    streetAddress: '10 Demo',
  },
  paymentMethod: {
    id: '21',
    idString: '21',
    methodCode: 'FAKE_ONLINE',
    methodName: 'Fake online',
    isOnline: true,
  },
  subtotalAmount: '160000',
  discountAmount: '0',
  shippingFeeAmount: '35000',
  totalAmount: '195000',
  customerNote: 'Leave at door',
  shopOrders: [
    {
      id: '501',
      idString: '501',
      shopOrderCode: 'SORD-20260703-DEMO',
      shop: {
        id: '1',
        idString: '1',
        shopName: 'Seller Home',
        slug: 'seller-home',
      },
      orderStatus: 'Shipping',
      subtotalAmount: '160000',
      discountAmount: '0',
      shippingFeeAmount: '35000',
      totalAmount: '195000',
      items: [
        {
          id: '700',
          idString: '700',
          shopId: '1',
          shopIdString: '1',
          productId: '100',
          productIdString: '100',
          productVariantId: '200',
          productVariantIdString: '200',
          productNameSnapshot: 'Wood desk lamp',
          variantNameSnapshot: 'Natural wood',
          skuSnapshot: 'WOOD-LAMP',
          unitPrice: '160000',
          quantity: 1,
          discountAmount: '0',
          lineTotal: '160000',
          itemStatus: 'Active',
          createdAt: '2026-07-03T00:00:00.000Z',
        },
      ],
      shipments: [
        {
          id: '800',
          idString: '800',
          shipmentCode: 'SHP-20260703-DEMO',
          trackingNumber: 'TRACK-001',
          carrierOrderCode: 'GHN-123456',
          carrierStatus: 'transporting',
          shipmentStatus: 'InTransit',
          shippingFee: '35000',
          handoverMethod: 'Pickup',
          pickupStation: null,
          shippingCompany: {
            id: '10',
            idString: '10',
            companyName: 'Fast Ship',
            slug: 'fast-ship',
          },
          shippingService: {
            id: '20',
            idString: '20',
            serviceCode: 'STD',
            serviceName: 'Standard Delivery',
          },
          expectedDeliveryAt: '2026-07-05T00:00:00.000Z',
          pickedUpAt: '2026-07-03T03:00:00.000Z',
          deliveredAt: null,
          trackingHistories: [
            {
              id: '801',
              idString: '801',
              fromStatus: 'Pending',
              toStatus: 'InTransit',
              locationText: 'Sorting hub',
              note: 'Package scanned',
              createdAt: '2026-07-03T03:00:00.000Z',
            },
          ],
          createdAt: '2026-07-03T00:00:00.000Z',
          updatedAt: '2026-07-03T03:00:00.000Z',
        },
      ],
      createdAt: '2026-07-03T00:00:00.000Z',
      updatedAt: '2026-07-03T03:00:00.000Z',
    },
  ],
  payments: [
    {
      id: '850',
      idString: '850',
      paymentCode: 'PAY-20260703-DEMO',
      paymentMethod: {
        id: '21',
        idString: '21',
        methodCode: 'FAKE_ONLINE',
        methodName: 'Fake online',
        isOnline: true,
      },
      providerName: 'FAKE_ONLINE',
      amount: '195000',
      paymentStatus: 'Paid',
      paidAt: '2026-07-03T00:00:00.000Z',
      expiredAt: null,
      createdAt: '2026-07-03T00:00:00.000Z',
      updatedAt: '2026-07-03T00:00:00.000Z',
    },
  ],
  createdAt: '2026-07-03T00:00:00.000Z',
  updatedAt: '2026-07-03T03:00:00.000Z',
};

const carrierProviderResponse: CarrierProviderE2eResponse = {
  id: '10',
  idString: '10',
  provider: 'GHN',
  code: '11111111-1111-4111-8111-111111111111',
  companyName: 'Giao Hàng Nhanh',
  slug: 'ghn',
  companyStatus: 'Approved',
  isConfigured: false,
};

const shippingServiceResponse: ShippingServiceE2eResponse = {
  id: '20',
  idString: '20',
  shippingCompanyId: '10',
  shippingCompanyIdString: '10',
  serviceCode: 'STD',
  serviceName: 'Standard Delivery',
  carrierServiceCode: '53320',
  estimatedMinDays: 2,
  estimatedMaxDays: 5,
  isActive: true,
  createdAt: '2026-07-03T00:00:00.000Z',
  updatedAt: '2026-07-03T00:00:00.000Z',
};

const shippingQuoteResponse: ShippingQuoteE2eResponse = {
  id: '30',
  idString: '30',
  shop: {
    id: '1',
    idString: '1',
    shopName: 'Seller Home',
    slug: 'seller-home',
  },
  shippingCompany: {
    id: '10',
    idString: '10',
    companyName: 'Giao Hàng Nhanh',
    slug: 'ghn',
  },
  shippingService: {
    id: '20',
    idString: '20',
    serviceCode: 'STD',
    serviceName: 'Standard Delivery',
  },
  destinationProvince: 'TP.HCM',
  destinationWard: 'Phường Bến Nghé',
  totalWeightGram: 1500,
  quotedFee: '35000',
  estimatedMinDays: 2,
  estimatedMaxDays: 5,
  expiresAt: '2026-07-03T00:30:00.000Z',
  createdAt: '2026-07-03T00:00:00.000Z',
};

const shipmentResponse: ShipmentE2eResponse = {
  id: '800',
  idString: '800',
  shopOrderId: '501',
  shopOrderIdString: '501',
  shipmentCode: 'SHP-20260703000000-DEMO',
  trackingNumber: 'TRACK-001',
  carrierOrderCode: null,
  carrierStatus: null,
  shipmentStatus: 'Pending',
  shippingFee: '35000',
  codAmount: '0',
  handoverMethod: 'Pickup',
  pickupStation: null,
  pickupAddress: 'Seller warehouse',
  deliveryAddress: '10 Demo, PhÆ°á»ng Báº¿n NghÃ©, Quáº­n 1, TP.HCM',
  recipientName: 'Customer Demo',
  recipientPhone: '0900000003',
  expectedDeliveryAt: '2026-07-05T00:00:00.000Z',
  pickedUpAt: null,
  deliveredAt: null,
  shippingCompany: {
    id: '10',
    idString: '10',
    companyName: 'Giao Hàng Nhanh',
    slug: 'ghn',
    provider: 'GHN',
  },
  shippingService: {
    id: '20',
    idString: '20',
    serviceCode: 'STD',
    serviceName: 'Standard Delivery',
  },
  items: [
    {
      id: '810',
      idString: '810',
      orderItemId: '700',
      orderItemIdString: '700',
      quantity: 1,
      createdAt: '2026-07-03T00:00:00.000Z',
    },
  ],
  createdAt: '2026-07-03T00:00:00.000Z',
  updatedAt: '2026-07-03T00:00:00.000Z',
};

const productReviewResponse: ProductReviewE2eResponse = {
  id: '1000',
  idString: '1000',
  orderItemId: '700',
  orderItemIdString: '700',
  product: {
    id: '100',
    idString: '100',
    productName: 'Đèn bàn gỗ',
    slug: 'den-ban-go',
  },
  productVariant: {
    id: '200',
    idString: '200',
    sku: 'DEN-BAN-GO',
    variantName: 'Màu gỗ',
  },
  userId: '7',
  userIdString: '7',
  rating: 5,
  reviewTitle: 'Great product',
  reviewContent: 'Works well after delivery',
  reviewStatus: 'Published',
  createdAt: '2026-07-03T00:00:00.000Z',
  updatedAt: '2026-07-03T00:00:00.000Z',
};

const publicProductReviewResponse: PublicProductReviewE2eResponse = {
  id: '1000',
  idString: '1000',
  orderItemId: '700',
  orderItemIdString: '700',
  productVariant: {
    id: '200',
    idString: '200',
    sku: 'DEN-BAN-GO',
    variantName: 'Màu gỗ',
  },
  reviewer: {
    displayName: 'Customer Demo',
  },
  rating: 5,
  reviewTitle: 'Great product',
  reviewContent: 'Works well after delivery',
  createdAt: '2026-07-03T00:00:00.000Z',
  updatedAt: '2026-07-03T00:00:00.000Z',
};

describe('App API (e2e)', () => {
  let app: INestApplication;
  let cartService: CartServiceMock;
  let shopsService: ShopsServiceMock;
  let productsService: ProductsServiceMock;
  let ordersService: OrdersServiceMock;
  let paymentsService: PaymentsServiceMock;
  let shippingService: ShippingServiceMock;
  let reviewsService: ReviewsServiceMock;

  beforeAll(async () => {
    cartService = {
      getMyCart: jest.fn<Promise<CartE2eResponse>, [AuthenticatedUser]>(),
      addItem: jest.fn<
        Promise<CartItemE2eResponse>,
        [AuthenticatedUser, unknown]
      >(),
      updateItem: jest.fn<
        Promise<CartItemE2eResponse>,
        [AuthenticatedUser, string, unknown]
      >(),
      selectItem: jest.fn<
        Promise<CartItemE2eResponse>,
        [AuthenticatedUser, string, unknown]
      >(),
      deleteItem: jest.fn<
        Promise<DeleteCartItemE2eResponse>,
        [AuthenticatedUser, string]
      >(),
    };
    shopsService = {
      createShop: jest.fn<
        Promise<ShopE2eResponse>,
        [AuthenticatedUser, unknown]
      >(),
    };
    productsService = {
      createSellerProduct: jest.fn<
        Promise<ProductE2eResponse>,
        [AuthenticatedUser, unknown]
      >(),
      updateSellerProduct: jest.fn<
        Promise<ProductE2eResponse>,
        [AuthenticatedUser, string, unknown]
      >(),
      deleteSellerProduct: jest.fn<
        Promise<ProductE2eResponse>,
        [AuthenticatedUser, string]
      >(),
      listSellerProductVariants: jest.fn<
        Promise<ProductVariantE2eResponse[]>,
        [AuthenticatedUser, string]
      >(),
      createSellerProductVariant: jest.fn<
        Promise<ProductVariantE2eResponse>,
        [AuthenticatedUser, string, unknown]
      >(),
      createSellerProductVariantsBatch: jest.fn<
        Promise<ProductVariantE2eResponse[]>,
        [AuthenticatedUser, string, unknown]
      >(),
      updateSellerProductVariant: jest.fn<
        Promise<ProductVariantE2eResponse>,
        [AuthenticatedUser, string, string, unknown]
      >(),
      deleteSellerProductVariant: jest.fn<
        Promise<ProductVariantE2eResponse>,
        [AuthenticatedUser, string, string]
      >(),
      listSellerProductImages: jest.fn<
        Promise<ProductImageE2eResponse[]>,
        [AuthenticatedUser, string]
      >(),
      createSellerProductImage: jest.fn<
        Promise<ProductImageE2eResponse>,
        [AuthenticatedUser, string, unknown]
      >(),
      updateSellerProductImage: jest.fn<
        Promise<ProductImageE2eResponse>,
        [AuthenticatedUser, string, string, unknown]
      >(),
      deleteSellerProductImage: jest.fn<
        Promise<DeleteImageE2eResponse>,
        [AuthenticatedUser, string, string]
      >(),
      getSellerVariantInventory: jest.fn<
        Promise<InventoryE2eResponse>,
        [AuthenticatedUser, string, string]
      >(),
      receiveSellerVariantInventory: jest.fn<
        Promise<InventoryE2eResponse>,
        [AuthenticatedUser, string, string, unknown]
      >(),
      listSellerProducts: jest.fn<
        Promise<PaginatedE2eResponse<ProductE2eResponse>>,
        [AuthenticatedUser, unknown]
      >(),
      getSellerProduct: jest.fn<
        Promise<ProductE2eResponse>,
        [AuthenticatedUser, string]
      >(),
      submitSellerProduct: jest.fn<
        Promise<ProductE2eResponse>,
        [AuthenticatedUser, string]
      >(),
      stopSellingProduct: jest.fn<
        Promise<ProductE2eResponse>,
        [AuthenticatedUser, string]
      >(),
      resumeSellingProduct: jest.fn<
        Promise<ProductE2eResponse>,
        [AuthenticatedUser, string]
      >(),
    };
    ordersService = {
      checkoutPreview: jest.fn<
        Promise<CheckoutPreviewE2eResponse>,
        [AuthenticatedUser, unknown]
      >(),
      createOrder: jest.fn<
        Promise<OrderE2eResponse>,
        [AuthenticatedUser, unknown]
      >(),
      cancelMyOrder: jest.fn<
        Promise<CancelOrderE2eResponse>,
        [AuthenticatedUser, string, unknown]
      >(),
      listMyOrders: jest.fn<
        Promise<PaginatedE2eResponse<OrderListItemE2eResponse>>,
        [AuthenticatedUser, unknown]
      >(),
      getMyOrderDetail: jest.fn<
        Promise<OrderListItemE2eResponse>,
        [AuthenticatedUser, string]
      >(),
      listSellerShopOrders: jest.fn<
        Promise<PaginatedE2eResponse<SellerShopOrderE2eResponse>>,
        [AuthenticatedUser, unknown]
      >(),
      getSellerShopOrderDetail: jest.fn<
        Promise<SellerShopOrderE2eResponse>,
        [AuthenticatedUser, string]
      >(),
      confirmSellerShopOrder: jest.fn<
        Promise<SellerShopOrderE2eResponse>,
        [AuthenticatedUser, string, unknown]
      >(),
      prepareSellerShopOrder: jest.fn<
        Promise<SellerShopOrderE2eResponse>,
        [AuthenticatedUser, string, unknown]
      >(),
    };
    paymentsService = {
      listActiveMethods: jest.fn<
        Promise<CheckoutPreviewE2eResponse['paymentMethod'][]>,
        []
      >(),
    };
    shippingService = {
      listCarrierProviders: jest.fn<
        Promise<{ message: string; data: CarrierProviderE2eResponse[] }>,
        []
      >(),
      listActiveShippingServices: jest.fn<
        Promise<PaginatedE2eResponse<ShippingServiceE2eResponse>>,
        [unknown]
      >(),
      createShippingQuote: jest.fn<
        Promise<ShippingQuoteE2eResponse>,
        [unknown]
      >(),
      createSellerShipment: jest.fn<
        Promise<ShipmentE2eResponse>,
        [AuthenticatedUser, string, unknown]
      >(),
      listSellerHandoverStations: jest.fn<
        Promise<{ items: HandoverStationE2eResponse[] }>,
        [AuthenticatedUser, string, unknown]
      >(),
      syncSellerShipment: jest.fn<
        Promise<ShipmentE2eResponse>,
        [AuthenticatedUser, string, string]
      >(),
      getSellerShipmentLabel: jest.fn<
        Promise<{ printUrl: string; expiresAt: Date }>,
        [AuthenticatedUser, string, string]
      >(),
    };
    reviewsService = {
      createProductReview: jest.fn<
        Promise<ProductReviewE2eResponse>,
        [AuthenticatedUser, unknown]
      >(),
      listPublicProductReviews: jest.fn<
        Promise<PaginatedE2eResponse<PublicProductReviewE2eResponse>>,
        [string, unknown]
      >(),
    };
    const jwtGuard: CanActivate = {
      canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest<AuthenticatedRequest>();

        req.user = sellerUser;
        return true;
      },
    };
    const rolesGuard: CanActivate = {
      canActivate(): boolean {
        return true;
      },
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [
        HealthController,
        CartController,
        ShopsController,
        OrdersController,
        PaymentsController,
        SellerProductsController,
        PublicProductReviewsController,
        SellerOrdersController,
        ReviewsController,
        ShippingController,
        SellerShipmentsController,
        AdminShippingProvidersController,
      ],
      providers: [
        {
          provide: CartService,
          useValue: cartService,
        },
        {
          provide: ShopsService,
          useValue: shopsService,
        },
        {
          provide: ProductsService,
          useValue: productsService,
        },
        {
          provide: OrdersService,
          useValue: ordersService,
        },
        {
          provide: PaymentsService,
          useValue: paymentsService,
        },
        {
          provide: ShippingService,
          useValue: shippingService,
        },
        {
          provide: ReviewsService,
          useValue: reviewsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(jwtGuard)
      .overrideGuard(RolesGuard)
      .useValue(rolesGuard)
      .compile();

    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    cartService.getMyCart.mockReset();
    cartService.addItem.mockReset();
    cartService.updateItem.mockReset();
    cartService.selectItem.mockReset();
    cartService.deleteItem.mockReset();
    shopsService.createShop.mockReset();
    productsService.createSellerProduct.mockReset();
    productsService.updateSellerProduct.mockReset();
    productsService.deleteSellerProduct.mockReset();
    productsService.listSellerProductVariants.mockReset();
    productsService.createSellerProductVariant.mockReset();
    productsService.createSellerProductVariantsBatch.mockReset();
    productsService.updateSellerProductVariant.mockReset();
    productsService.deleteSellerProductVariant.mockReset();
    productsService.listSellerProductImages.mockReset();
    productsService.createSellerProductImage.mockReset();
    productsService.updateSellerProductImage.mockReset();
    productsService.deleteSellerProductImage.mockReset();
    productsService.getSellerVariantInventory.mockReset();
    productsService.receiveSellerVariantInventory.mockReset();
    productsService.listSellerProducts.mockReset();
    productsService.getSellerProduct.mockReset();
    productsService.submitSellerProduct.mockReset();
    productsService.stopSellingProduct.mockReset();
    productsService.resumeSellingProduct.mockReset();
    ordersService.checkoutPreview.mockReset();
    ordersService.createOrder.mockReset();
    ordersService.cancelMyOrder.mockReset();
    ordersService.listMyOrders.mockReset();
    ordersService.getMyOrderDetail.mockReset();
    ordersService.listSellerShopOrders.mockReset();
    ordersService.getSellerShopOrderDetail.mockReset();
    ordersService.confirmSellerShopOrder.mockReset();
    ordersService.prepareSellerShopOrder.mockReset();
    paymentsService.listActiveMethods.mockReset();
    shippingService.listCarrierProviders.mockReset();
    shippingService.listActiveShippingServices.mockReset();
    shippingService.createShippingQuote.mockReset();
    shippingService.createSellerShipment.mockReset();
    shippingService.listSellerHandoverStations.mockReset();
    shippingService.syncSellerShipment.mockReset();
    shippingService.getSellerShipmentLabel.mockReset();
    reviewsService.createProductReview.mockReset();
    reviewsService.listPublicProductReviews.mockReset();
  });

  it('GET /api/health returns wrapped health payload', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .get('/api/health')
      .expect(200)
      .expect((response) => {
        const body = response.body as HealthE2eResponse;

        expect(body.success).toBe(true);
        expect(body.message).toBe('OK');
        expect(body.data.status).toBe('ok');
        expect(body.data.service).toBe('tmdtth-backend');
        expect(typeof body.data.timestamp).toBe('string');
        expect(typeof body.data.uptimeSeconds).toBe('number');
      });
  });

  it('POST /api/shops registers a seller shop pending approval', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    shopsService.createShop.mockResolvedValue(shopResponse);

    await request(server)
      .post('/api/shops')
      .send({
        shopName: ' Seller Home ',
        description: ' Home goods ',
        email: 'seller@example.com',
        phoneNumber: '0900000001',
        province: 'TP.HCM',
        ward: 'Ben Nghe',
        streetAddress: '10 Demo',
        taxCode: 'TAX001',
      })
      .expect(201)
      .expect((response) => {
        const body = response.body as SuccessBody<ShopE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.ownerUserId).toBe('7');
        expect(body.data.slug).toBe('seller-home');
        expect(body.data.shopStatus).toBe('PendingApproval');
      });

    const [userArg, dtoArg] = shopsService.createShop.mock.calls[0];
    const dto = dtoArg as {
      shopName: string;
      description: string;
      email: string;
    };

    expect(userArg).toBe(sellerUser);
    expect(dto.shopName).toBe('Seller Home');
    expect(dto.description).toBe('Home goods');
    expect(dto.email).toBe('seller@example.com');
  });

  it('POST /api/shops rejects invalid seller shop email before service call', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/shops')
      .send({
        shopName: 'Seller Home',
        email: 'not-an-email',
      })
      .expect(400)
      .expect((response) => {
        const body = response.body as ErrorBody;

        expect(body.success).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
      });

    expect(shopsService.createShop).not.toHaveBeenCalled();
  });

  it('GET /api/cart returns current user active cart', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    cartService.getMyCart.mockResolvedValue(cartResponse);

    await request(server)
      .get('/api/cart')
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<CartE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.id).toBe('400');
        expect(body.data.cartStatus).toBe('Active');
        expect(body.data.items).toHaveLength(1);
        expect(body.data.selectedSubtotal).toBe('318000');
      });

    expect(cartService.getMyCart).toHaveBeenCalledWith(sellerUser);
  });

  it('POST /api/cart/items adds an item for current user', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    cartService.addItem.mockResolvedValue(cartItemResponse);

    await request(server)
      .post('/api/cart/items')
      .send({
        productVariantId: '200',
        quantity: 2,
      })
      .expect(201)
      .expect((response) => {
        const body = response.body as SuccessBody<CartItemE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.product.id).toBe('100');
        expect(body.data.variant.id).toBe('200');
        expect(body.data.quantity).toBe(2);
      });

    const [userArg, dtoArg] = cartService.addItem.mock.calls[0];
    const dto = dtoArg as { productVariantId: string; quantity: number };

    expect(userArg).toBe(sellerUser);
    expect(dto.productVariantId).toBe('200');
    expect(dto.quantity).toBe(2);
  });

  it('POST /api/cart/items rejects invalid quantity before service call', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/cart/items')
      .send({
        productVariantId: '200',
        quantity: 0,
      })
      .expect(400)
      .expect((response) => {
        const body = response.body as ErrorBody;

        expect(body.success).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
      });

    expect(cartService.addItem).not.toHaveBeenCalled();
  });

  it('PATCH /api/cart/items/:id updates quantity and selection', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const updatedItem = {
      ...cartItemResponse,
      quantity: 3,
      isSelected: false,
      lineTotal: '477000',
    };

    cartService.updateItem.mockResolvedValue(updatedItem);

    await request(server)
      .patch('/api/cart/items/500')
      .send({
        quantity: 3,
        isSelected: false,
      })
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<CartItemE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.quantity).toBe(3);
        expect(body.data.isSelected).toBe(false);
      });

    const [userArg, itemIdArg, dtoArg] = cartService.updateItem.mock.calls[0];
    const dto = dtoArg as { quantity: number; isSelected: boolean };

    expect(userArg).toBe(sellerUser);
    expect(itemIdArg).toBe('500');
    expect(dto.quantity).toBe(3);
    expect(dto.isSelected).toBe(false);
  });

  it('PATCH /api/cart/items/:id/select changes selection state', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const selectedItem = {
      ...cartItemResponse,
      isSelected: false,
    };

    cartService.selectItem.mockResolvedValue(selectedItem);

    await request(server)
      .patch('/api/cart/items/500/select')
      .send({
        isSelected: false,
      })
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<CartItemE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.id).toBe('500');
        expect(body.data.isSelected).toBe(false);
      });

    const [userArg, itemIdArg, dtoArg] = cartService.selectItem.mock.calls[0];
    const dto = dtoArg as { isSelected: boolean };

    expect(userArg).toBe(sellerUser);
    expect(itemIdArg).toBe('500');
    expect(dto.isSelected).toBe(false);
  });

  it('DELETE /api/cart/items/:id deletes an owned item', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    cartService.deleteItem.mockResolvedValue({ id: '500', deleted: true });

    await request(server)
      .delete('/api/cart/items/500')
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<DeleteCartItemE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data).toEqual({ id: '500', deleted: true });
      });

    expect(cartService.deleteItem).toHaveBeenCalledWith(sellerUser, '500');
  });

  it('POST /api/orders/checkout-preview returns checkout totals', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    ordersService.checkoutPreview.mockResolvedValue(checkoutPreviewResponse);

    await request(server)
      .post('/api/orders/checkout-preview')
      .send({
        addressId: ' 10 ',
        paymentMethodId: '20',
        selectedCartItemIds: ['500'],
      })
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<CheckoutPreviewE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.address.id).toBe('10');
        expect(body.data.paymentMethod.methodCode).toBe('COD');
        expect(body.data.items[0].priceChanged).toBe(true);
        expect(body.data.shopGroups).toHaveLength(1);
        expect(body.data.totalAmount).toBe('320000');
      });

    const [userArg, dtoArg] = ordersService.checkoutPreview.mock.calls[0];
    const dto = dtoArg as {
      addressId: string;
      paymentMethodId: string;
      selectedCartItemIds: string[];
    };

    expect(userArg).toBe(sellerUser);
    expect(dto.addressId).toBe('10');
    expect(dto.paymentMethodId).toBe('20');
    expect(dto.selectedCartItemIds).toEqual(['500']);
  });

  it('POST /api/orders/checkout-preview rejects invalid ids before service call', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/orders/checkout-preview')
      .send({
        addressId: 'abc',
        paymentMethodId: '20',
      })
      .expect(400)
      .expect((response) => {
        const body = response.body as ErrorBody;

        expect(body.success).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
      });

    expect(ordersService.checkoutPreview).not.toHaveBeenCalled();
  });

  it('POST /api/orders creates an order from checkout', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    ordersService.createOrder.mockResolvedValue(checkoutOrderResponse);

    await request(server)
      .post('/api/orders')
      .send({
        addressId: '10',
        paymentMethodId: '20',
        selectedCartItemIds: ['500'],
        customerNote: ' Leave at door ',
      })
      .expect(201)
      .expect((response) => {
        const body = response.body as SuccessBody<OrderE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.orderCode).toBe('ORD-20260703-DEMO');
        expect(body.data.shopOrders).toHaveLength(1);
        expect(body.data.shopOrders[0].items[0].unitPrice).toBe('160000');
        expect(body.data.payments[0].paymentStatus).toBe('Pending');
        expect(body.data.customerNote).toBe('Leave at door');
      });

    const [userArg, dtoArg] = ordersService.createOrder.mock.calls[0];
    const dto = dtoArg as {
      addressId: string;
      paymentMethodId: string;
      selectedCartItemIds: string[];
      customerNote: string;
    };

    expect(userArg).toBe(sellerUser);
    expect(dto.addressId).toBe('10');
    expect(dto.paymentMethodId).toBe('20');
    expect(dto.selectedCartItemIds).toEqual(['500']);
    expect(dto.customerNote).toBe('Leave at door');
  });

  it('POST /api/orders rejects long customer note before service call', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/orders')
      .send({
        addressId: '10',
        paymentMethodId: '20',
        customerNote: 'x'.repeat(1001),
      })
      .expect(400)
      .expect((response) => {
        const body = response.body as ErrorBody;

        expect(body.success).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
      });

    expect(ordersService.createOrder).not.toHaveBeenCalled();
  });

  it('PATCH /api/orders/:id/cancel cancels a waiting customer order', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    ordersService.cancelMyOrder.mockResolvedValue({
      id: '900',
      idString: '900',
      orderCode: 'ORD-20260703-DEMO',
      orderStatus: 'Cancelled',
      paymentStatus: 'Cancelled',
      cancelledAt: '2026-07-03T01:00:00.000Z',
    });

    await request(server)
      .patch('/api/orders/900/cancel')
      .send({ reason: ' Changed my mind ' })
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<CancelOrderE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.orderCode).toBe('ORD-20260703-DEMO');
        expect(body.data.orderStatus).toBe('Cancelled');
        expect(body.data.paymentStatus).toBe('Cancelled');
      });

    const [userArg, orderIdArg, dtoArg] =
      ordersService.cancelMyOrder.mock.calls[0];
    expect(userArg).toBe(sellerUser);
    expect(orderIdArg).toBe('900');
    expect(dtoArg).toEqual({ reason: 'Changed my mind' });
  });

  it('PATCH /api/orders/:id/cancel rejects an empty reason', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .patch('/api/orders/900/cancel')
      .send({ reason: '   ' })
      .expect(400)
      .expect((response) => {
        const body = response.body as ErrorBody;

        expect(body.success).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
      });

    expect(ordersService.cancelMyOrder).not.toHaveBeenCalled();
  });

  it('GET /api/orders/my lists current customer orders', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    ordersService.listMyOrders.mockResolvedValue({
      items: [myOrderResponse],
      message: 'Orders retrieved successfully',
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });

    await request(server)
      .get('/api/orders/my?page=1&limit=20')
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<
          OrderListItemE2eResponse[]
        > & {
          meta: PaginatedE2eResponse<OrderListItemE2eResponse>['meta'];
        };

        expect(body.success).toBe(true);
        expect(body.data[0].orderCode).toBe('ORD-20260703-DEMO');
        expect(body.data[0].receiverName).toBe('Customer Demo');
        expect(body.data[0].shopOrders[0].shipments?.[0].shipmentStatus).toBe(
          'InTransit',
        );
        expect(
          body.data[0].shopOrders[0].shipments?.[0].trackingHistories[0]
            .toStatus,
        ).toBe('InTransit');
        expect(body.meta.total).toBe(1);
      });

    const [userArg, queryArg] = ordersService.listMyOrders.mock.calls[0];
    const query = queryArg as { page: number; limit: number };

    expect(userArg).toBe(sellerUser);
    expect(query.page).toBe(1);
    expect(query.limit).toBe(20);
  });

  it('GET /api/orders/:id returns current customer order detail', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    ordersService.getMyOrderDetail.mockResolvedValue(myOrderResponse);

    await request(server)
      .get('/api/orders/900')
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<OrderListItemE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.id).toBe('900');
        expect(body.data.paymentMethod.methodCode).toBe('FAKE_ONLINE');
        expect(body.data.payments[0].paymentStatus).toBe('Paid');
        expect(body.data.shopOrders[0].items[0].productNameSnapshot).toBe(
          'Wood desk lamp',
        );
      });

    expect(ordersService.getMyOrderDetail).toHaveBeenCalledWith(
      sellerUser,
      '900',
    );
  });

  it('GET /api/payments/methods lists active checkout payment methods', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    paymentsService.listActiveMethods.mockResolvedValue([
      checkoutPreviewResponse.paymentMethod,
      {
        id: '21',
        idString: '21',
        methodCode: 'FAKE_ONLINE',
        methodName: 'Fake online',
        isOnline: true,
      },
    ]);

    await request(server)
      .get('/api/payments/methods')
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<
          CheckoutPreviewE2eResponse['paymentMethod'][]
        >;

        expect(body.success).toBe(true);
        expect(body.data.map((method) => method.methodCode)).toEqual([
          'COD',
          'FAKE_ONLINE',
        ]);
      });

    expect(paymentsService.listActiveMethods).toHaveBeenCalledTimes(1);
  });

  it('GET /api/seller/products lists products for current seller', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    productsService.listSellerProducts.mockResolvedValue({
      items: [productResponse],
      message: 'OK',
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });

    await request(server)
      .get('/api/seller/products?page=1&limit=20')
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<ProductE2eResponse[]> & {
          meta: PaginatedE2eResponse<ProductE2eResponse>['meta'];
        };

        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(1);
        expect(body.data[0].slug).toBe('den-ban-go');
        expect(body.data[0].shop.id).toBe('1');
        expect(body.meta.total).toBe(1);
      });

    const [userArg, queryArg] =
      productsService.listSellerProducts.mock.calls[0];
    const query = queryArg as { page: number; limit: number };

    expect(userArg).toBe(sellerUser);
    expect(query.page).toBe(1);
    expect(query.limit).toBe(20);
  });

  it('GET /api/seller/products/:id returns current seller product detail', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    productsService.getSellerProduct.mockResolvedValue(productResponse);

    await request(server)
      .get('/api/seller/products/100')
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<ProductE2eResponse>;
        expect(body.success).toBe(true);
        expect(body.data.id).toBe('100');
        expect(body.data.warrantyMonths).toBe(6);
      });

    expect(productsService.getSellerProduct).toHaveBeenCalledWith(
      sellerUser,
      '100',
    );
    expect(productsService.listSellerProducts).not.toHaveBeenCalled();
    expect(productsService.listSellerProductVariants).not.toHaveBeenCalled();
  });

  it.each([
    ['submit', 'submitSellerProduct', 'PendingApproval'],
    ['stop-selling', 'stopSellingProduct', 'Inactive'],
    ['resume-selling', 'resumeSellingProduct', 'Published'],
  ] as const)(
    'POST /api/seller/products/:id/%s executes lifecycle action',
    async (route, method, status) => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const response = { ...productResponse, productStatus: status };
      productsService[method].mockResolvedValue(response);

      await request(server)
        .post(`/api/seller/products/100/${route}`)
        .expect(201)
        .expect((httpResponse) => {
          const body = httpResponse.body as SuccessBody<ProductE2eResponse>;
          expect(body.success).toBe(true);
          expect(body.data.productStatus).toBe(status);
        });

      expect(productsService[method]).toHaveBeenCalledWith(sellerUser, '100');
    },
  );

  it('POST /api/seller/products creates a product with current seller', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    productsService.createSellerProduct.mockResolvedValue(productResponse);

    await request(server)
      .post('/api/seller/products')
      .send({
        shopId: '1',
        categoryId: '10',
        productName: 'Đèn bàn gỗ',
        description: 'Đèn bàn cho phòng ngủ',
        brand: 'Home Demo',
        basePrice: '159000',
        compareAtPrice: '199000',
        warrantyMonths: 6,
      })
      .expect(201)
      .expect((response) => {
        const body = response.body as SuccessBody<ProductE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.slug).toBe('den-ban-go');
        expect(body.data.productStatus).toBe('Draft');
      });

    const [userArg, dtoArg] = productsService.createSellerProduct.mock.calls[0];
    const dto = dtoArg as { productName: string; basePrice: string };

    expect(userArg).toBe(sellerUser);
    expect(dto.productName).toBe('Đèn bàn gỗ');
    expect(dto.basePrice).toBe('159000');
  });

  it('POST /api/seller/products rejects invalid price before service call', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/seller/products')
      .send({
        shopId: '1',
        categoryId: '10',
        productName: 'Đèn bàn gỗ',
        basePrice: '-1',
      })
      .expect(400)
      .expect((response) => {
        const body = response.body as ErrorBody;

        expect(body.success).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
      });

    expect(productsService.createSellerProduct).not.toHaveBeenCalled();
  });

  it('PATCH /api/seller/products/:id updates a product with current seller', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const updatedProduct = {
      ...productResponse,
      productName: 'Đèn bàn tre',
      slug: 'den-ban-tre',
      basePrice: '179000',
      compareAtPrice: '209000',
    };

    productsService.updateSellerProduct.mockResolvedValue(updatedProduct);

    await request(server)
      .patch('/api/seller/products/100')
      .send({
        productName: 'Đèn bàn tre',
        basePrice: '179000',
        compareAtPrice: '209000',
      })
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<ProductE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.slug).toBe('den-ban-tre');
        expect(body.data.basePrice).toBe('179000');
      });

    const [userArg, productIdArg, dtoArg] =
      productsService.updateSellerProduct.mock.calls[0];
    const dto = dtoArg as { productName: string; basePrice: string };

    expect(userArg).toBe(sellerUser);
    expect(productIdArg).toBe('100');
    expect(dto.productName).toBe('Đèn bàn tre');
    expect(dto.basePrice).toBe('179000');
  });

  it('DELETE /api/seller/products/:id soft deletes a product with current seller', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const deletedProduct = {
      ...productResponse,
      productStatus: 'Deleted',
      isDeleted: true,
    };

    productsService.deleteSellerProduct.mockResolvedValue(deletedProduct);

    await request(server)
      .delete('/api/seller/products/100')
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<ProductE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.productStatus).toBe('Deleted');
        expect(body.data.isDeleted).toBe(true);
      });

    const [userArg, productIdArg] =
      productsService.deleteSellerProduct.mock.calls[0];

    expect(userArg).toBe(sellerUser);
    expect(productIdArg).toBe('100');
  });

  it('GET /api/seller/products/:productId/variants lists variants', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    productsService.listSellerProductVariants.mockResolvedValue([
      variantResponse,
    ]);

    await request(server)
      .get('/api/seller/products/100/variants')
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<ProductVariantE2eResponse[]>;

        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(1);
        expect(body.data[0].sku).toBe('DEN-BAN-GO');
      });

    const [userArg, productIdArg] =
      productsService.listSellerProductVariants.mock.calls[0];

    expect(userArg).toBe(sellerUser);
    expect(productIdArg).toBe('100');
  });

  it('POST /api/seller/products/:productId/variants creates a variant', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    productsService.createSellerProductVariant.mockResolvedValue(
      variantResponse,
    );

    await request(server)
      .post('/api/seller/products/100/variants')
      .send({
        attributes: { 'Màu sắc': 'Gỗ' },
        price: '159000',
        compareAtPrice: '199000',
        weightGram: 450,
        quantityOnHand: 12,
      })
      .expect(201)
      .expect((response) => {
        const body = response.body as SuccessBody<ProductVariantE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.sku).toBe('DEN-BAN-GO');
        expect(body.data.variantStatus).toBe('Active');
      });

    const [userArg, productIdArg, dtoArg] =
      productsService.createSellerProductVariant.mock.calls[0];
    const dto = dtoArg as {
      attributes: Record<string, string>;
      price: string;
      quantityOnHand: number;
    };

    expect(userArg).toBe(sellerUser);
    expect(productIdArg).toBe('100');
    expect(dto.attributes).toEqual({ 'Màu sắc': 'Gỗ' });
    expect(dto.price).toBe('159000');
    expect(dto.quantityOnHand).toBe(12);
  });

  it('POST /api/seller/products/:productId/variants/batch creates combinations', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    productsService.createSellerProductVariantsBatch.mockResolvedValue([
      variantResponse,
      {
        ...variantResponse,
        id: '201',
        idString: '201',
        variantName: 'Gỗ / M',
        attributes: { 'Màu sắc': 'Gỗ', 'Kích cỡ': 'M' },
      },
    ]);

    await request(server)
      .post('/api/seller/products/100/variants/batch')
      .send({
        variants: [
          {
            attributes: { 'Màu sắc': 'Gỗ', 'Kích cỡ': 'S' },
            price: '159000',
            quantityOnHand: '12',
          },
          {
            attributes: { 'Màu sắc': 'Gỗ', 'Kích cỡ': 'M' },
            price: '159000',
            quantityOnHand: '12',
          },
        ],
      })
      .expect(201)
      .expect((response) => {
        const body = response.body as SuccessBody<ProductVariantE2eResponse[]>;
        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(2);
      });

    const [userArg, productIdArg, dtoArg] =
      productsService.createSellerProductVariantsBatch.mock.calls[0];
    expect(userArg).toBe(sellerUser);
    expect(productIdArg).toBe('100');
    expect(dtoArg).toMatchObject({
      variants: [
        {
          attributes: { 'Màu sắc': 'Gỗ', 'Kích cỡ': 'S' },
          price: '159000',
          quantityOnHand: 12,
        },
        {
          attributes: { 'Màu sắc': 'Gỗ', 'Kích cỡ': 'M' },
          price: '159000',
          quantityOnHand: 12,
        },
      ],
    });
  });

  it('POST /api/seller/products/:productId/variants rejects retired fields', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/seller/products/100/variants')
      .send({
        attributes: { 'Màu sắc': 'Gỗ' },
        variantName: 'Tên cũ',
        price: '159000',
        quantityOnHand: 12,
      })
      .expect(400)
      .expect((response) => {
        const body = response.body as ErrorBody;

        expect(body.success).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
      });

    expect(productsService.createSellerProductVariant).not.toHaveBeenCalled();
  });

  it('POST /api/seller/products/:productId/variants rejects missing quantity', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/seller/products/100/variants')
      .send({
        attributes: { 'Màu sắc': 'Gỗ' },
        price: '159000',
      })
      .expect(400)
      .expect((response) => {
        const body = response.body as ErrorBody;

        expect(body.success).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
      });

    expect(productsService.createSellerProductVariant).not.toHaveBeenCalled();
  });

  it('PATCH /api/seller/products/:productId/variants/:variantId updates a variant', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const updatedVariant = {
      ...variantResponse,
      variantName: 'Tre',
      attributes: { 'Màu sắc': 'Tre' },
      price: '179000',
      variantStatus: 'Inactive',
    };

    productsService.updateSellerProductVariant.mockResolvedValue(
      updatedVariant,
    );

    await request(server)
      .patch('/api/seller/products/100/variants/200')
      .send({
        attributes: { 'Màu sắc': 'Tre' },
        price: '179000',
        variantStatus: 'Inactive',
      })
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<ProductVariantE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.variantName).toBe('Tre');
        expect(body.data.attributes).toEqual({ 'Màu sắc': 'Tre' });
        expect(body.data.variantStatus).toBe('Inactive');
      });

    const [userArg, productIdArg, variantIdArg] =
      productsService.updateSellerProductVariant.mock.calls[0];

    expect(userArg).toBe(sellerUser);
    expect(productIdArg).toBe('100');
    expect(variantIdArg).toBe('200');
  });

  it('DELETE /api/seller/products/:productId/variants/:variantId marks variant inactive', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const inactiveVariant = {
      ...variantResponse,
      variantStatus: 'Inactive',
    };

    productsService.deleteSellerProductVariant.mockResolvedValue(
      inactiveVariant,
    );

    await request(server)
      .delete('/api/seller/products/100/variants/200')
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<ProductVariantE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.variantStatus).toBe('Inactive');
      });

    const [userArg, productIdArg, variantIdArg] =
      productsService.deleteSellerProductVariant.mock.calls[0];

    expect(userArg).toBe(sellerUser);
    expect(productIdArg).toBe('100');
    expect(variantIdArg).toBe('200');
  });

  it('GET /api/seller/products/:productId/images lists images', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    productsService.listSellerProductImages.mockResolvedValue([imageResponse]);

    await request(server)
      .get('/api/seller/products/100/images')
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<ProductImageE2eResponse[]>;

        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(1);
        expect(body.data[0].imageUrl).toBe(
          'https://images.example.com/demo/den-ban-go.jpg',
        );
      });

    const [userArg, productIdArg] =
      productsService.listSellerProductImages.mock.calls[0];

    expect(userArg).toBe(sellerUser);
    expect(productIdArg).toBe('100');
  });

  it('POST /api/seller/products/:productId/images creates an image', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    productsService.createSellerProductImage.mockResolvedValue(imageResponse);

    await request(server)
      .post('/api/seller/products/100/images')
      .send({
        assetId: '50',
        altText: 'Đèn bàn gỗ',
        sortOrder: 1,
        isThumbnail: true,
      })
      .expect(201)
      .expect((response) => {
        const body = response.body as SuccessBody<ProductImageE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.isThumbnail).toBe(true);
      });

    const [userArg, productIdArg, dtoArg] =
      productsService.createSellerProductImage.mock.calls[0];
    const dto = dtoArg as { assetId: string; isThumbnail: boolean };

    expect(userArg).toBe(sellerUser);
    expect(productIdArg).toBe('100');
    expect(dto.assetId).toBe('50');
    expect(dto.isThumbnail).toBe(true);
  });

  it('POST /api/seller/products/:productId/images rejects unsafe imageUrl', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/seller/products/100/images')
      .send({
        assetId: 'javascript:alert(1)',
      })
      .expect(400)
      .expect((response) => {
        const body = response.body as ErrorBody;

        expect(body.success).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
      });

    expect(productsService.createSellerProductImage).not.toHaveBeenCalled();
  });

  it('PATCH /api/seller/products/:productId/images/:imageId updates an image', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const updatedImage = {
      ...imageResponse,
      altText: 'Ảnh đèn bàn mới',
      sortOrder: 2,
    };

    productsService.updateSellerProductImage.mockResolvedValue(updatedImage);

    await request(server)
      .patch('/api/seller/products/100/images/300')
      .send({
        altText: 'Ảnh đèn bàn mới',
        sortOrder: 2,
      })
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<ProductImageE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.sortOrder).toBe(2);
      });

    const [userArg, productIdArg, imageIdArg] =
      productsService.updateSellerProductImage.mock.calls[0];

    expect(userArg).toBe(sellerUser);
    expect(productIdArg).toBe('100');
    expect(imageIdArg).toBe('300');
  });

  it('DELETE /api/seller/products/:productId/images/:imageId deletes an image', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    productsService.deleteSellerProductImage.mockResolvedValue({
      id: '300',
      deleted: true,
    });

    await request(server)
      .delete('/api/seller/products/100/images/300')
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<DeleteImageE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data).toEqual({ id: '300', deleted: true });
      });

    const [userArg, productIdArg, imageIdArg] =
      productsService.deleteSellerProductImage.mock.calls[0];

    expect(userArg).toBe(sellerUser);
    expect(productIdArg).toBe('100');
    expect(imageIdArg).toBe('300');
  });

  it('GET /api/seller/products/:productId/variants/:variantId/inventory returns inventory', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    productsService.getSellerVariantInventory.mockResolvedValue(
      inventoryResponse,
    );

    await request(server)
      .get('/api/seller/products/100/variants/200/inventory')
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<InventoryE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.quantityOnHand).toBe(12);
        expect(body.data.quantityAvailable).toBe(10);
      });

    const [userArg, productIdArg, variantIdArg] =
      productsService.getSellerVariantInventory.mock.calls[0];

    expect(userArg).toBe(sellerUser);
    expect(productIdArg).toBe('100');
    expect(variantIdArg).toBe('200');
  });

  it('PATCH /api/seller/products/:productId/variants/:variantId/inventory sets inventory', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    productsService.receiveSellerVariantInventory.mockResolvedValue(
      inventoryResponse,
    );

    await request(server)
      .patch('/api/seller/products/100/variants/200/inventory')
      .send({
        quantityReceived: 12,
      })
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<InventoryE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.lowStockThreshold).toBe(3);
      });

    const [userArg, productIdArg, variantIdArg, dtoArg] =
      productsService.receiveSellerVariantInventory.mock.calls[0];
    const dto = dtoArg as { quantityReceived: number };

    expect(userArg).toBe(sellerUser);
    expect(productIdArg).toBe('100');
    expect(variantIdArg).toBe('200');
    expect(dto.quantityReceived).toBe(12);
  });

  it('PATCH /api/seller/products/:productId/variants/:variantId/inventory rejects negative quantity', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .patch('/api/seller/products/100/variants/200/inventory')
      .send({
        quantityReceived: -1,
      })
      .expect(400)
      .expect((response) => {
        const body = response.body as ErrorBody;

        expect(body.success).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
      });

    expect(
      productsService.receiveSellerVariantInventory,
    ).not.toHaveBeenCalled();
  });

  it('GET /api/seller/orders lists seller shop orders', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    ordersService.listSellerShopOrders.mockResolvedValue({
      items: [sellerShopOrderResponse],
      message: 'Seller shop orders retrieved successfully',
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });

    await request(server)
      .get('/api/seller/orders?page=1&limit=20')
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<
          SellerShopOrderE2eResponse[]
        > & {
          meta: PaginatedE2eResponse<SellerShopOrderE2eResponse>['meta'];
        };

        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(1);
        expect(body.data[0].shopOrderCode).toBe('SORD-20260703-DEMO');
        expect(body.data[0].items[0].productNameSnapshot).toBe('Đèn bàn gỗ');
        expect(body.meta.total).toBe(1);
      });

    const [userArg, queryArg] =
      ordersService.listSellerShopOrders.mock.calls[0];
    const query = queryArg as { page: number; limit: number };

    expect(userArg).toBe(sellerUser);
    expect(query.page).toBe(1);
    expect(query.limit).toBe(20);
  });

  it('GET /api/seller/orders/:id returns seller shop order detail', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    ordersService.getSellerShopOrderDetail.mockResolvedValue(
      sellerShopOrderResponse,
    );

    await request(server)
      .get('/api/seller/orders/501')
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<SellerShopOrderE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.id).toBe('501');
        expect(body.data.orderCode).toBe('ORD-20260703-DEMO');
        expect(body.data.items).toHaveLength(1);
      });

    const [userArg, shopOrderIdArg] =
      ordersService.getSellerShopOrderDetail.mock.calls[0];

    expect(userArg).toBe(sellerUser);
    expect(shopOrderIdArg).toBe('501');
  });

  it('PATCH /api/seller/orders/:id/confirm confirms a seller shop order', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const confirmedOrder = {
      ...sellerShopOrderResponse,
      orderStatus: 'Confirmed',
      sellerNote: 'Ready to pack',
      confirmedAt: '2026-07-03T01:00:00.000Z',
    };

    ordersService.confirmSellerShopOrder.mockResolvedValue(confirmedOrder);

    await request(server)
      .patch('/api/seller/orders/501/confirm')
      .send({ sellerNote: ' Ready to pack ' })
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<SellerShopOrderE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.orderStatus).toBe('Confirmed');
        expect(body.data.sellerNote).toBe('Ready to pack');
        expect(body.data.confirmedAt).toBe('2026-07-03T01:00:00.000Z');
      });

    const [userArg, shopOrderIdArg, dtoArg] =
      ordersService.confirmSellerShopOrder.mock.calls[0];
    const dto = dtoArg as { sellerNote: string };

    expect(userArg).toBe(sellerUser);
    expect(shopOrderIdArg).toBe('501');
    expect(dto.sellerNote).toBe('Ready to pack');
  });

  it('PATCH /api/seller/orders/:id/confirm rejects long seller note', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .patch('/api/seller/orders/501/confirm')
      .send({ sellerNote: 'x'.repeat(1001) })
      .expect(400)
      .expect((response) => {
        const body = response.body as ErrorBody;

        expect(body.success).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
      });

    expect(ordersService.confirmSellerShopOrder).not.toHaveBeenCalled();
  });

  it('PATCH /api/seller/orders/:id/prepare prepares a seller shop order', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const preparedOrder = {
      ...sellerShopOrderResponse,
      orderStatus: 'Prepared',
      sellerNote: 'Packed',
      confirmedAt: '2026-07-03T01:00:00.000Z',
      preparedAt: '2026-07-03T02:00:00.000Z',
    };

    ordersService.prepareSellerShopOrder.mockResolvedValue(preparedOrder);

    await request(server)
      .patch('/api/seller/orders/501/prepare')
      .send({ sellerNote: ' Packed ' })
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<SellerShopOrderE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.orderStatus).toBe('Prepared');
        expect(body.data.sellerNote).toBe('Packed');
        expect(body.data.preparedAt).toBe('2026-07-03T02:00:00.000Z');
      });

    const [userArg, shopOrderIdArg, dtoArg] =
      ordersService.prepareSellerShopOrder.mock.calls[0];
    const dto = dtoArg as { sellerNote: string };

    expect(userArg).toBe(sellerUser);
    expect(shopOrderIdArg).toBe('501');
    expect(dto.sellerNote).toBe('Packed');
  });

  it('PATCH /api/seller/orders/:id/prepare rejects long seller note', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .patch('/api/seller/orders/501/prepare')
      .send({ sellerNote: 'x'.repeat(1001) })
      .expect(400)
      .expect((response) => {
        const body = response.body as ErrorBody;

        expect(body.success).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
      });

    expect(ordersService.prepareSellerShopOrder).not.toHaveBeenCalled();
  });

  it('GET /api/admin/shipping-providers lists the carrier registry', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    shippingService.listCarrierProviders.mockResolvedValue({
      message: 'Carrier providers retrieved successfully',
      data: [carrierProviderResponse],
    });

    await request(server)
      .get('/api/admin/shipping-providers')
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<{
          message: string;
          data: CarrierProviderE2eResponse[];
        }>;

        expect(body.success).toBe(true);
        expect(body.data.data).toHaveLength(1);
        expect(body.data.data[0].provider).toBe('GHN');
        expect(body.data.data[0].isConfigured).toBe(false);
      });

    expect(shippingService.listCarrierProviders).toHaveBeenCalledWith();
  });

  it('GET /api/shipping/services lists active shipping services', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    shippingService.listActiveShippingServices.mockResolvedValue({
      items: [shippingServiceResponse],
      message: 'Shipping services retrieved successfully',
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });

    await request(server)
      .get('/api/shipping/services?page=1&limit=20')
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<
          ShippingServiceE2eResponse[]
        > & {
          meta: PaginatedE2eResponse<ShippingServiceE2eResponse>['meta'];
        };

        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(1);
        expect(body.data[0].serviceCode).toBe('STD');
        expect(body.meta.total).toBe(1);
      });

    const [queryArg] = shippingService.listActiveShippingServices.mock.calls[0];
    const query = queryArg as { page: number; limit: number };

    expect(query.page).toBe(1);
    expect(query.limit).toBe(20);
  });

  it('POST /api/shipping/quotes creates a shipping quote', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    shippingService.createShippingQuote.mockResolvedValue(
      shippingQuoteResponse,
    );

    await request(server)
      .post('/api/shipping/quotes')
      .send({
        shopId: '1',
        shippingServiceId: '20',
        destinationProvince: 'TP.HCM',
        destinationWard: 'Phường Bến Nghé',
        totalWeightGram: 1500,
      })
      .expect(201)
      .expect((response) => {
        const body = response.body as SuccessBody<ShippingQuoteE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.quotedFee).toBe('35000');
        expect(body.data.shippingService.serviceCode).toBe('STD');
        expect(body.data.expiresAt).toBe('2026-07-03T00:30:00.000Z');
      });

    const [dtoArg] = shippingService.createShippingQuote.mock.calls[0];
    const dto = dtoArg as {
      shopId: string;
      shippingServiceId: string;
      destinationWard: string;
      totalWeightGram: number;
    };

    expect(dto.shopId).toBe('1');
    expect(dto.shippingServiceId).toBe('20');
    expect(dto.destinationWard).toBe('Phường Bến Nghé');
    expect(dto.totalWeightGram).toBe(1500);
  });

  it('POST /api/shipping/quotes rejects missing destinationWard', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/shipping/quotes')
      .send({
        shopId: '1',
        shippingServiceId: '20',
        destinationProvince: 'TP.HCM',
        totalWeightGram: 1500,
      })
      .expect(400)
      .expect((response) => {
        const body = response.body as ErrorBody;

        expect(body.success).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
      });

    expect(shippingService.createShippingQuote).not.toHaveBeenCalled();
  });

  it('POST /api/shipping/quotes rejects invalid weight', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/shipping/quotes')
      .send({
        shopId: '1',
        shippingServiceId: '20',
        destinationProvince: 'TP.HCM',
        destinationWard: 'Phường Bến Nghé',
        totalWeightGram: 0,
      })
      .expect(400)
      .expect((response) => {
        const body = response.body as ErrorBody;

        expect(body.success).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
      });

    expect(shippingService.createShippingQuote).not.toHaveBeenCalled();
  });

  it('GET /api/seller/orders/:shopOrderId/shipments/handover-stations lists GHN stations', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const station: HandoverStationE2eResponse = {
      id: 2443,
      name: 'Bưu cục Nguyễn Thị Minh Khai',
      address: '2 Bis Nguyễn Thị Minh Khai, Quận 1, TP.HCM',
      wardName: 'Phường Đa Kao',
      districtName: 'Quận 1',
      provinceName: 'Hồ Chí Minh',
    };
    shippingService.listSellerHandoverStations.mockResolvedValue({
      items: [station],
    });

    await request(server)
      .get(
        '/api/seller/orders/501/shipments/handover-stations?handoverMethod=Dropoff',
      )
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<{
          items: HandoverStationE2eResponse[];
        }>;

        expect(body.success).toBe(true);
        expect(body.data.items[0].id).toBe(2443);
      });

    expect(shippingService.listSellerHandoverStations).toHaveBeenCalledWith(
      sellerUser,
      '501',
      expect.objectContaining({ handoverMethod: 'Dropoff' }),
    );
  });

  it('POST /api/seller/orders/:shopOrderId/shipments/:shipmentId/sync retries carrier registration', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const syncedShipment = {
      ...shipmentResponse,
      trackingNumber: 'GHN-123456',
      carrierOrderCode: 'GHN-123456',
      carrierStatus: 'ready_to_pick',
    };

    shippingService.syncSellerShipment.mockResolvedValue(syncedShipment);

    await request(server)
      .post('/api/seller/orders/501/shipments/800/sync')
      .expect(201)
      .expect((response) => {
        const body = response.body as SuccessBody<ShipmentE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.carrierOrderCode).toBe('GHN-123456');
      });

    expect(shippingService.syncSellerShipment).toHaveBeenCalledWith(
      sellerUser,
      '501',
      '800',
    );
  });

  it('POST /api/seller/orders/:shopOrderId/shipments creates a drop-off shipment', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const dropoffShipment: ShipmentE2eResponse = {
      ...shipmentResponse,
      handoverMethod: 'Dropoff',
      pickupStation: {
        id: 2443,
        name: 'Bưu cục Nguyễn Thị Minh Khai',
        address: '2 Bis Nguyễn Thị Minh Khai, Quận 1, TP.HCM',
      },
    };
    shippingService.createSellerShipment.mockResolvedValue(dropoffShipment);

    await request(server)
      .post('/api/seller/orders/501/shipments')
      .send({ handoverMethod: 'Dropoff', pickupStationId: 2443 })
      .expect(201)
      .expect((response) => {
        const body = response.body as SuccessBody<ShipmentE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.handoverMethod).toBe('Dropoff');
        expect(body.data.pickupStation?.id).toBe(2443);
      });

    expect(shippingService.createSellerShipment).toHaveBeenCalledWith(
      sellerUser,
      '501',
      expect.objectContaining({
        handoverMethod: 'Dropoff',
        pickupStationId: 2443,
      }),
    );
  });

  it('POST /api/seller/orders/:shopOrderId/shipments rejects drop-off without station', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/seller/orders/501/shipments')
      .send({ handoverMethod: 'Dropoff' })
      .expect(400)
      .expect((response) => {
        const body = response.body as ErrorBody;
        expect(body.error.code).toBe('VALIDATION_ERROR');
      });

    expect(shippingService.createSellerShipment).not.toHaveBeenCalled();
  });

  it('POST /api/seller/orders/:shopOrderId/shipments rejects manual tracking fields', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/seller/orders/501/shipments')
      .send({ handoverMethod: 'Pickup', trackingNumber: 'MANUAL-TRACKING' })
      .expect(400)
      .expect((response) => {
        const body = response.body as ErrorBody;
        expect(body.error.code).toBe('VALIDATION_ERROR');
      });

    expect(shippingService.createSellerShipment).not.toHaveBeenCalled();
  });

  it('POST /api/seller/orders/:shopOrderId/shipments/:shipmentId/label creates a transient GHN label URL', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    shippingService.getSellerShipmentLabel.mockResolvedValue({
      printUrl:
        'https://dev-online-gateway.ghn.vn/a5/public-api/printA5?token=test',
      expiresAt: new Date('2026-07-03T00:30:00.000Z'),
    });

    await request(server)
      .post('/api/seller/orders/501/shipments/800/label')
      .expect(201)
      .expect((response) => {
        const body = response.body as SuccessBody<{
          printUrl: string;
          expiresAt: string;
        }>;
        expect(body.data.printUrl).toContain('/printA5?token=');
      });

    expect(shippingService.getSellerShipmentLabel).toHaveBeenCalledWith(
      sellerUser,
      '501',
      '800',
    );
  });

  it('GET /api/products/:slug/reviews lists public product reviews', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    reviewsService.listPublicProductReviews.mockResolvedValue({
      items: [publicProductReviewResponse],
      message: 'Product reviews retrieved successfully',
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });

    await request(server)
      .get('/api/products/den-ban-go/reviews?page=1&limit=20')
      .expect(200)
      .expect((response) => {
        const body = response.body as SuccessBody<
          PublicProductReviewE2eResponse[]
        > & {
          meta: PaginatedE2eResponse<PublicProductReviewE2eResponse>['meta'];
        };

        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(1);
        expect(body.data[0].reviewer.displayName).toBe('Customer Demo');
        expect(body.data[0].productVariant?.sku).toBe('DEN-BAN-GO');
        expect(body.meta.total).toBe(1);
      });

    const [slugArg, queryArg] =
      reviewsService.listPublicProductReviews.mock.calls[0];
    const query = queryArg as { page: number; limit: number };

    expect(slugArg).toBe('den-ban-go');
    expect(query.page).toBe(1);
    expect(query.limit).toBe(20);
  });

  it('POST /api/reviews/products creates a product review', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    reviewsService.createProductReview.mockResolvedValue(productReviewResponse);

    await request(server)
      .post('/api/reviews/products')
      .send({
        orderItemId: '700',
        rating: 5,
        reviewTitle: ' Great product ',
        reviewContent: ' Works well after delivery ',
      })
      .expect(201)
      .expect((response) => {
        const body = response.body as SuccessBody<ProductReviewE2eResponse>;

        expect(body.success).toBe(true);
        expect(body.data.rating).toBe(5);
        expect(body.data.reviewStatus).toBe('Published');
        expect(body.data.product.slug).toBe('den-ban-go');
      });

    const [userArg, dtoArg] = reviewsService.createProductReview.mock.calls[0];
    const dto = dtoArg as {
      orderItemId: string;
      rating: number;
      reviewTitle: string;
      reviewContent: string;
    };

    expect(userArg).toBe(sellerUser);
    expect(dto.orderItemId).toBe('700');
    expect(dto.rating).toBe(5);
    expect(dto.reviewTitle).toBe('Great product');
    expect(dto.reviewContent).toBe('Works well after delivery');
  });

  it('POST /api/reviews/products rejects invalid rating', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/api/reviews/products')
      .send({
        orderItemId: '700',
        rating: 6,
      })
      .expect(400)
      .expect((response) => {
        const body = response.body as ErrorBody;

        expect(body.success).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
      });

    expect(reviewsService.createProductReview).not.toHaveBeenCalled();
  });
});
