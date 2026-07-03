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

type AddressEntity = {
  id: bigint;
  userId: bigint;
  receiverName: string;
  phoneNumber: string;
  province: string;
  district: string;
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
    variantStatus: string;
    inventoryRecords: Array<{
      id: bigint;
      quantityAvailable: number;
    }>;
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
    district: 'District 1',
    ward: 'Ben Nghe',
    streetAddress: '10 Demo',
    fullAddress: '10 Demo, Ben Nghe, District 1, TP.HCM',
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
          imageUrl: `/uploads/products/${productId.toString()}.jpg`,
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
    };
    service = new OrdersService(prisma as unknown as PrismaService);
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
