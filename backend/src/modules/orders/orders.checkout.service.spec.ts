import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppRole } from '../auth/app-role.enum';
import { AuthenticatedUser } from '../auth/types';
import { OrdersService } from './orders.service';
import { VouchersService } from '../vouchers/vouchers.service';

type AddressEntity = {
  id: bigint;
  userId: bigint;
  receiverName: string;
  phoneNumber: string;
  province: string;
  ward: string;
  streetAddress: string;
  fullAddress: string | null;
  isDeleted: boolean;
};

type PaymentMethodEntity = {
  id: bigint;
  methodCode: string;
  methodName: string;
  isOnline: boolean;
  isActive: boolean;
};

type ProductImageEntity = {
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
  isThumbnail: boolean;
};

type CheckoutCartItemEntity = {
  id: bigint;
  cartId: bigint;
  shopId: bigint;
  productId: bigint;
  productVariantId: bigint;
  quantity: number;
  unitPriceSnapshot: Prisma.Decimal;
  isSelected: boolean;
  createdAt: Date;
  shop: {
    id: bigint;
    shopName: string;
    slug: string;
    shopStatus: string;
    isDeleted: boolean;
    operationMode?: 'Open' | 'PausedUntil' | 'PausedIndefinitely';
    pauseStartsAt?: Date | null;
    pauseEndsAt?: Date | null;
    ownerUser: { userStatus: string; isDeleted: boolean };
  };
  product: {
    id: bigint;
    shopId: bigint;
    productName: string;
    slug: string;
    productStatus: string;
    isDeleted: boolean;
    isViolation: boolean;
    category: {
      isActive: boolean;
    };
    images: ProductImageEntity[];
  };
  productVariant: {
    id: bigint;
    sku: string;
    variantName: string;
    price: Prisma.Decimal;
    weightGram: number;
    variantStatus: string;
    inventoryRecords: Array<{
      id: bigint;
      quantityAvailable: number;
    }>;
  };
};

type ShippingQuoteEntity = {
  id: bigint;
  shopId: bigint;
  shippingCompanyId: bigint;
  shippingServiceId: bigint;
  destinationProvince: string;
  totalWeightGram: number;
  quotedFee: Prisma.Decimal;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  expiresAt: Date;
  createdAt: Date;
  shippingCompany: {
    id: bigint;
    companyName: string;
    slug: string;
    companyStatus: string;
    isDeleted: boolean;
  };
  shippingService: {
    id: bigint;
    serviceCode: string;
    serviceName: string;
    isActive: boolean;
  };
};

type CheckoutCartEntity = {
  id: bigint;
  userId: bigint;
  cartStatus: string;
  items: CheckoutCartItemEntity[];
};

type PrismaMock = {
  address: {
    findUnique: jest.Mock<Promise<AddressEntity | null>, [unknown]>;
  };
  paymentMethod: {
    findUnique: jest.Mock<Promise<PaymentMethodEntity | null>, [unknown]>;
  };
  cart: {
    findFirst: jest.Mock<Promise<CheckoutCartEntity | null>, [unknown]>;
  };
  shippingQuote: {
    findUnique: jest.Mock<Promise<ShippingQuoteEntity | null>, [unknown]>;
  };
};

const customerUser: AuthenticatedUser = {
  id: 9n,
  idString: '9',
  email: 'customer@example.com',
  phoneNumber: null,
  userStatus: 'Active',
  roles: [AppRole.Customer],
  profile: null,
};

function createAddress(overrides: Partial<AddressEntity> = {}): AddressEntity {
  return {
    id: 10n,
    userId: customerUser.id,
    receiverName: 'Customer Demo',
    phoneNumber: '0900000003',
    province: 'TP.HCM',
    ward: 'Ben Nghe',
    streetAddress: '10 Demo',
    fullAddress: '10 Demo, Ben Nghe, TP.HCM',
    isDeleted: false,
    ...overrides,
  };
}

function createPaymentMethod(
  overrides: Partial<PaymentMethodEntity> = {},
): PaymentMethodEntity {
  return {
    id: 20n,
    methodCode: 'COD',
    methodName: 'Cash on delivery',
    isOnline: false,
    isActive: true,
    ...overrides,
  };
}

function createCartItem(
  overrides: Partial<CheckoutCartItemEntity> = {},
): CheckoutCartItemEntity {
  const id = overrides.id ?? 500n;
  const shopId = overrides.shopId ?? 100n;
  const productId = overrides.productId ?? 200n;
  const variantId = overrides.productVariantId ?? 250n;

  return {
    id,
    cartId: 400n,
    shopId,
    productId,
    productVariantId: variantId,
    quantity: 2,
    unitPriceSnapshot: new Prisma.Decimal('159000'),
    isSelected: true,
    createdAt: new Date('2026-07-03T00:00:00.000Z'),
    shop: {
      id: shopId,
      shopName: `Shop ${shopId.toString()}`,
      slug: `shop-${shopId.toString()}`,
      shopStatus: 'Approved',
      isDeleted: false,
      operationMode: 'Open',
      pauseStartsAt: null,
      pauseEndsAt: null,
      ownerUser: { userStatus: 'Active', isDeleted: false },
    },
    product: {
      id: productId,
      shopId,
      productName: `Product ${productId.toString()}`,
      slug: `product-${productId.toString()}`,
      productStatus: 'Published',
      isDeleted: false,
      isViolation: false,
      category: {
        isActive: true,
      },
      images: [
        {
          imageUrl: `https://images.example.com/products/${productId.toString()}.jpg`,
          altText: `Product ${productId.toString()}`,
          sortOrder: 1,
          isThumbnail: true,
        },
      ],
    },
    productVariant: {
      id: variantId,
      sku: `SKU-${variantId.toString()}`,
      variantName: `Variant ${variantId.toString()}`,
      price: new Prisma.Decimal('160000'),
      weightGram: 450,
      variantStatus: 'Active',
      inventoryRecords: [
        {
          id: 300n,
          quantityAvailable: 8,
        },
      ],
    },
    ...overrides,
  };
}

function createShippingQuote(
  overrides: Partial<ShippingQuoteEntity> = {},
): ShippingQuoteEntity {
  return {
    id: 30n,
    shopId: 100n,
    shippingCompanyId: 10n,
    shippingServiceId: 20n,
    destinationProvince: 'TP.HCM',
    totalWeightGram: 900,
    quotedFee: new Prisma.Decimal('35000'),
    estimatedMinDays: 2,
    estimatedMaxDays: 5,
    expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    createdAt: new Date('2026-07-03T00:00:00.000Z'),
    shippingCompany: {
      id: 10n,
      companyName: 'Fast Ship',
      slug: 'fast-ship',
      companyStatus: 'Approved',
      isDeleted: false,
    },
    shippingService: {
      id: 20n,
      serviceCode: 'STD',
      serviceName: 'Standard Delivery',
      isActive: true,
    },
    ...overrides,
  };
}

function createCart(items: CheckoutCartItemEntity[]): CheckoutCartEntity {
  return {
    id: 400n,
    userId: customerUser.id,
    cartStatus: 'Active',
    items,
  };
}

describe('OrdersService checkout preview', () => {
  let prisma: PrismaMock;
  let service: OrdersService;

  beforeEach(() => {
    prisma = {
      address: {
        findUnique: jest.fn<Promise<AddressEntity | null>, [unknown]>(),
      },
      paymentMethod: {
        findUnique: jest.fn<Promise<PaymentMethodEntity | null>, [unknown]>(),
      },
      cart: {
        findFirst: jest.fn<Promise<CheckoutCartEntity | null>, [unknown]>(),
      },
      shippingQuote: {
        findUnique: jest.fn<Promise<ShippingQuoteEntity | null>, [unknown]>(),
      },
    };
    service = new OrdersService(
      prisma as unknown as PrismaService,
      {} as VouchersService,
    );
  });

  it('builds a multi-shop preview from selected cart items using current prices', async () => {
    const firstItem = createCartItem();
    const secondItem = createCartItem({
      id: 501n,
      shopId: 101n,
      productId: 201n,
      productVariantId: 251n,
      quantity: 1,
      unitPriceSnapshot: new Prisma.Decimal('250000'),
      productVariant: {
        id: 251n,
        sku: 'SKU-251',
        variantName: 'Variant 251',
        price: new Prisma.Decimal('250000'),
        weightGram: 800,
        variantStatus: 'Active',
        inventoryRecords: [{ id: 301n, quantityAvailable: 3 }],
      },
    });

    prisma.address.findUnique.mockResolvedValue(createAddress());
    prisma.paymentMethod.findUnique.mockResolvedValue(createPaymentMethod());
    prisma.cart.findFirst.mockResolvedValue(
      createCart([firstItem, secondItem]),
    );

    const result = await service.checkoutPreview(customerUser, {
      addressId: '10',
      paymentMethodId: '20',
    });

    expect(result.paymentMethod.methodCode).toBe('COD');
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      cartItemId: '500',
      unitPriceSnapshot: '159000',
      unitPrice: '160000',
      priceChanged: true,
      quantityAvailable: 8,
      lineTotal: '320000',
    });
    expect(result.items[1]).toMatchObject({
      cartItemId: '501',
      unitPriceSnapshot: '250000',
      unitPrice: '250000',
      priceChanged: false,
      lineTotal: '250000',
    });
    expect(result.shopGroups).toHaveLength(2);
    expect(result.selectedCartItemCount).toBe(2);
    expect(result.selectedItemCount).toBe(3);
    expect(result.subtotalAmount).toBe('570000');
    expect(result.totalAmount).toBe('570000');
  });

  it('applies selected shipping quotes to shop group and order totals', async () => {
    prisma.address.findUnique.mockResolvedValue(createAddress());
    prisma.paymentMethod.findUnique.mockResolvedValue(createPaymentMethod());
    prisma.cart.findFirst.mockResolvedValue(createCart([createCartItem()]));
    prisma.shippingQuote.findUnique.mockResolvedValue(createShippingQuote());

    const result = await service.checkoutPreview(customerUser, {
      addressId: '10',
      paymentMethodId: '20',
      shippingSelections: [
        {
          shopId: '100',
          shippingServiceId: '20',
          shippingQuoteId: '30',
        },
      ],
    });

    expect(result.shopGroups).toHaveLength(1);
    expect(result.shopGroups[0].shippingFeeAmount).toBe('35000');
    expect(result.shopGroups[0].totalAmount).toBe('355000');
    expect(result.shopGroups[0].shippingSelection).toMatchObject({
      shippingQuoteId: '30',
      quotedFee: '35000',
      shippingService: {
        id: '20',
        serviceCode: 'STD',
      },
    });
    expect(result.shippingFeeAmount).toBe('35000');
    expect(result.totalAmount).toBe('355000');
    expect(prisma.shippingQuote.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 30n },
      }),
    );
  });

  it('rejects checkout preview for an address owned by another user', async () => {
    prisma.address.findUnique.mockResolvedValue(createAddress({ userId: 99n }));
    prisma.paymentMethod.findUnique.mockResolvedValue(createPaymentMethod());
    prisma.cart.findFirst.mockResolvedValue(createCart([createCartItem()]));

    await expect(
      service.checkoutPreview(customerUser, {
        addressId: '10',
        paymentMethodId: '20',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects checkout preview when selected item id is not in the current cart', async () => {
    prisma.address.findUnique.mockResolvedValue(createAddress());
    prisma.paymentMethod.findUnique.mockResolvedValue(createPaymentMethod());
    prisma.cart.findFirst.mockResolvedValue(createCart([createCartItem()]));

    await expect(
      service.checkoutPreview(customerUser, {
        addressId: '10',
        paymentMethodId: '20',
        selectedCartItemIds: ['999'],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects checkout preview when stock is no longer available', async () => {
    prisma.address.findUnique.mockResolvedValue(createAddress());
    prisma.paymentMethod.findUnique.mockResolvedValue(createPaymentMethod());
    prisma.cart.findFirst.mockResolvedValue(
      createCart([
        createCartItem({
          quantity: 2,
          productVariant: {
            id: 250n,
            sku: 'SKU-250',
            variantName: 'Variant 250',
            price: new Prisma.Decimal('160000'),
            weightGram: 450,
            variantStatus: 'Active',
            inventoryRecords: [{ id: 300n, quantityAvailable: 1 }],
          },
        }),
      ]),
    );

    await expect(
      service.checkoutPreview(customerUser, {
        addressId: '10',
        paymentMethodId: '20',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects checkout preview when the shop is paused indefinitely', async () => {
    prisma.address.findUnique.mockResolvedValue(createAddress());
    prisma.paymentMethod.findUnique.mockResolvedValue(createPaymentMethod());
    prisma.cart.findFirst.mockResolvedValue(
      createCart([
        createCartItem({
          shop: {
            ...createCartItem().shop,
            operationMode: 'PausedIndefinitely',
            pauseStartsAt: null,
            pauseEndsAt: null,
          },
        }),
      ]),
    );

    await expect(
      service.checkoutPreview(customerUser, {
        addressId: '10',
        paymentMethodId: '20',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'CHECKOUT_ITEM_UNAVAILABLE',
        details: [expect.objectContaining({ reason: 'SHOP_PAUSED' })],
      },
    });
  });

  it('rejects checkout preview while the shop is inside a scheduled pause', async () => {
    prisma.address.findUnique.mockResolvedValue(createAddress());
    prisma.paymentMethod.findUnique.mockResolvedValue(createPaymentMethod());
    const base = createCartItem();
    prisma.cart.findFirst.mockResolvedValue(
      createCart([
        {
          ...base,
          shop: {
            ...base.shop,
            operationMode: 'PausedUntil',
            pauseStartsAt: new Date(Date.now() - 60_000),
            pauseEndsAt: new Date(Date.now() + 60_000),
          },
        },
      ]),
    );

    await expect(
      service.checkoutPreview(customerUser, {
        addressId: '10',
        paymentMethodId: '20',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'CHECKOUT_ITEM_UNAVAILABLE',
        details: [expect.objectContaining({ reason: 'SHOP_PAUSED' })],
      },
    });
  });

  it('rejects checkout preview when a cart item is no longer purchasable', async () => {
    prisma.address.findUnique.mockResolvedValue(createAddress());
    prisma.paymentMethod.findUnique.mockResolvedValue(createPaymentMethod());
    prisma.cart.findFirst.mockResolvedValue(
      createCart([
        createCartItem({
          shop: {
            id: 100n,
            shopName: 'Pending Shop',
            slug: 'pending-shop',
            shopStatus: 'PendingApproval',
            isDeleted: false,
            ownerUser: { userStatus: 'Active', isDeleted: false },
          },
        }),
      ]),
    );

    await expect(
      service.checkoutPreview(customerUser, {
        addressId: '10',
        paymentMethodId: '20',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
