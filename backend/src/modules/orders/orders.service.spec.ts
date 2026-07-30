import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppRole } from '../auth/app-role.enum';
import { AuthenticatedUser } from '../auth/types';
import { OrdersService } from './orders.service';
import { VouchersService } from '../vouchers/vouchers.service';

type SellerShopOrderEntity = {
  id: bigint;
  orderId: bigint;
  shopId: bigint;
  shopOrderCode: string;
  orderStatus: string;
  subtotalAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  shippingFeeAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  sellerNote: string | null;
  confirmedAt: Date | null;
  preparedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
  shippingCompany: {
    id: bigint;
    companyName: string;
    slug: string;
  } | null;
  shippingService: {
    id: bigint;
    serviceCode: string;
    serviceName: string;
  } | null;
  shippingQuote: {
    id: bigint;
    estimatedMinDays: number;
    estimatedMaxDays: number;
  } | null;
  shop: {
    id: bigint;
    shopName: string;
    slug: string;
  };
  order: {
    id: bigint;
    orderCode: string;
    orderStatus: string;
    paymentStatus: string;
    receiverName: string;
    receiverPhone: string;
    shippingProvince: string;
    shippingWard: string;
    shippingStreetAddress: string;
    customerNote: string | null;
    createdAt: Date;
    updatedAt: Date | null;
  };
  items: Array<{
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
  }>;
};

type ShopOrderDelegateMock = {
  findMany: jest.Mock<Promise<SellerShopOrderEntity[]>, [unknown]>;
  count: jest.Mock<Promise<number>, [unknown]>;
  findFirst: jest.Mock<Promise<SellerShopOrderEntity | null>, [unknown]>;
  update: jest.Mock<Promise<SellerShopOrderEntity>, [unknown]>;
};

type OrderDelegateMock = {
  findUnique: jest.Mock<Promise<{ orderStatus: string } | null>, [unknown]>;
  update: jest.Mock<Promise<unknown>, [unknown]>;
};

type OrderStatusHistoryDelegateMock = {
  create: jest.Mock<Promise<unknown>, [unknown]>;
};

type PrismaMock = {
  shopOrder: ShopOrderDelegateMock;
  order: OrderDelegateMock;
  orderStatusHistory: OrderStatusHistoryDelegateMock;
  $transaction: jest.Mock<
    Promise<unknown>,
    [(client: PrismaMock) => Promise<unknown>]
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

function createShopOrderEntity(
  overrides: Partial<SellerShopOrderEntity> = {},
): SellerShopOrderEntity {
  const now = new Date('2026-07-03T00:00:00.000Z');

  return {
    id: 501n,
    orderId: 900n,
    shopId: 1n,
    shopOrderCode: 'SORD-20260703-DEMO',
    orderStatus: 'WaitingForSeller',
    subtotalAmount: new Prisma.Decimal('159000'),
    discountAmount: new Prisma.Decimal('0'),
    shippingFeeAmount: new Prisma.Decimal('0'),
    totalAmount: new Prisma.Decimal('159000'),
    sellerNote: null,
    confirmedAt: null,
    preparedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    shippingCompany: {
      id: 10n,
      companyName: 'Giao Hàng Nhanh',
      slug: 'ghn',
    },
    shippingService: {
      id: 20n,
      serviceCode: 'STD',
      serviceName: 'GHN Chuẩn',
    },
    shippingQuote: {
      id: 30n,
      estimatedMinDays: 2,
      estimatedMaxDays: 5,
    },
    shop: {
      id: 1n,
      shopName: 'Seller Home',
      slug: 'seller-home',
    },
    order: {
      id: 900n,
      orderCode: 'ORD-20260703-DEMO',
      orderStatus: 'Created',
      paymentStatus: 'Pending',
      receiverName: 'Customer Demo',
      receiverPhone: '0900000003',
      shippingProvince: 'TP.HCM',
      shippingWard: 'Phường Bến Nghé',
      shippingStreetAddress: '10 Demo',
      customerNote: 'Giao giờ hành chính',
      createdAt: now,
      updatedAt: now,
    },
    items: [
      {
        id: 700n,
        shopId: 1n,
        productId: 100n,
        productVariantId: 200n,
        productNameSnapshot: 'Đèn bàn gỗ',
        variantNameSnapshot: 'Màu gỗ',
        skuSnapshot: 'DEN-BAN-GO',
        unitPrice: new Prisma.Decimal('159000'),
        quantity: 1,
        discountAmount: new Prisma.Decimal('0'),
        lineTotal: new Prisma.Decimal('159000'),
        itemStatus: 'Active',
        createdAt: now,
      },
    ],
    ...overrides,
  };
}

describe('OrdersService seller shop orders', () => {
  let prisma: PrismaMock;
  let service: OrdersService;

  beforeEach(() => {
    prisma = {
      shopOrder: {
        findMany: jest.fn<Promise<SellerShopOrderEntity[]>, [unknown]>(),
        count: jest.fn<Promise<number>, [unknown]>(),
        findFirst: jest.fn<Promise<SellerShopOrderEntity | null>, [unknown]>(),
        update: jest.fn<Promise<SellerShopOrderEntity>, [unknown]>(),
      },
      order: {
        findUnique: jest.fn<
          Promise<{ orderStatus: string } | null>,
          [unknown]
        >(),
        update: jest.fn<Promise<unknown>, [unknown]>(),
      },
      orderStatusHistory: {
        create: jest.fn<Promise<unknown>, [unknown]>(),
      },
      $transaction: jest.fn<
        Promise<unknown>,
        [(client: PrismaMock) => Promise<unknown>]
      >((callback) => callback(prisma)),
    };
    service = new OrdersService(
      prisma as unknown as PrismaService,
      {} as VouchersService,
    );
  });

  it('lists only shop orders owned by the current seller', async () => {
    prisma.shopOrder.findMany.mockResolvedValue([createShopOrderEntity()]);
    prisma.shopOrder.count.mockResolvedValue(1);

    const result = await service.listSellerShopOrders(sellerUser, {
      page: 2,
      limit: 5,
    });
    const findArgs = prisma.shopOrder.findMany.mock.calls[0][0] as {
      where: { shop: { ownerUserId: bigint; isDeleted: boolean } };
      skip: number;
      take: number;
    };

    expect(findArgs.where).toEqual({
      shop: {
        ownerUserId: sellerUser.id,
        isDeleted: false,
      },
    });
    expect(findArgs.skip).toBe(5);
    expect(findArgs.take).toBe(5);
    expect(result.meta).toEqual({
      page: 2,
      limit: 5,
      total: 1,
      totalPages: 1,
    });
    expect(result.items[0].shopOrderCode).toBe('SORD-20260703-DEMO');
    expect(result.items[0].items[0].productNameSnapshot).toBe('Đèn bàn gỗ');
  });

  it('gets seller shop order detail by ownership', async () => {
    prisma.shopOrder.findFirst.mockResolvedValue(createShopOrderEntity());

    const result = await service.getSellerShopOrderDetail(sellerUser, '501');
    const findArgs = prisma.shopOrder.findFirst.mock.calls[0][0] as {
      where: {
        id: bigint;
        shop: { ownerUserId: bigint; isDeleted: boolean };
      };
    };

    expect(findArgs.where).toEqual({
      id: 501n,
      shop: {
        ownerUserId: sellerUser.id,
        isDeleted: false,
      },
    });
    expect(result.orderCode).toBe('ORD-20260703-DEMO');
    expect(result.receiverName).toBe('Customer Demo');
    expect(result.totalAmount).toBe('159000');
    expect(result.shippingSelection).toEqual({
      shippingQuoteId: '30',
      shippingQuoteIdString: '30',
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
        serviceName: 'GHN Chuẩn',
      },
      estimatedMinDays: 2,
      estimatedMaxDays: 5,
    });
  });

  it('returns not found for another shop order', async () => {
    prisma.shopOrder.findFirst.mockResolvedValue(null);

    await expect(
      service.getSellerShopOrderDetail(sellerUser, '501'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects invalid shop order id', async () => {
    await expect(
      service.getSellerShopOrderDetail(sellerUser, 'abc'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.shopOrder.findFirst).not.toHaveBeenCalled();
  });

  it('confirms a waiting seller shop order and writes status histories', async () => {
    const confirmedAt = new Date('2026-07-03T01:00:00.000Z');

    prisma.shopOrder.findFirst.mockResolvedValue(createShopOrderEntity());
    prisma.shopOrder.update.mockResolvedValue(
      createShopOrderEntity({
        orderStatus: 'Confirmed',
        sellerNote: 'Ready to pack',
        confirmedAt,
        updatedAt: confirmedAt,
      }),
    );
    prisma.shopOrder.count.mockResolvedValue(0);
    prisma.order.findUnique.mockResolvedValue({ orderStatus: 'Created' });
    prisma.order.update.mockResolvedValue({ id: 900n });
    prisma.orderStatusHistory.create.mockResolvedValue({ id: 1n });

    const result = await service.confirmSellerShopOrder(sellerUser, '501', {
      sellerNote: ' Ready to pack ',
    });
    const updateArgs = prisma.shopOrder.update.mock.calls[0][0] as {
      where: { id: bigint };
      data: {
        orderStatus: string;
        sellerNote: string;
        confirmedAt: Date;
        updatedAt: Date;
      };
    };
    const shopHistoryArgs = prisma.orderStatusHistory.create.mock
      .calls[0][0] as {
      data: {
        shopOrderId: bigint;
        fromStatus: string;
        toStatus: string;
        changedByUserId: bigint;
      };
    };
    const orderHistoryArgs = prisma.orderStatusHistory.create.mock
      .calls[1][0] as {
      data: {
        orderId: bigint;
        fromStatus: string;
        toStatus: string;
        changedByUserId: bigint;
      };
    };

    expect(updateArgs.where.id).toBe(501n);
    expect(updateArgs.data.orderStatus).toBe('Confirmed');
    expect(updateArgs.data.sellerNote).toBe('Ready to pack');
    expect(updateArgs.data.confirmedAt).toBeInstanceOf(Date);
    expect(shopHistoryArgs.data).toMatchObject({
      shopOrderId: 501n,
      fromStatus: 'WaitingForSeller',
      toStatus: 'Confirmed',
      changedByUserId: sellerUser.id,
    });
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 900n },
      data: {
        orderStatus: 'Confirmed',
        updatedAt: expect.any(Date) as Date,
      },
    });
    expect(orderHistoryArgs.data).toMatchObject({
      orderId: 900n,
      fromStatus: 'Created',
      toStatus: 'Confirmed',
      changedByUserId: sellerUser.id,
    });
    expect(result.orderStatus).toBe('Confirmed');
    expect(result.sellerNote).toBe('Ready to pack');
    expect(result.confirmedAt).toBe(confirmedAt);
  });

  it('does not update parent order while another shop order is waiting', async () => {
    prisma.shopOrder.findFirst.mockResolvedValue(createShopOrderEntity());
    prisma.shopOrder.update.mockResolvedValue(
      createShopOrderEntity({ orderStatus: 'Confirmed' }),
    );
    prisma.shopOrder.count.mockResolvedValue(1);
    prisma.orderStatusHistory.create.mockResolvedValue({ id: 1n });

    await service.confirmSellerShopOrder(sellerUser, '501', {});

    expect(prisma.order.findUnique).not.toHaveBeenCalled();
    expect(prisma.order.update).not.toHaveBeenCalled();
    expect(prisma.orderStatusHistory.create).toHaveBeenCalledTimes(1);
  });

  it('rejects confirming a shop order outside waiting status', async () => {
    prisma.shopOrder.findFirst.mockResolvedValue(
      createShopOrderEntity({ orderStatus: 'Confirmed' }),
    );

    await expect(
      service.confirmSellerShopOrder(sellerUser, '501', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.shopOrder.update).not.toHaveBeenCalled();
    expect(prisma.orderStatusHistory.create).not.toHaveBeenCalled();
  });

  it('prepares a confirmed seller shop order and writes status histories', async () => {
    const confirmedAt = new Date('2026-07-03T01:00:00.000Z');
    const preparedAt = new Date('2026-07-03T02:00:00.000Z');

    prisma.shopOrder.findFirst.mockResolvedValue(
      createShopOrderEntity({
        orderStatus: 'Confirmed',
        sellerNote: 'Ready to pack',
        confirmedAt,
      }),
    );
    prisma.shopOrder.update.mockResolvedValue(
      createShopOrderEntity({
        orderStatus: 'Prepared',
        sellerNote: 'Packed',
        confirmedAt,
        preparedAt,
        updatedAt: preparedAt,
      }),
    );
    prisma.shopOrder.count.mockResolvedValue(0);
    prisma.order.findUnique.mockResolvedValue({ orderStatus: 'Confirmed' });
    prisma.order.update.mockResolvedValue({ id: 900n });
    prisma.orderStatusHistory.create.mockResolvedValue({ id: 1n });

    const result = await service.prepareSellerShopOrder(sellerUser, '501', {
      sellerNote: ' Packed ',
    });
    const updateArgs = prisma.shopOrder.update.mock.calls[0][0] as {
      data: {
        orderStatus: string;
        sellerNote: string;
        preparedAt: Date;
        updatedAt: Date;
      };
    };
    const shopHistoryArgs = prisma.orderStatusHistory.create.mock
      .calls[0][0] as {
      data: {
        shopOrderId: bigint;
        fromStatus: string;
        toStatus: string;
        changedByUserId: bigint;
      };
    };
    const orderHistoryArgs = prisma.orderStatusHistory.create.mock
      .calls[1][0] as {
      data: {
        orderId: bigint;
        fromStatus: string;
        toStatus: string;
        changedByUserId: bigint;
      };
    };

    expect(updateArgs.data.orderStatus).toBe('Prepared');
    expect(updateArgs.data.sellerNote).toBe('Packed');
    expect(updateArgs.data.preparedAt).toBeInstanceOf(Date);
    expect(shopHistoryArgs.data).toMatchObject({
      shopOrderId: 501n,
      fromStatus: 'Confirmed',
      toStatus: 'Prepared',
      changedByUserId: sellerUser.id,
    });
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 900n },
      data: {
        orderStatus: 'Prepared',
        updatedAt: expect.any(Date) as Date,
      },
    });
    expect(orderHistoryArgs.data).toMatchObject({
      orderId: 900n,
      fromStatus: 'Confirmed',
      toStatus: 'Prepared',
      changedByUserId: sellerUser.id,
    });
    expect(result.orderStatus).toBe('Prepared');
    expect(result.sellerNote).toBe('Packed');
    expect(result.preparedAt).toBe(preparedAt);
  });

  it('does not update parent order while another shop order is unprepared', async () => {
    prisma.shopOrder.findFirst.mockResolvedValue(
      createShopOrderEntity({ orderStatus: 'Confirmed' }),
    );
    prisma.shopOrder.update.mockResolvedValue(
      createShopOrderEntity({ orderStatus: 'Prepared' }),
    );
    prisma.shopOrder.count.mockResolvedValue(1);
    prisma.orderStatusHistory.create.mockResolvedValue({ id: 1n });

    await service.prepareSellerShopOrder(sellerUser, '501', {});

    expect(prisma.order.findUnique).not.toHaveBeenCalled();
    expect(prisma.order.update).not.toHaveBeenCalled();
    expect(prisma.orderStatusHistory.create).toHaveBeenCalledTimes(1);
  });

  it('rejects preparing a shop order outside confirmed status', async () => {
    prisma.shopOrder.findFirst.mockResolvedValue(createShopOrderEntity());

    await expect(
      service.prepareSellerShopOrder(sellerUser, '501', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.shopOrder.update).not.toHaveBeenCalled();
    expect(prisma.orderStatusHistory.create).not.toHaveBeenCalled();
  });
});
