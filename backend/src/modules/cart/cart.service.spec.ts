import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppRole } from '../auth/app-role.enum';
import { AuthenticatedUser } from '../auth/types';
import { CartService } from './cart.service';

type Money = {
  toString(): string;
};

type ProductImageEntity = {
  id: bigint;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
  isThumbnail: boolean;
};

type CartItemEntity = {
  id: bigint;
  cartId: bigint;
  shopId: bigint;
  productId: bigint;
  productVariantId: bigint;
  quantity: number;
  unitPriceSnapshot: Money;
  isSelected: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  cart: {
    id: bigint;
    userId: bigint;
    cartStatus: string;
  };
  shop: {
    id: bigint;
    shopName: string;
    slug: string;
  };
  product: {
    id: bigint;
    productName: string;
    slug: string;
    images: ProductImageEntity[];
  };
  productVariant: {
    id: bigint;
    sku: string;
    variantName: string;
    price: Money;
    inventoryRecords: Array<{ quantityAvailable: number }>;
  };
};

type CartEntity = {
  id: bigint;
  userId: bigint;
  cartStatus: string;
  createdAt: Date;
  updatedAt: Date | null;
  items: CartItemEntity[];
};

type PurchasableVariantEntity = {
  id: bigint;
  sku: string;
  variantName: string;
  price: Money;
  variantStatus: string;
  inventoryRecords: Array<{ quantityAvailable: number }>;
  product: {
    id: bigint;
    productName: string;
    slug: string;
    productStatus: string;
    isDeleted: boolean;
    isViolation: boolean;
    shop: {
      id: bigint;
      shopName: string;
      slug: string;
      shopStatus: string;
      isDeleted: boolean;
    };
    category: {
      id: bigint;
      categoryName: string;
      slug: string;
      isActive: boolean;
    };
    images: ProductImageEntity[];
  };
};

type CartDelegateMock = {
  findFirst: jest.Mock<Promise<CartEntity | null>, [unknown]>;
  create: jest.Mock<Promise<CartEntity>, [unknown]>;
  update: jest.Mock<Promise<CartEntity>, [unknown]>;
};

type CartItemDelegateMock = {
  findFirst: jest.Mock<Promise<CartItemEntity | null>, [unknown]>;
  findUnique: jest.Mock<Promise<CartItemEntity | null>, [unknown]>;
  create: jest.Mock<Promise<CartItemEntity>, [unknown]>;
  update: jest.Mock<Promise<CartItemEntity>, [unknown]>;
  delete: jest.Mock<Promise<CartItemEntity>, [unknown]>;
};

type ProductVariantDelegateMock = {
  findUnique: jest.Mock<Promise<PurchasableVariantEntity | null>, [unknown]>;
};

type PrismaMock = {
  cart: CartDelegateMock;
  cartItem: CartItemDelegateMock;
  productVariant: ProductVariantDelegateMock;
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

const sellerUser: AuthenticatedUser = {
  id: 10n,
  idString: '10',
  email: 'seller@example.com',
  phoneNumber: null,
  userStatus: 'Active',
  roles: [AppRole.Seller],
  profile: null,
};

function money(value: string): Money {
  return { toString: () => value };
}

function createProductImage(): ProductImageEntity {
  return {
    id: 300n,
    imageUrl: 'https://images.example.com/products/den-ban-go.jpg',
    altText: 'Đèn bàn gỗ',
    sortOrder: 1,
    isThumbnail: true,
  };
}

function createCartItemEntity(
  overrides: Partial<CartItemEntity> = {},
): CartItemEntity {
  const now = new Date('2026-07-03T00:00:00.000Z');

  return {
    id: 500n,
    cartId: 400n,
    shopId: 100n,
    productId: 200n,
    productVariantId: 250n,
    quantity: 2,
    unitPriceSnapshot: money('159000'),
    isSelected: true,
    createdAt: now,
    updatedAt: now,
    cart: {
      id: 400n,
      userId: customerUser.id,
      cartStatus: 'Active',
    },
    shop: {
      id: 100n,
      shopName: 'Seller Home',
      slug: 'seller-home',
    },
    product: {
      id: 200n,
      productName: 'Đèn bàn gỗ',
      slug: 'den-ban-go',
      images: [createProductImage()],
    },
    productVariant: {
      id: 250n,
      sku: 'DEN-BAN-GO',
      variantName: 'Màu gỗ',
      price: money('159000'),
      inventoryRecords: [{ quantityAvailable: 8 }],
    },
    ...overrides,
  };
}

function createCartEntity(overrides: Partial<CartEntity> = {}): CartEntity {
  const now = new Date('2026-07-03T00:00:00.000Z');

  return {
    id: 400n,
    userId: customerUser.id,
    cartStatus: 'Active',
    createdAt: now,
    updatedAt: now,
    items: [],
    ...overrides,
  };
}

function createPurchasableVariantEntity(
  overrides: Partial<PurchasableVariantEntity> = {},
): PurchasableVariantEntity {
  return {
    id: 250n,
    sku: 'DEN-BAN-GO',
    variantName: 'Màu gỗ',
    price: money('159000'),
    variantStatus: 'Active',
    inventoryRecords: [{ quantityAvailable: 8 }],
    product: {
      id: 200n,
      productName: 'Đèn bàn gỗ',
      slug: 'den-ban-go',
      productStatus: 'Published',
      isDeleted: false,
      isViolation: false,
      shop: {
        id: 100n,
        shopName: 'Seller Home',
        slug: 'seller-home',
        shopStatus: 'Approved',
        isDeleted: false,
      },
      category: {
        id: 50n,
        categoryName: 'Đèn ngủ',
        slug: 'den-ngu',
        isActive: true,
      },
      images: [createProductImage()],
    },
    ...overrides,
  };
}

describe('CartService', () => {
  let prisma: PrismaMock;
  let service: CartService;

  beforeEach(() => {
    prisma = {
      cart: {
        findFirst: jest.fn<Promise<CartEntity | null>, [unknown]>(),
        create: jest.fn<Promise<CartEntity>, [unknown]>(),
        update: jest.fn<Promise<CartEntity>, [unknown]>(),
      },
      cartItem: {
        findFirst: jest.fn<Promise<CartItemEntity | null>, [unknown]>(),
        findUnique: jest.fn<Promise<CartItemEntity | null>, [unknown]>(),
        create: jest.fn<Promise<CartItemEntity>, [unknown]>(),
        update: jest.fn<Promise<CartItemEntity>, [unknown]>(),
        delete: jest.fn<Promise<CartItemEntity>, [unknown]>(),
      },
      productVariant: {
        findUnique: jest.fn<
          Promise<PurchasableVariantEntity | null>,
          [unknown]
        >(),
      },
    };
    service = new CartService(prisma as unknown as PrismaService);
  });

  it('creates an active cart for current user when none exists', async () => {
    prisma.cart.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createCartEntity());
    prisma.cart.create.mockResolvedValue(createCartEntity());

    const result = await service.getMyCart(customerUser);
    const createArgs = prisma.cart.create.mock.calls[0][0] as {
      data: { userId: bigint; cartStatus: string };
    };

    expect(createArgs.data).toMatchObject({
      userId: customerUser.id,
      cartStatus: 'Active',
    });
    expect(result.id).toBe('400');
    expect(result.items).toHaveLength(0);
    expect(result.itemCount).toBe(0);
    expect(result.selectedSubtotal).toBe('0');
  });

  it('adds a purchasable variant to the active cart', async () => {
    const createdItem = createCartItemEntity({ quantity: 2 });

    prisma.productVariant.findUnique.mockResolvedValue(
      createPurchasableVariantEntity(),
    );
    prisma.cart.findFirst.mockResolvedValue(createCartEntity());
    prisma.cartItem.findFirst.mockResolvedValue(null);
    prisma.cartItem.create.mockResolvedValue(createdItem);
    prisma.cart.update.mockResolvedValue(createCartEntity());

    const result = await service.addItem(customerUser, {
      productVariantId: '250',
      quantity: 2,
    });
    const createArgs = prisma.cartItem.create.mock.calls[0][0] as {
      data: {
        cartId: bigint;
        shopId: bigint;
        productId: bigint;
        productVariantId: bigint;
        quantity: number;
        unitPriceSnapshot: Money;
        isSelected: boolean;
      };
    };

    expect(createArgs.data).toMatchObject({
      cartId: 400n,
      shopId: 100n,
      productId: 200n,
      productVariantId: 250n,
      quantity: 2,
      isSelected: true,
    });
    expect(createArgs.data.unitPriceSnapshot.toString()).toBe('159000');
    expect(result.quantity).toBe(2);
    expect(result.lineTotal).toBe('318000');
  });

  it('increments quantity for a duplicate variant instead of creating another cart item', async () => {
    const existingItem = createCartItemEntity({ quantity: 2 });

    prisma.productVariant.findUnique.mockResolvedValue(
      createPurchasableVariantEntity(),
    );
    prisma.cart.findFirst.mockResolvedValue(createCartEntity());
    prisma.cartItem.findFirst.mockResolvedValue(existingItem);
    prisma.cartItem.update.mockResolvedValue(
      createCartItemEntity({ quantity: 5 }),
    );
    prisma.cart.update.mockResolvedValue(createCartEntity());

    const result = await service.addItem(customerUser, {
      productVariantId: '250',
      quantity: 3,
    });
    const updateArgs = prisma.cartItem.update.mock.calls[0][0] as {
      where: { id: bigint };
      data: { quantity: number; unitPriceSnapshot: Money };
    };

    expect(updateArgs.where.id).toBe(500n);
    expect(updateArgs.data.quantity).toBe(5);
    expect(updateArgs.data.unitPriceSnapshot.toString()).toBe('159000');
    expect(prisma.cartItem.create).not.toHaveBeenCalled();
    expect(result.quantity).toBe(5);
  });

  it('rejects add item when requested quantity exceeds available stock', async () => {
    prisma.productVariant.findUnique.mockResolvedValue(
      createPurchasableVariantEntity({
        inventoryRecords: [{ quantityAvailable: 1 }],
      }),
    );
    prisma.cart.findFirst.mockResolvedValue(createCartEntity());
    prisma.cartItem.findFirst.mockResolvedValue(null);

    await expect(
      service.addItem(customerUser, {
        productVariantId: '250',
        quantity: 2,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.cartItem.create).not.toHaveBeenCalled();
  });

  it('updates quantity and selection for an owned cart item', async () => {
    prisma.cartItem.findUnique.mockResolvedValue(createCartItemEntity());
    prisma.productVariant.findUnique.mockResolvedValue(
      createPurchasableVariantEntity(),
    );
    prisma.cartItem.update.mockResolvedValue(
      createCartItemEntity({ quantity: 3, isSelected: false }),
    );
    prisma.cart.update.mockResolvedValue(createCartEntity());

    const result = await service.updateItem(customerUser, '500', {
      quantity: 3,
      isSelected: false,
    });
    const updateArgs = prisma.cartItem.update.mock.calls[0][0] as {
      data: {
        quantity: number;
        isSelected: boolean;
        unitPriceSnapshot: string;
      };
    };

    expect(updateArgs.data).toMatchObject({
      quantity: 3,
      isSelected: false,
      unitPriceSnapshot: '159000',
    });
    expect(result.quantity).toBe(3);
    expect(result.isSelected).toBe(false);
  });

  it('rejects access to another user cart item', async () => {
    prisma.cartItem.findUnique.mockResolvedValue(
      createCartItemEntity({
        cart: {
          id: 400n,
          userId: sellerUser.id,
          cartStatus: 'Active',
        },
      }),
    );

    await expect(
      service.updateItem(customerUser, '500', {
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.cartItem.update).not.toHaveBeenCalled();
  });

  it('selects an owned cart item only when isSelected is provided', async () => {
    await expect(
      service.selectItem(customerUser, '500', {}),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.cartItem.findUnique.mockResolvedValue(createCartItemEntity());
    prisma.cartItem.update.mockResolvedValue(
      createCartItemEntity({ isSelected: false }),
    );
    prisma.cart.update.mockResolvedValue(createCartEntity());

    const result = await service.selectItem(customerUser, '500', {
      isSelected: false,
    });

    expect(result.isSelected).toBe(false);
  });

  it('deletes an owned cart item and touches the cart', async () => {
    prisma.cartItem.findUnique.mockResolvedValue(createCartItemEntity());
    prisma.cartItem.delete.mockResolvedValue(createCartItemEntity());
    prisma.cart.update.mockResolvedValue(createCartEntity());

    const result = await service.deleteItem(customerUser, '500');

    expect(prisma.cartItem.delete).toHaveBeenCalledWith({
      where: { id: 500n },
    });
    expect(prisma.cart.update).toHaveBeenCalledWith({
      where: { id: 400n },
      data: { updatedAt: expect.any(Date) as Date },
    });
    expect(result).toEqual({ id: '500', deleted: true });
  });

  it('returns not found for a missing cart item', async () => {
    prisma.cartItem.findUnique.mockResolvedValue(null);

    await expect(
      service.deleteItem(customerUser, '500'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.cartItem.delete).not.toHaveBeenCalled();
  });
});
