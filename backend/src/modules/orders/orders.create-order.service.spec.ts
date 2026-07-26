import { BadRequestException } from '@nestjs/common';
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
    images: Array<{
      imageUrl: string;
      altText: string | null;
      sortOrder: number;
      isThumbnail: boolean;
    }>;
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

type OrderEntity = {
  id: bigint;
  orderCode: string;
  orderStatus: string;
  paymentStatus: string;
  subtotalAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  shippingFeeAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  customerNote: string | null;
  createdAt: Date;
  updatedAt: Date | null;
};

type ShopOrderEntity = {
  id: bigint;
  shopOrderCode: string;
  orderStatus: string;
  subtotalAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  shippingFeeAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date | null;
};

type OrderItemEntity = {
  id: bigint;
  shopId: bigint;
  productId: bigint;
  productVariantId: bigint;
  productNameSnapshot: string;
  variantNameSnapshot: string | null;
  skuSnapshot: string | null;
  unitPrice: Prisma.Decimal;
  quantity: number;
  discountAmount: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
  itemStatus: string;
  createdAt: Date;
};

type InventoryEntity = {
  id: bigint;
  quantityAvailable: number;
};

type PaymentEntity = {
  id: bigint;
  paymentCode: string;
  providerName: string | null;
  amount: Prisma.Decimal;
  paymentStatus: string;
  paidAt: Date | null;
  expiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
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
    update: jest.Mock<Promise<unknown>, [unknown]>;
  };
  order: {
    create: jest.Mock<Promise<OrderEntity>, [unknown]>;
  };
  orderStatusHistory: {
    create: jest.Mock<Promise<unknown>, [unknown]>;
  };
  shopOrder: {
    create: jest.Mock<Promise<ShopOrderEntity>, [unknown]>;
  };
  orderItem: {
    create: jest.Mock<Promise<OrderItemEntity>, [unknown]>;
  };
  productInventory: {
    updateMany: jest.Mock<Promise<{ count: number }>, [unknown]>;
    findUnique: jest.Mock<Promise<InventoryEntity | null>, [unknown]>;
  };
  inventoryTransaction: {
    create: jest.Mock<Promise<unknown>, [unknown]>;
  };
  payment: {
    create: jest.Mock<Promise<PaymentEntity>, [unknown]>;
  };
  paymentStatusHistory: {
    create: jest.Mock<Promise<unknown>, [unknown]>;
  };
  cartItem: {
    deleteMany: jest.Mock<Promise<unknown>, [unknown]>;
  };
  $transaction: jest.Mock<
    Promise<unknown>,
    [(client: PrismaMock) => Promise<unknown>]
  >;
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

function money(value: string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function createAddress(): AddressEntity {
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
    unitPriceSnapshot: money('159000'),
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
      images: [],
    },
    productVariant: {
      id: variantId,
      sku: `SKU-${variantId.toString()}`,
      variantName: `Variant ${variantId.toString()}`,
      price: money('160000'),
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

function createOrder(overrides: Partial<OrderEntity> = {}): OrderEntity {
  const now = new Date('2026-07-03T00:00:00.000Z');

  return {
    id: 900n,
    orderCode: 'ORD-20260703-DEMO',
    orderStatus: 'Created',
    paymentStatus: 'Pending',
    subtotalAmount: money('570000'),
    discountAmount: money('0'),
    shippingFeeAmount: money('0'),
    totalAmount: money('570000'),
    customerNote: 'Leave at door',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createShopOrder(
  overrides: Partial<ShopOrderEntity> = {},
): ShopOrderEntity {
  const now = new Date('2026-07-03T00:00:00.000Z');

  return {
    id: 600n,
    shopOrderCode: 'SORD-20260703-DEMO',
    orderStatus: 'WaitingForSeller',
    subtotalAmount: money('320000'),
    discountAmount: money('0'),
    shippingFeeAmount: money('0'),
    totalAmount: money('320000'),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createOrderItem(
  overrides: Partial<OrderItemEntity> = {},
): OrderItemEntity {
  return {
    id: 700n,
    shopId: 100n,
    productId: 200n,
    productVariantId: 250n,
    productNameSnapshot: 'Product 200',
    variantNameSnapshot: 'Variant 250',
    skuSnapshot: 'SKU-250',
    unitPrice: money('160000'),
    quantity: 2,
    discountAmount: money('0'),
    lineTotal: money('320000'),
    itemStatus: 'Active',
    createdAt: new Date('2026-07-03T00:00:00.000Z'),
    ...overrides,
  };
}

function createPayment(overrides: Partial<PaymentEntity> = {}): PaymentEntity {
  const now = new Date('2026-07-03T00:00:00.000Z');

  return {
    id: 800n,
    paymentCode: 'PAY-20260703-DEMO',
    providerName: 'COD',
    amount: money('570000'),
    paymentStatus: 'Pending',
    paidAt: null,
    expiredAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('OrdersService create order', () => {
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
        update: jest.fn<Promise<unknown>, [unknown]>(),
      },
      order: {
        create: jest.fn<Promise<OrderEntity>, [unknown]>(),
      },
      orderStatusHistory: {
        create: jest.fn<Promise<unknown>, [unknown]>(),
      },
      shopOrder: {
        create: jest.fn<Promise<ShopOrderEntity>, [unknown]>(),
      },
      orderItem: {
        create: jest.fn<Promise<OrderItemEntity>, [unknown]>(),
      },
      productInventory: {
        updateMany: jest.fn<Promise<{ count: number }>, [unknown]>(),
        findUnique: jest.fn<Promise<InventoryEntity | null>, [unknown]>(),
      },
      inventoryTransaction: {
        create: jest.fn<Promise<unknown>, [unknown]>(),
      },
      payment: {
        create: jest.fn<Promise<PaymentEntity>, [unknown]>(),
      },
      paymentStatusHistory: {
        create: jest.fn<Promise<unknown>, [unknown]>(),
      },
      cartItem: {
        deleteMany: jest.fn<Promise<unknown>, [unknown]>(),
      },
      $transaction: jest.fn<
        Promise<unknown>,
        [(client: PrismaMock) => Promise<unknown>]
      >((callback) => callback(prisma)),
    };
    service = new OrdersService(prisma as unknown as PrismaService);
  });

  it('creates one order, splits shop orders, snapshots items, reserves inventory, creates payment, and clears selected cart items', async () => {
    const firstItem = createCartItem();
    const secondItem = createCartItem({
      id: 501n,
      shopId: 101n,
      productId: 201n,
      productVariantId: 251n,
      quantity: 1,
      unitPriceSnapshot: money('250000'),
      productVariant: {
        id: 251n,
        sku: 'SKU-251',
        variantName: 'Variant 251',
        price: money('250000'),
        variantStatus: 'Active',
        inventoryRecords: [{ id: 301n, quantityAvailable: 3 }],
      },
    });

    prisma.address.findUnique.mockResolvedValue(createAddress());
    prisma.paymentMethod.findUnique.mockResolvedValue(createPaymentMethod());
    prisma.cart.findFirst.mockResolvedValue(
      createCart([firstItem, secondItem]),
    );
    prisma.order.create.mockResolvedValue(createOrder());
    prisma.shopOrder.create
      .mockResolvedValueOnce(createShopOrder())
      .mockResolvedValueOnce(
        createShopOrder({
          id: 601n,
          shopOrderCode: 'SORD-20260703-DEMO-2',
          subtotalAmount: money('250000'),
          totalAmount: money('250000'),
        }),
      );
    prisma.orderItem.create
      .mockResolvedValueOnce(createOrderItem())
      .mockResolvedValueOnce(
        createOrderItem({
          id: 701n,
          shopId: 101n,
          productId: 201n,
          productVariantId: 251n,
          productNameSnapshot: 'Product 201',
          variantNameSnapshot: 'Variant 251',
          skuSnapshot: 'SKU-251',
          unitPrice: money('250000'),
          quantity: 1,
          lineTotal: money('250000'),
        }),
      );
    prisma.productInventory.updateMany.mockResolvedValue({ count: 1 });
    prisma.productInventory.findUnique
      .mockResolvedValueOnce({ id: 300n, quantityAvailable: 6 })
      .mockResolvedValueOnce({ id: 301n, quantityAvailable: 2 });
    prisma.inventoryTransaction.create.mockResolvedValue({ id: 1n });
    prisma.payment.create.mockResolvedValue(createPayment());
    prisma.paymentStatusHistory.create.mockResolvedValue({ id: 1n });
    prisma.orderStatusHistory.create.mockResolvedValue({ id: 1n });
    prisma.cartItem.deleteMany.mockResolvedValue({ count: 2 });
    prisma.cart.update.mockResolvedValue({ id: 400n });

    const result = await service.createOrder(customerUser, {
      addressId: '10',
      paymentMethodId: '20',
      customerNote: ' Leave at door ',
    });
    const orderCreateArgs = prisma.order.create.mock.calls[0][0] as {
      data: {
        userId: bigint;
        shippingAddressId: bigint;
        paymentMethodId: bigint;
        subtotalAmount: Prisma.Decimal;
        totalAmount: Prisma.Decimal;
        receiverName: string;
        customerNote: string;
      };
    };
    const firstShopOrderArgs = prisma.shopOrder.create.mock.calls[0][0] as {
      data: {
        orderId: bigint;
        shopId: bigint;
        orderStatus: string;
        subtotalAmount: Prisma.Decimal;
        totalAmount: Prisma.Decimal;
      };
    };
    const secondShopOrderArgs = prisma.shopOrder.create.mock.calls[1][0] as {
      data: {
        shopId: bigint;
        subtotalAmount: Prisma.Decimal;
        totalAmount: Prisma.Decimal;
      };
    };
    const firstOrderItemArgs = prisma.orderItem.create.mock.calls[0][0] as {
      data: {
        productNameSnapshot: string;
        variantNameSnapshot: string;
        skuSnapshot: string;
        unitPrice: Prisma.Decimal;
        quantity: number;
        lineTotal: Prisma.Decimal;
      };
    };
    const firstInventoryUpdateArgs = prisma.productInventory.updateMany.mock
      .calls[0][0] as {
      where: {
        id: bigint;
        quantityAvailable: { gte: number };
      };
      data: {
        quantityReserved: { increment: number };
        quantityAvailable: { decrement: number };
      };
    };
    const firstInventoryTransactionArgs = prisma.inventoryTransaction.create
      .mock.calls[0][0] as {
      data: {
        productInventoryId: bigint;
        transactionType: string;
        quantityChange: number;
        quantityAfter: number;
        referenceType: string;
        referenceId: bigint;
        createdByUserId: bigint;
      };
    };
    const paymentCreateArgs = prisma.payment.create.mock.calls[0][0] as {
      data: {
        orderId: bigint;
        paymentMethodId: bigint;
        providerName: string;
        amount: Prisma.Decimal;
        paymentStatus: string;
      };
    };
    const deleteManyArgs = prisma.cartItem.deleteMany.mock.calls[0][0] as {
      where: {
        cartId: bigint;
        id: { in: bigint[] };
      };
    };

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(orderCreateArgs.data).toMatchObject({
      userId: customerUser.id,
      shippingAddressId: 10n,
      paymentMethodId: 20n,
      receiverName: 'Customer Demo',
      customerNote: 'Leave at door',
    });
    expect(orderCreateArgs.data.subtotalAmount.toString()).toBe('570000');
    expect(orderCreateArgs.data.totalAmount.toString()).toBe('570000');
    expect(prisma.shopOrder.create).toHaveBeenCalledTimes(2);
    expect(firstShopOrderArgs.data).toMatchObject({
      orderId: 900n,
      shopId: 100n,
      orderStatus: 'WaitingForSeller',
    });
    expect(firstShopOrderArgs.data.subtotalAmount.toString()).toBe('320000');
    expect(secondShopOrderArgs.data.shopId).toBe(101n);
    expect(secondShopOrderArgs.data.totalAmount.toString()).toBe('250000');
    expect(firstOrderItemArgs.data).toMatchObject({
      productNameSnapshot: 'Product 200',
      variantNameSnapshot: 'Variant 250',
      skuSnapshot: 'SKU-250',
      quantity: 2,
    });
    expect(firstOrderItemArgs.data.unitPrice.toString()).toBe('160000');
    expect(firstOrderItemArgs.data.lineTotal.toString()).toBe('320000');
    expect(firstInventoryUpdateArgs).toMatchObject({
      where: {
        id: 300n,
        quantityAvailable: { gte: 2 },
      },
      data: {
        quantityReserved: { increment: 2 },
        quantityAvailable: { decrement: 2 },
      },
    });
    expect(firstInventoryTransactionArgs.data).toMatchObject({
      productInventoryId: 300n,
      transactionType: 'RESERVE_ORDER',
      quantityChange: -2,
      quantityAfter: 6,
      referenceType: 'ORDER_ITEM',
      referenceId: 700n,
      createdByUserId: customerUser.id,
    });
    expect(paymentCreateArgs.data).toMatchObject({
      orderId: 900n,
      paymentMethodId: 20n,
      providerName: 'COD',
      paymentStatus: 'Pending',
    });
    expect(paymentCreateArgs.data.amount.toString()).toBe('570000');
    expect(deleteManyArgs.where).toEqual({
      cartId: 400n,
      id: { in: [500n, 501n] },
    });
    expect(result.shopOrders).toHaveLength(2);
    expect(result.payments[0].providerName).toBe('COD');
    expect(result.totalAmount).toBe('570000');
  });

  it('rejects create order when inventory reserve loses an atomic stock check', async () => {
    prisma.address.findUnique.mockResolvedValue(createAddress());
    prisma.paymentMethod.findUnique.mockResolvedValue(createPaymentMethod());
    prisma.cart.findFirst.mockResolvedValue(createCart([createCartItem()]));
    prisma.order.create.mockResolvedValue(
      createOrder({
        subtotalAmount: money('320000'),
        totalAmount: money('320000'),
      }),
    );
    prisma.shopOrder.create.mockResolvedValue(createShopOrder());
    prisma.orderItem.create.mockResolvedValue(createOrderItem());
    prisma.orderStatusHistory.create.mockResolvedValue({ id: 1n });
    prisma.productInventory.updateMany.mockResolvedValue({ count: 0 });
    prisma.productInventory.findUnique.mockResolvedValue({
      id: 300n,
      quantityAvailable: 1,
    });

    await expect(
      service.createOrder(customerUser, {
        addressId: '10',
        paymentMethodId: '20',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.payment.create).not.toHaveBeenCalled();
    expect(prisma.inventoryTransaction.create).not.toHaveBeenCalled();
    expect(prisma.cartItem.deleteMany).not.toHaveBeenCalled();
  });
});
