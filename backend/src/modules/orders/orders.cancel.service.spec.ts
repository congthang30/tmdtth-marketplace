import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppRole } from '../auth/app-role.enum';
import { AuthenticatedUser } from '../auth/types';
import { OrdersService } from './orders.service';
import { VouchersService } from '../vouchers/vouchers.service';

type PrismaMock = {
  order: {
    findFirst: jest.Mock;
    updateMany: jest.Mock;
  };
  shopOrder: {
    updateMany: jest.Mock;
  };
  orderStatusHistory: {
    create: jest.Mock;
  };
  productInventory: {
    updateMany: jest.Mock;
    findUnique: jest.Mock;
  };
  inventoryTransaction: {
    create: jest.Mock;
  };
  payment: {
    updateMany: jest.Mock;
  };
  paymentStatusHistory: {
    create: jest.Mock;
  };
  orderCancellation: {
    create: jest.Mock;
  };
  voucherUsage: {
    findMany: jest.Mock;
    deleteMany: jest.Mock;
  };
  voucher: {
    updateMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

const customer: AuthenticatedUser = {
  id: 9n,
  idString: '9',
  email: 'customer@example.com',
  phoneNumber: null,
  userStatus: 'Active',
  roles: [AppRole.Customer],
  profile: null,
};

function createOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 700n,
    orderCode: 'ORD-700',
    userId: customer.id,
    orderStatus: 'Created',
    paymentStatus: 'Pending',
    shopOrders: [
      {
        id: 701n,
        orderStatus: 'WaitingForSeller',
        items: [
          {
            id: 801n,
            productVariantId: 501n,
            quantity: 2,
          },
        ],
      },
      {
        id: 702n,
        orderStatus: 'WaitingForSeller',
        items: [
          {
            id: 802n,
            productVariantId: 502n,
            quantity: 1,
          },
        ],
      },
    ],
    payments: [
      {
        id: 901n,
        paymentStatus: 'Pending',
      },
    ],
    ...overrides,
  };
}

function createPrismaMock(): PrismaMock {
  const prisma: PrismaMock = {
    order: {
      findFirst: jest.fn().mockResolvedValue(createOrder()),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    shopOrder: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    orderStatusHistory: {
      create: jest.fn().mockResolvedValue({}),
    },
    productInventory: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest
        .fn()
        .mockResolvedValueOnce({ id: 601n, quantityAvailable: 8 })
        .mockResolvedValueOnce({ id: 602n, quantityAvailable: 9 }),
    },
    inventoryTransaction: {
      create: jest.fn().mockResolvedValue({}),
    },
    payment: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    paymentStatusHistory: {
      create: jest.fn().mockResolvedValue({}),
    },
    orderCancellation: {
      create: jest.fn().mockResolvedValue({}),
    },
    voucherUsage: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    voucher: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(
    async (callback: (tx: PrismaMock) => Promise<unknown>) => callback(prisma),
  );
  return prisma;
}

function callArgument<T>(
  mock: { mock: { calls: unknown[][] } },
  callIndex = 0,
): T {
  return mock.mock.calls[callIndex]?.[0] as T;
}

describe('OrdersService customer cancellation', () => {
  it('cancels a multi-shop waiting order and releases every reservation', async () => {
    const prisma = createPrismaMock();
    const service = new OrdersService(
      prisma as unknown as PrismaService,
      new VouchersService(prisma as unknown as PrismaService),
    );

    const result = await service.cancelMyOrder(customer, '700', {
      reason: 'Changed my mind',
    });

    expect(result).toMatchObject({
      id: '700',
      idString: '700',
      orderCode: 'ORD-700',
      orderStatus: 'Cancelled',
      paymentStatus: 'Cancelled',
    });
    expect(prisma.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 700n, userId: customer.id },
      }),
    );
    const orderUpdate = callArgument<{
      where: { id: bigint; orderStatus: string; paymentStatus: string };
      data: { orderStatus: string; paymentStatus: string };
    }>(prisma.order.updateMany);
    expect(orderUpdate.where).toMatchObject({
      id: 700n,
      orderStatus: 'Created',
      paymentStatus: 'Pending',
    });
    expect(orderUpdate.data).toMatchObject({
      orderStatus: 'Cancelled',
      paymentStatus: 'Cancelled',
    });
    expect(prisma.shopOrder.updateMany).toHaveBeenCalledTimes(2);
    const inventoryUpdate = callArgument<{
      where: {
        productVariantId: bigint;
        quantityReserved: { gte: number };
      };
      data: {
        quantityReserved: { decrement: number };
        quantityAvailable: { increment: number };
      };
    }>(prisma.productInventory.updateMany);
    expect(inventoryUpdate.where).toEqual({
      productVariantId: 501n,
      quantityReserved: { gte: 2 },
    });
    expect(inventoryUpdate.data).toMatchObject({
      quantityReserved: { decrement: 2 },
      quantityAvailable: { increment: 2 },
    });
    const inventoryTransaction = callArgument<{
      data: {
        transactionType: string;
        quantityChange: number;
        quantityAfter: number;
        referenceId: bigint;
      };
    }>(prisma.inventoryTransaction.create);
    expect(inventoryTransaction.data).toMatchObject({
      transactionType: 'RELEASE_ORDER',
      quantityChange: 2,
      quantityAfter: 8,
      referenceId: 801n,
    });
    expect(prisma.inventoryTransaction.create).toHaveBeenCalledTimes(2);
    const paymentUpdate = callArgument<{
      where: { id: bigint; paymentStatus: string };
      data: { paymentStatus: string };
    }>(prisma.payment.updateMany);
    expect(paymentUpdate.where).toEqual({
      id: 901n,
      paymentStatus: 'Pending',
    });
    expect(paymentUpdate.data).toMatchObject({ paymentStatus: 'Cancelled' });
    expect(prisma.paymentStatusHistory.create).toHaveBeenCalledTimes(1);
    expect(prisma.orderStatusHistory.create).toHaveBeenCalledTimes(3);
    const cancellation = callArgument<{
      data: {
        orderId: bigint;
        requestedByUserId: bigint;
        cancellationReason: string;
        cancellationStatus: string;
      };
    }>(prisma.orderCancellation.create);
    expect(cancellation.data).toMatchObject({
      orderId: 700n,
      requestedByUserId: customer.id,
      cancellationReason: 'Changed my mind',
      cancellationStatus: 'Approved',
    });
  });

  it('does not expose an order owned by another customer', async () => {
    const prisma = createPrismaMock();
    prisma.order.findFirst.mockResolvedValue(null);
    const service = new OrdersService(
      prisma as unknown as PrismaService,
      new VouchersService(prisma as unknown as PrismaService),
    );

    await expect(
      service.cancelMyOrder(customer, '700', { reason: 'Cancel' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it('rejects cancellation after a shop has confirmed', async () => {
    const prisma = createPrismaMock();
    prisma.order.findFirst.mockResolvedValue(
      createOrder({
        shopOrders: [{ id: 701n, orderStatus: 'Confirmed', items: [] }],
      }),
    );
    const service = new OrdersService(
      prisma as unknown as PrismaService,
      new VouchersService(prisma as unknown as PrismaService),
    );

    await expect(
      service.cancelMyOrder(customer, '700', { reason: 'Too late' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
    expect(prisma.productInventory.updateMany).not.toHaveBeenCalled();
  });

  it('rejects cancellation when payment has already been processed', async () => {
    const prisma = createPrismaMock();
    prisma.order.findFirst.mockResolvedValue(
      createOrder({
        payments: [{ id: 901n, paymentStatus: 'Paid' }],
      }),
    );
    const service = new OrdersService(
      prisma as unknown as PrismaService,
      new VouchersService(prisma as unknown as PrismaService),
    );

    await expect(
      service.cancelMyOrder(customer, '700', { reason: 'Refund please' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it('aborts when reserved inventory cannot be released', async () => {
    const prisma = createPrismaMock();
    prisma.productInventory.updateMany.mockResolvedValueOnce({ count: 0 });
    const service = new OrdersService(
      prisma as unknown as PrismaService,
      new VouchersService(prisma as unknown as PrismaService),
    );

    await expect(
      service.cancelMyOrder(customer, '700', { reason: 'Cancel' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.orderCancellation.create).not.toHaveBeenCalled();
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
  });

  it('rejects an invalid order id before opening a transaction', async () => {
    const prisma = createPrismaMock();
    const service = new OrdersService(
      prisma as unknown as PrismaService,
      new VouchersService(prisma as unknown as PrismaService),
    );

    await expect(
      service.cancelMyOrder(customer, 'invalid', { reason: 'Cancel' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
