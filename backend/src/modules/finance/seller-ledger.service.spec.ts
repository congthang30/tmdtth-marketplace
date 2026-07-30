import { Prisma, SellerLedgerEntryType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SELLER_LEDGER_HOLD_MS } from './finance.constants';
import { SellerLedgerService } from './seller-ledger.service';

const money = (value: string | number) => new Prisma.Decimal(value);

type VoucherUsage = {
  discountAmount: Prisma.Decimal;
  voucher: { shopId: bigint | null };
};

type AccrualShopOrder = {
  id: bigint;
  shopId: bigint;
  shopOrderCode: string;
  orderStatus: string;
  subtotalAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  voucherUsages: VoucherUsage[];
  order: {
    shopOrders: Array<{ id: bigint; subtotalAmount: Prisma.Decimal }>;
    voucherUsages: Array<{ discountAmount: Prisma.Decimal }>;
  };
};

const createShopOrder = (
  overrides: Partial<AccrualShopOrder> = {},
): AccrualShopOrder => ({
  id: 11n,
  shopId: 101n,
  shopOrderCode: 'SORD-001',
  orderStatus: 'Completed',
  subtotalAmount: money(100_000),
  discountAmount: money(0),
  voucherUsages: [],
  order: {
    shopOrders: [{ id: 11n, subtotalAmount: money(100_000) }],
    voucherUsages: [],
  },
  ...overrides,
});

describe('SellerLedgerService', () => {
  const completedAt = new Date('2026-07-30T04:00:00.000Z');
  let service: SellerLedgerService;
  let client: {
    shopOrder: {
      findUniqueOrThrow: jest.Mock<Promise<AccrualShopOrder>, [unknown]>;
    };
    sellerLedgerEntry: {
      createMany: jest.Mock<Promise<{ count: number }>, [unknown]>;
    };
  };

  const createdEntries = () => {
    const call = client.sellerLedgerEntry.createMany.mock.calls[0][0] as {
      data: Prisma.SellerLedgerEntryCreateManyInput[];
    };
    return call.data;
  };
  const amount = (value: Prisma.SellerLedgerEntryCreateManyInput['amount']) =>
    value instanceof Prisma.Decimal
      ? value.toFixed(2)
      : new Prisma.Decimal(value as string | number).toFixed(2);

  beforeEach(() => {
    service = new SellerLedgerService({} as PrismaService);
    client = {
      shopOrder: {
        findUniqueOrThrow: jest.fn<Promise<AccrualShopOrder>, [unknown]>(),
      },
      sellerLedgerEntry: {
        createMany: jest
          .fn<Promise<{ count: number }>, [unknown]>()
          .mockResolvedValue({ count: 1 }),
      },
    };
  });

  it('credits sale revenue with a seven-day hold when no voucher applies', async () => {
    client.shopOrder.findUniqueOrThrow.mockResolvedValue(createShopOrder());

    const result = await service.accrueCompletedShopOrder(
      client as never,
      11n,
      completedAt,
    );
    const data = createdEntries();

    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      shopId: 101n,
      shopOrderId: 11n,
      entryType: SellerLedgerEntryType.SaleCredit,
      sourceId: '11',
    });
    expect(amount(data[0].amount)).toBe('100000.00');
    expect(data[0].availableAt).toEqual(
      new Date(completedAt.getTime() + SELLER_LEDGER_HOLD_MS),
    );
    expect(client.sellerLedgerEntry.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
    expect(result.expectedAmount.toFixed(2)).toBe('100000.00');
  });

  it('does not reimburse a shop-funded voucher', async () => {
    client.shopOrder.findUniqueOrThrow.mockResolvedValue(
      createShopOrder({
        discountAmount: money(10_000),
        voucherUsages: [
          { discountAmount: money(10_000), voucher: { shopId: 101n } },
        ],
      }),
    );

    await service.accrueCompletedShopOrder(client as never, 11n, completedAt);
    const data = createdEntries();

    expect(data.map((entry) => entry.entryType)).toEqual([
      SellerLedgerEntryType.SaleCredit,
    ]);
    expect(amount(data[0].amount)).toBe('90000.00');
  });

  it('reimburses the exact platform-funded voucher allocation', async () => {
    client.shopOrder.findUniqueOrThrow.mockResolvedValue(
      createShopOrder({
        discountAmount: money(10_000),
        order: {
          shopOrders: [{ id: 11n, subtotalAmount: money(100_000) }],
          voucherUsages: [{ discountAmount: money(10_000) }],
        },
      }),
    );

    const result = await service.accrueCompletedShopOrder(
      client as never,
      11n,
      completedAt,
    );
    const data = createdEntries();

    expect(data.map((entry) => entry.entryType)).toEqual([
      SellerLedgerEntryType.SaleCredit,
      SellerLedgerEntryType.PlatformVoucherCredit,
    ]);
    expect(data.map((entry) => amount(entry.amount))).toEqual([
      '90000.00',
      '10000.00',
    ]);
    expect(result.expectedAmount.toFixed(2)).toBe('100000.00');
  });

  it('separates shop and platform voucher funding', async () => {
    client.shopOrder.findUniqueOrThrow.mockResolvedValue(
      createShopOrder({
        discountAmount: money(15_000),
        voucherUsages: [
          { discountAmount: money(5_000), voucher: { shopId: 101n } },
        ],
        order: {
          shopOrders: [{ id: 11n, subtotalAmount: money(100_000) }],
          voucherUsages: [{ discountAmount: money(10_000) }],
        },
      }),
    );

    const result = await service.accrueCompletedShopOrder(
      client as never,
      11n,
      completedAt,
    );

    expect(result.expectedAmount.toFixed(2)).toBe('95000.00');
  });

  it('uses the same proportional rounding and last-shop remainder as checkout', async () => {
    client.shopOrder.findUniqueOrThrow.mockResolvedValue(
      createShopOrder({
        id: 12n,
        discountAmount: money('6.67'),
        subtotalAmount: money('66.67'),
        order: {
          shopOrders: [
            { id: 11n, subtotalAmount: money('33.33') },
            { id: 12n, subtotalAmount: money('66.67') },
          ],
          voucherUsages: [{ discountAmount: money(10) }],
        },
      }),
    );

    await service.accrueCompletedShopOrder(client as never, 12n, completedAt);
    const data = createdEntries();

    expect(amount(data[1].amount)).toBe('6.67');
  });

  it('rejects an unclassified discount instead of overpaying the seller', async () => {
    client.shopOrder.findUniqueOrThrow.mockResolvedValue(
      createShopOrder({ discountAmount: money(1) }),
    );

    await expect(
      service.accrueCompletedShopOrder(client as never, 11n, completedAt),
    ).rejects.toThrow('Invalid financial snapshot');
    expect(client.sellerLedgerEntry.createMany).not.toHaveBeenCalled();
  });

  it('rejects accrual before shop-order completion', async () => {
    client.shopOrder.findUniqueOrThrow.mockResolvedValue(
      createShopOrder({ orderStatus: 'Delivered' }),
    );

    await expect(
      service.accrueCompletedShopOrder(client as never, 11n, completedAt),
    ).rejects.toThrow('before completion');
  });
});
