import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppRole } from '../auth/app-role.enum';
import { AuthenticatedUser } from '../auth/types';
import { VouchersService } from './vouchers.service';

type VoucherEntity = {
  id: bigint;
  voucherCode: string;
  voucherName: string;
  shopId: bigint | null;
  discountType: string;
  discountValue: Prisma.Decimal;
  maxDiscountAmount: Prisma.Decimal | null;
  minOrderAmount: Prisma.Decimal;
  usageLimit: number | null;
  usedCount: number;
  startAt: Date;
  endAt: Date;
  voucherStatus: string;
  discountTarget: string;
  productScope: string;
  voucherProducts: Array<{ productId: bigint; product: { id: bigint; productName: string; slug: string } }>;
  voucherShopCategories: Array<{ shopCategoryId: bigint; shopCategory: { id: bigint; categoryName: string; slug: string } }>;
  voucherCategories: Array<{
    categoryId: bigint;
    category: { id: bigint; categoryName: string; slug: string };
  }>;
  createdAt: Date;
};

type PrismaMock = {
  voucher: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    updateMany: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
    count: jest.Mock;
  };
  voucherUsage: {
    count: jest.Mock;
    create: jest.Mock;
    findMany: jest.Mock;
    deleteMany: jest.Mock;
  };
  shop: {
    findFirst: jest.Mock;
  };
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

function money(value: string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function createVoucher(overrides: Partial<VoucherEntity> = {}): VoucherEntity {
  const now = new Date('2026-07-15T00:00:00.000Z');
  return {
    id: 1n,
    voucherCode: 'SALE10',
    voucherName: 'Giảm 10%',
    shopId: null,
    discountType: 'Percentage',
    discountValue: money('10'),
    maxDiscountAmount: money('50000'),
    minOrderAmount: money('100000'),
    usageLimit: 100,
    usedCount: 0,
    startAt: new Date('2026-07-01T00:00:00.000Z'),
    endAt: new Date('2026-08-01T00:00:00.000Z'),
    voucherStatus: 'Active',
    discountTarget: 'Product',
    productScope: 'AllProducts',
    voucherProducts: [],
    voucherShopCategories: [],
    voucherCategories: [],
    createdAt: now,
    ...overrides,
  };
}

function createPrismaMock(): PrismaMock {
  return {
    voucher: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    voucherUsage: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    shop: {
      findFirst: jest.fn(),
    },
  };
}

const now = new Date('2026-07-15T12:00:00.000Z');

describe('VouchersService.validateVoucher', () => {
  it('validates a platform voucher against order subtotal and returns computed discount', async () => {
    const prisma = createPrismaMock();
    prisma.voucher.findUnique.mockResolvedValue(createVoucher());
    const service = new VouchersService(prisma as unknown as PrismaService);

    const result = await service.validateVoucher(
      prisma as never,
      customer,
      'sale10',
      {
        orderShopId: null,
        productLines: [{ productId: 1n, categoryId: 1n, shopCategoryIds: [], amount: money('500000') }],
        shippingAmount: money('0'),
      },
      now,
    );

    expect(result.voucher.voucherCode).toBe('SALE10');
    // 10% of 500000 = 50000, capped at maxDiscountAmount 50000
    expect(result.discountAmount).toBe('50000.00');
  });

  it('rejects a shop voucher when orderShopId does not match the voucher shop (mã shop khác không dùng được)', async () => {
    const prisma = createPrismaMock();
    prisma.voucher.findUnique.mockResolvedValue(
      createVoucher({
        shopId: 5n,
        discountType: 'FixedAmount',
        discountValue: money('20000'),
      }),
    );
    const service = new VouchersService(prisma as unknown as PrismaService);

    await expect(
      service.validateVoucher(
        prisma as never,
        customer,
        'SALE10',
        {
          orderShopId: 7n,
          productLines: [{ productId: 1n, categoryId: 1n, shopCategoryIds: [], amount: money('500000') }],
          shippingAmount: money('0'),
        },
        now,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a shop voucher when orderShopId matches the voucher shop', async () => {
    const prisma = createPrismaMock();
    prisma.voucher.findUnique.mockResolvedValue(
      createVoucher({
        shopId: 5n,
        discountType: 'FixedAmount',
        discountValue: money('20000'),
        maxDiscountAmount: null,
      }),
    );
    const service = new VouchersService(prisma as unknown as PrismaService);

    const result = await service.validateVoucher(
      prisma as never,
      customer,
      'SALE10',
      {
        orderShopId: 5n,
        productLines: [{ productId: 1n, categoryId: 1n, shopCategoryIds: [], amount: money('500000') }],
        shippingAmount: money('0'),
      },
      now,
    );

    expect(result.discountAmount).toBe('20000.00');
  });

  it('rejects an unknown voucher code', async () => {
    const prisma = createPrismaMock();
    prisma.voucher.findUnique.mockResolvedValue(null);
    const service = new VouchersService(prisma as unknown as PrismaService);

    await expect(
      service.validateVoucher(
        prisma as never,
        customer,
        'MISSING',
        {
          orderShopId: null,
          productLines: [{ productId: 1n, categoryId: 1n, shopCategoryIds: [], amount: money('100000') }],
          shippingAmount: money('0'),
        },
        now,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a voucher outside its active window', async () => {
    const prisma = createPrismaMock();
    prisma.voucher.findUnique.mockResolvedValue(
      createVoucher({ endAt: new Date('2026-07-10T00:00:00.000Z') }),
    );
    const service = new VouchersService(prisma as unknown as PrismaService);

    await expect(
      service.validateVoucher(
        prisma as never,
        customer,
        'SALE10',
        {
          orderShopId: null,
          productLines: [{ productId: 1n, categoryId: 1n, shopCategoryIds: [], amount: money('500000') }],
          shippingAmount: money('0'),
        },
        now,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a voucher that has reached its usage limit', async () => {
    const prisma = createPrismaMock();
    prisma.voucher.findUnique.mockResolvedValue(
      createVoucher({ usageLimit: 10, usedCount: 10 }),
    );
    const service = new VouchersService(prisma as unknown as PrismaService);

    await expect(
      service.validateVoucher(
        prisma as never,
        customer,
        'SALE10',
        {
          orderShopId: null,
          productLines: [{ productId: 1n, categoryId: 1n, shopCategoryIds: [], amount: money('500000') }],
          shippingAmount: money('0'),
        },
        now,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when order subtotal is below minOrderAmount', async () => {
    const prisma = createPrismaMock();
    prisma.voucher.findUnique.mockResolvedValue(createVoucher());
    const service = new VouchersService(prisma as unknown as PrismaService);

    await expect(
      service.validateVoucher(
        prisma as never,
        customer,
        'SALE10',
        {
          orderShopId: null,
          productLines: [{ productId: 1n, categoryId: 1n, shopCategoryIds: [], amount: money('50000') }],
          shippingAmount: money('0'),
        },
        now,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when the user already used this voucher once', async () => {
    const prisma = createPrismaMock();
    prisma.voucher.findUnique.mockResolvedValue(createVoucher());
    prisma.voucherUsage.count.mockResolvedValue(1);
    const service = new VouchersService(prisma as unknown as PrismaService);

    await expect(
      service.validateVoucher(
        prisma as never,
        customer,
        'SALE10',
        {
          orderShopId: null,
          productLines: [{ productId: 1n, categoryId: 1n, shopCategoryIds: [], amount: money('500000') }],
          shippingAmount: money('0'),
        },
        now,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('VouchersService.applyVoucherInTransaction', () => {
  it('increments usedCount and records usage when the limit is not exceeded', async () => {
    const prisma = createPrismaMock();
    prisma.voucher.findUnique.mockResolvedValue({ usageLimit: 10 });
    prisma.voucher.updateMany.mockResolvedValue({ count: 1 });
    const service = new VouchersService(prisma as unknown as PrismaService);

    await service.applyVoucherInTransaction(
      prisma as never,
      customer,
      1n,
      money('20000'),
      now,
      { orderId: 900n },
    );

    expect(prisma.voucher.updateMany).toHaveBeenCalledWith({
      where: { id: 1n, usedCount: { lt: 10 } },
      data: { usedCount: { increment: 1 } },
    });
    expect(prisma.voucherUsage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        voucherId: 1n,
        userId: customer.id,
        orderId: 900n,
        discountAmount: money('20000'),
      }),
    });
  });

  it('throws and does not record usage when the race-conditional update loses (limit reached concurrently)', async () => {
    const prisma = createPrismaMock();
    prisma.voucher.findUnique.mockResolvedValue({ usageLimit: 10 });
    prisma.voucher.updateMany.mockResolvedValue({ count: 0 });
    const service = new VouchersService(prisma as unknown as PrismaService);

    await expect(
      service.applyVoucherInTransaction(
        prisma as never,
        customer,
        1n,
        money('20000'),
        now,
        { orderId: 900n },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.voucherUsage.create).not.toHaveBeenCalled();
  });

  it('does not restrict usedCount when usageLimit is null (unlimited voucher)', async () => {
    const prisma = createPrismaMock();
    prisma.voucher.findUnique.mockResolvedValue({ usageLimit: null });
    prisma.voucher.updateMany.mockResolvedValue({ count: 1 });
    const service = new VouchersService(prisma as unknown as PrismaService);

    await service.applyVoucherInTransaction(
      prisma as never,
      customer,
      1n,
      money('20000'),
      now,
      { shopOrderId: 501n },
    );

    expect(prisma.voucher.updateMany).toHaveBeenCalledWith({
      where: { id: 1n },
      data: { usedCount: { increment: 1 } },
    });
  });
});

describe('VouchersService.revertVoucherUsagesForOrder', () => {
  it('decrements usedCount for every usage tied to the order and deletes the usage rows', async () => {
    const prisma = createPrismaMock();
    prisma.voucherUsage.findMany.mockResolvedValue([
      { voucherId: 1n },
      { voucherId: 2n },
    ]);
    const service = new VouchersService(prisma as unknown as PrismaService);

    await service.revertVoucherUsagesForOrder(prisma as never, 900n);

    expect(prisma.voucher.updateMany).toHaveBeenCalledWith({
      where: { id: 1n, usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    });
    expect(prisma.voucher.updateMany).toHaveBeenCalledWith({
      where: { id: 2n, usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    });
    expect(prisma.voucherUsage.deleteMany).toHaveBeenCalledWith({
      where: { orderId: 900n },
    });
  });
});

describe('VouchersService shop scoping for CRUD', () => {
  it('rejects creating a shop voucher when the caller has no approved shop', async () => {
    const prisma = createPrismaMock();
    prisma.shop.findFirst.mockResolvedValue(null);
    const service = new VouchersService(prisma as unknown as PrismaService);

    await expect(
      service.createShopVoucher(customer, {
        voucherCode: 'SHOP10',
        voucherName: 'Shop 10%',
        discountType: 'Percentage',
        discountValue: 10,
        startAt: new Date('2026-07-01T00:00:00.000Z'),
        endAt: new Date('2026-08-01T00:00:00.000Z'),
      } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects creating a shop voucher when the shop is not yet approved', async () => {
    const prisma = createPrismaMock();
    prisma.shop.findFirst.mockResolvedValue({
      id: 5n,
      shopStatus: 'PendingApproval',
    });
    const service = new VouchersService(prisma as unknown as PrismaService);

    await expect(
      service.createShopVoucher(customer, {
        voucherCode: 'SHOP10',
        voucherName: 'Shop 10%',
        discountType: 'Percentage',
        discountValue: 10,
        startAt: new Date('2026-07-01T00:00:00.000Z'),
        endAt: new Date('2026-08-01T00:00:00.000Z'),
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('scopes created shop vouchers to the caller shop id', async () => {
    const prisma = createPrismaMock();
    prisma.shop.findFirst.mockResolvedValue({ id: 5n, shopStatus: 'Approved' });
    prisma.voucher.findUnique.mockResolvedValue(null);
    prisma.voucher.create.mockResolvedValue(createVoucher({ shopId: 5n }));
    const service = new VouchersService(prisma as unknown as PrismaService);

    await service.createShopVoucher(customer, {
      voucherCode: 'SHOP10',
      voucherName: 'Shop 10%',
      discountType: 'Percentage',
      discountValue: 10,
      startAt: new Date('2026-07-01T00:00:00.000Z'),
      endAt: new Date('2026-08-01T00:00:00.000Z'),
    } as never);

    expect(prisma.voucher.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ shopId: 5n }),
      }),
    );
  });
});
