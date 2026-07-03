import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppRole } from '../auth/app-role.enum';
import { AuthenticatedUser } from '../auth/types';
import { PaymentsService } from './payments.service';

type PaymentEntity = {
  id: bigint;
  orderId: bigint;
  paymentCode: string;
  providerName: string | null;
  amount: Prisma.Decimal;
  paymentStatus: string;
  paidAt: Date | null;
  expiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
  paymentMethod: {
    id: bigint;
    methodCode: string;
    methodName: string;
    isOnline: boolean;
  };
  order: {
    id: bigint;
    userId: bigint;
  };
};

type PrismaMock = {
  paymentMethod: {
    findMany: jest.Mock<Promise<PaymentMethodEntity[]>, [unknown]>;
  };
  payment: {
    findFirst: jest.Mock<Promise<PaymentEntity | null>, [unknown]>;
    update: jest.Mock<Promise<PaymentEntity>, [unknown]>;
  };
  order: {
    update: jest.Mock<Promise<unknown>, [unknown]>;
  };
  paymentStatusHistory: {
    create: jest.Mock<Promise<unknown>, [unknown]>;
  };
  $transaction: jest.Mock<
    Promise<unknown>,
    [(client: PrismaMock) => Promise<unknown>]
  >;
};

type PaymentMethodEntity = {
  id: bigint;
  methodCode: string;
  methodName: string;
  isOnline: boolean;
  isActive: boolean;
  createdAt: Date;
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

function createPayment(overrides: Partial<PaymentEntity> = {}): PaymentEntity {
  const now = new Date('2026-07-03T00:00:00.000Z');

  return {
    id: 850n,
    orderId: 900n,
    paymentCode: 'PAY-20260703-DEMO',
    providerName: 'FAKE_ONLINE',
    amount: new Prisma.Decimal('195000'),
    paymentStatus: 'Pending',
    paidAt: null,
    expiredAt: null,
    createdAt: now,
    updatedAt: now,
    paymentMethod: {
      id: 21n,
      methodCode: 'FAKE_ONLINE',
      methodName: 'Fake online',
      isOnline: true,
    },
    order: {
      id: 900n,
      userId: customerUser.id,
    },
    ...overrides,
  };
}

describe('PaymentsService', () => {
  let prisma: PrismaMock;
  let service: PaymentsService;

  beforeEach(() => {
    prisma = {
      paymentMethod: {
        findMany: jest.fn<Promise<PaymentMethodEntity[]>, [unknown]>(),
      },
      payment: {
        findFirst: jest.fn<Promise<PaymentEntity | null>, [unknown]>(),
        update: jest.fn<Promise<PaymentEntity>, [unknown]>(),
      },
      order: {
        update: jest.fn<Promise<unknown>, [unknown]>(),
      },
      paymentStatusHistory: {
        create: jest.fn<Promise<unknown>, [unknown]>(),
      },
      $transaction: jest.fn<
        Promise<unknown>,
        [(client: PrismaMock) => Promise<unknown>]
      >((callback) => callback(prisma)),
    };
    service = new PaymentsService(prisma as unknown as PrismaService);
  });

  it('lists only active payment methods for checkout discovery', async () => {
    prisma.paymentMethod.findMany.mockResolvedValue([
      {
        id: 20n,
        methodCode: 'COD',
        methodName: 'Cash on delivery',
        isOnline: false,
        isActive: true,
        createdAt: new Date('2026-07-03T00:00:00.000Z'),
      },
      {
        id: 21n,
        methodCode: 'FAKE_ONLINE',
        methodName: 'Fake online',
        isOnline: true,
        isActive: true,
        createdAt: new Date('2026-07-03T00:00:00.000Z'),
      },
    ]);

    await expect(service.listActiveMethods()).resolves.toEqual([
      {
        id: '20',
        idString: '20',
        methodCode: 'COD',
        methodName: 'Cash on delivery',
        isOnline: false,
      },
      {
        id: '21',
        idString: '21',
        methodCode: 'FAKE_ONLINE',
        methodName: 'Fake online',
        isOnline: true,
      },
    ]);
    expect(prisma.paymentMethod.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: [{ id: 'asc' }],
    });
  });

  it('marks an owned pending fake online payment successful and writes history', async () => {
    const payment = createPayment();
    const paidPayment = createPayment({
      paymentStatus: 'Paid',
      paidAt: new Date('2026-07-03T01:00:00.000Z'),
      updatedAt: new Date('2026-07-03T01:00:00.000Z'),
    });

    prisma.payment.findFirst.mockResolvedValue(payment);
    prisma.payment.update.mockResolvedValue(paidPayment);
    prisma.order.update.mockResolvedValue({ id: 900n });
    prisma.paymentStatusHistory.create.mockResolvedValue({ id: 1n });

    const result = await service.markFakeSuccess(customerUser, '850');
    const updateArgs = prisma.payment.update.mock.calls[0][0] as {
      where: { id: bigint };
      data: {
        paymentStatus: string;
        paidAt: Date;
        updatedAt: Date;
        providerTransactionCode: string;
      };
    };
    const orderUpdateArgs = prisma.order.update.mock.calls[0][0] as {
      where: { id: bigint };
      data: {
        paymentStatus: string;
        updatedAt: Date;
      };
    };
    const historyArgs = prisma.paymentStatusHistory.create.mock.calls[0][0] as {
      data: {
        paymentId: bigint;
        fromStatus: string;
        toStatus: string;
      };
    };

    expect(updateArgs.where.id).toBe(850n);
    expect(updateArgs.data.paymentStatus).toBe('Paid');
    expect(updateArgs.data.paidAt).toBeInstanceOf(Date);
    expect(updateArgs.data.providerTransactionCode).toBe(
      'FAKE-PAY-20260703-DEMO',
    );
    expect(orderUpdateArgs).toMatchObject({
      where: { id: 900n },
      data: { paymentStatus: 'Paid' },
    });
    expect(historyArgs.data).toMatchObject({
      paymentId: 850n,
      fromStatus: 'Pending',
      toStatus: 'Paid',
    });
    expect(result.paymentStatus).toBe('Paid');
    expect(result.paymentMethod.methodCode).toBe('FAKE_ONLINE');
  });

  it('rejects fake success for a payment owned by another customer', async () => {
    prisma.payment.findFirst.mockResolvedValue(
      createPayment({
        order: {
          id: 900n,
          userId: 99n,
        },
      }),
    );

    await expect(
      service.markFakeSuccess(customerUser, '850'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it('rejects COD payments for fake online success', async () => {
    prisma.payment.findFirst.mockResolvedValue(
      createPayment({
        providerName: 'COD',
        paymentMethod: {
          id: 20n,
          methodCode: 'COD',
          methodName: 'Cash on delivery',
          isOnline: false,
        },
      }),
    );

    await expect(
      service.markFakeSuccess(customerUser, '850'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it('rejects fake success for non-pending payments', async () => {
    prisma.payment.findFirst.mockResolvedValue(
      createPayment({ paymentStatus: 'Paid' }),
    );

    await expect(
      service.markFakeSuccess(customerUser, '850'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it('rejects invalid payment id before opening a transaction', async () => {
    await expect(
      service.markFakeSuccess(customerUser, 'not-a-number'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
