import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppRole } from '../auth/app-role.enum';
import { AuthenticatedUser } from '../auth/types';
import { OrdersService } from './orders.service';

type CustomerOrderItemEntity = {
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

type CustomerShipmentEntity = {
  id: bigint;
  shipmentCode: string;
  trackingNumber: string | null;
  shipmentStatus: string;
  shippingFee: Prisma.Decimal;
  expectedDeliveryAt: Date | null;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
  shippingCompany: {
    id: bigint;
    companyName: string;
    slug: string;
  };
  shippingService: {
    id: bigint;
    serviceCode: string;
    serviceName: string;
  };
  trackingHistories: Array<{
    id: bigint;
    fromStatus: string | null;
    toStatus: string;
    locationText: string | null;
    note: string | null;
    createdAt: Date;
  }>;
};

type CustomerShopOrderEntity = {
  id: bigint;
  shopOrderCode: string;
  orderStatus: string;
  subtotalAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  shippingFeeAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date | null;
  shop: {
    id: bigint;
    shopName: string;
    slug: string;
  };
  items: CustomerOrderItemEntity[];
  shipments: CustomerShipmentEntity[];
};

type CustomerPaymentEntity = {
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

type CustomerOrderEntity = {
  id: bigint;
  orderCode: string;
  orderStatus: string;
  paymentStatus: string;
  receiverName: string;
  receiverPhone: string;
  shippingProvince: string;
  shippingDistrict: string;
  shippingWard: string;
  shippingStreetAddress: string;
  subtotalAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  shippingFeeAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  customerNote: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  paymentMethod: {
    id: bigint;
    methodCode: string;
    methodName: string;
    isOnline: boolean;
  };
  shopOrders: CustomerShopOrderEntity[];
  payments: CustomerPaymentEntity[];
};

type PrismaMock = {
  order: {
    findMany: jest.Mock<Promise<CustomerOrderEntity[]>, [unknown]>;
    count: jest.Mock<Promise<number>, [unknown]>;
    findFirst: jest.Mock<Promise<CustomerOrderEntity | null>, [unknown]>;
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

function money(value: string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function createCustomerOrder(
  overrides: Partial<CustomerOrderEntity> = {},
): CustomerOrderEntity {
  const now = new Date('2026-07-03T00:00:00.000Z');

  return {
    id: 900n,
    orderCode: 'ORD-20260703-DEMO',
    orderStatus: 'Shipping',
    paymentStatus: 'Paid',
    receiverName: 'Customer Demo',
    receiverPhone: '0900000003',
    shippingProvince: 'TP.HCM',
    shippingDistrict: 'District 1',
    shippingWard: 'Ben Nghe',
    shippingStreetAddress: '10 Demo',
    subtotalAmount: money('160000'),
    discountAmount: money('0'),
    shippingFeeAmount: money('35000'),
    totalAmount: money('195000'),
    customerNote: 'Leave at door',
    createdAt: now,
    updatedAt: now,
    paymentMethod: {
      id: 20n,
      methodCode: 'FAKE_ONLINE',
      methodName: 'Fake online',
      isOnline: true,
    },
    shopOrders: [
      {
        id: 501n,
        shopOrderCode: 'SORD-20260703-DEMO',
        orderStatus: 'Shipping',
        subtotalAmount: money('160000'),
        discountAmount: money('0'),
        shippingFeeAmount: money('35000'),
        totalAmount: money('195000'),
        createdAt: now,
        updatedAt: now,
        shop: {
          id: 1n,
          shopName: 'Seller Home',
          slug: 'seller-home',
        },
        items: [
          {
            id: 700n,
            shopId: 1n,
            productId: 100n,
            productVariantId: 200n,
            productNameSnapshot: 'Wood desk lamp',
            variantNameSnapshot: 'Natural wood',
            skuSnapshot: 'WOOD-LAMP',
            unitPrice: money('160000'),
            quantity: 1,
            discountAmount: money('0'),
            lineTotal: money('160000'),
            itemStatus: 'Active',
            createdAt: now,
          },
        ],
        shipments: [
          {
            id: 800n,
            shipmentCode: 'SHP-20260703-DEMO',
            trackingNumber: 'TRACK-001',
            shipmentStatus: 'InTransit',
            shippingFee: money('35000'),
            expectedDeliveryAt: new Date('2026-07-05T00:00:00.000Z'),
            pickedUpAt: new Date('2026-07-03T03:00:00.000Z'),
            deliveredAt: null,
            createdAt: now,
            updatedAt: now,
            shippingCompany: {
              id: 10n,
              companyName: 'Fast Ship',
              slug: 'fast-ship',
            },
            shippingService: {
              id: 20n,
              serviceCode: 'STD',
              serviceName: 'Standard Delivery',
            },
            trackingHistories: [
              {
                id: 801n,
                fromStatus: 'Pending',
                toStatus: 'InTransit',
                locationText: 'Sorting hub',
                note: 'Package scanned',
                createdAt: now,
              },
            ],
          },
        ],
      },
    ],
    payments: [
      {
        id: 850n,
        paymentCode: 'PAY-20260703-DEMO',
        providerName: 'FAKE_ONLINE',
        amount: money('195000'),
        paymentStatus: 'Paid',
        paidAt: now,
        expiredAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    ...overrides,
  };
}

describe('OrdersService customer order history', () => {
  let prisma: PrismaMock;
  let service: OrdersService;

  beforeEach(() => {
    prisma = {
      order: {
        findMany: jest.fn<Promise<CustomerOrderEntity[]>, [unknown]>(),
        count: jest.fn<Promise<number>, [unknown]>(),
        findFirst: jest.fn<Promise<CustomerOrderEntity | null>, [unknown]>(),
      },
    };
    service = new OrdersService(prisma as unknown as PrismaService);
  });

  it('lists only orders owned by the current customer with shipment tracking summaries', async () => {
    prisma.order.findMany.mockResolvedValue([createCustomerOrder()]);
    prisma.order.count.mockResolvedValue(1);

    const result = await service.listMyOrders(customerUser, {
      page: 2,
      limit: 5,
    });
    const findArgs = prisma.order.findMany.mock.calls[0][0] as {
      where: { userId: bigint };
      skip: number;
      take: number;
    };

    expect(findArgs.where).toEqual({ userId: customerUser.id });
    expect(findArgs.skip).toBe(5);
    expect(findArgs.take).toBe(5);
    expect(result.meta).toEqual({
      page: 2,
      limit: 5,
      total: 1,
      totalPages: 1,
    });
    expect(result.items[0].receiverName).toBe('Customer Demo');
    expect(result.items[0].shopOrders[0].shipments?.[0]).toMatchObject({
      id: '800',
      shipmentStatus: 'InTransit',
      trackingNumber: 'TRACK-001',
    });
    expect(
      result.items[0].shopOrders[0].shipments?.[0].trackingHistories[0],
    ).toMatchObject({
      fromStatus: 'Pending',
      toStatus: 'InTransit',
      locationText: 'Sorting hub',
    });
  });

  it('gets current customer order detail by order id and user id', async () => {
    prisma.order.findFirst.mockResolvedValue(createCustomerOrder());

    const result = await service.getMyOrderDetail(customerUser, '900');
    const findArgs = prisma.order.findFirst.mock.calls[0][0] as {
      where: {
        id: bigint;
        userId: bigint;
      };
    };

    expect(findArgs.where).toEqual({
      id: 900n,
      userId: customerUser.id,
    });
    expect(result.orderCode).toBe('ORD-20260703-DEMO');
    expect(result.paymentMethod.methodCode).toBe('FAKE_ONLINE');
    expect(result.payments[0].paymentStatus).toBe('Paid');
    expect(result.shopOrders[0].items[0].productNameSnapshot).toBe(
      'Wood desk lamp',
    );
  });

  it('returns not found when detail order does not belong to current customer', async () => {
    prisma.order.findFirst.mockResolvedValue(null);

    await expect(
      service.getMyOrderDetail(customerUser, '900'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects invalid customer order id before querying', async () => {
    await expect(
      service.getMyOrderDetail(customerUser, 'not-a-number'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.order.findFirst).not.toHaveBeenCalled();
  });
});
