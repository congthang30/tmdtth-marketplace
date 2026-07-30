import { BadRequestException } from '@nestjs/common';
import {
  BankTransactionMatchStatus,
  Prisma,
  SellerLedgerEntryType,
  SellerPayoutStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types';
import { SellerDataCryptoService } from '../seller-verification/seller-data-crypto.service';
import { PayoutService } from './payout.service';

const TEST_KEY = Buffer.alloc(32, 6).toString('base64');
const seller = { id: 7n } as AuthenticatedUser;
const admin = { id: 1n } as AuthenticatedUser;

const account = {
  id: 5n,
  shopId: 10n,
  bankCode: 'VCB',
  bankName: 'Vietcombank',
  accountNumberEncrypted: 'encrypted',
  accountNumberHash: 'hash',
  accountNumberLast4: '6789',
  accountHolderName: 'NGUYEN VAN A',
  status: 'Active',
  createdAt: new Date('2026-07-30T00:00:00.000Z'),
  updatedAt: null,
};

const payout = {
  id: 20n,
  shopId: 10n,
  payoutCode: 'PAY-ABC-123',
  amount: new Prisma.Decimal(100_000),
  status: SellerPayoutStatus.PendingApproval,
  bankCodeSnapshot: account.bankCode,
  bankNameSnapshot: account.bankName,
  accountNumberEncryptedSnapshot: account.accountNumberEncrypted,
  accountNumberHashSnapshot: account.accountNumberHash,
  accountNumberLast4Snapshot: account.accountNumberLast4,
  accountHolderNameSnapshot: account.accountHolderName,
  requestedAt: new Date('2026-07-30T00:00:00.000Z'),
  approvedAt: null,
  processingAt: null,
  paidAt: null,
  rejectedAt: null,
  rejectionReason: null,
};

describe('PayoutService', () => {
  const originalEnv = { ...process.env };
  let prisma: Record<string, unknown>;
  let transactionMock: jest.Mock<unknown, [unknown, unknown?]>;
  let service: PayoutService;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SELLER_DATA_ENCRYPTION_KEYS;
    delete process.env.SELLER_DATA_ACTIVE_KEY_ID;
    process.env.SELLER_DATA_ENCRYPTION_KEY = TEST_KEY;
    transactionMock = jest.fn<unknown, [unknown, unknown?]>();
    prisma = {
      shop: { findFirst: jest.fn() },
      sellerPayoutAccount: { findUnique: jest.fn() },
      sellerPayout: {
        aggregate: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      sellerLedgerEntry: { aggregate: jest.fn(), create: jest.fn() },
      financeAuditLog: { create: jest.fn() },
      bankTransaction: { findUnique: jest.fn(), update: jest.fn() },
      $transaction: transactionMock,
    };
    service = new PayoutService(
      prisma as never as PrismaService,
      new SellerDataCryptoService(),
    );
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('encrypts account numbers and returns only the masked last four', async () => {
    const capture: {
      savedAccount?: {
        bankCode: string;
        bankName: string;
        accountNumberEncrypted: string;
        accountNumberHash: string;
      };
    } = {};
    const upsert = jest
      .fn<unknown, [{ create: typeof account }]>()
      .mockImplementation(({ create }) => {
        capture.savedAccount = create;
        return { ...account, ...create };
      });
    const tx = {
      shop: { findFirst: jest.fn().mockResolvedValue({ id: 10n }) },
      sellerPayout: { findFirst: jest.fn().mockResolvedValue(null) },
      sellerPayoutAccount: { upsert },
      financeAuditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    transactionMock.mockImplementation((callback: unknown) =>
      (callback as (client: typeof tx) => unknown)(tx),
    );

    const result = await service.saveSellerAccount(seller, {
      bankCode: 'VCB',
      bankName: 'Tên bị sửa ở client',
      accountNumber: '0123456789',
      accountHolderName: 'NGUYEN VAN A',
    });

    expect(capture.savedAccount).toMatchObject({
      bankCode: 'VCB',
      bankName: 'Vietcombank',
    });
    expect(capture.savedAccount?.accountNumberEncrypted).not.toContain(
      '0123456789',
    );
    expect(capture.savedAccount?.accountNumberHash).not.toContain('0123456789');
    expect(result).toMatchObject({ maskedAccountNumber: '•••• 6789' });
    expect(JSON.stringify(result)).not.toContain('0123456789');
    expect(JSON.stringify(result)).not.toContain('accountNumberEncrypted');
  });

  it('rejects an unsupported payout bank before opening a transaction', async () => {
    await expect(
      service.saveSellerAccount(seller, {
        bankCode: 'FAKE',
        bankName: 'Ngân hàng không tồn tại',
        accountNumber: '0123456789',
        accountHolderName: 'NGUYEN VAN A',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('blocks changing the payout account while a payout is active', async () => {
    const tx = {
      shop: { findFirst: jest.fn().mockResolvedValue({ id: 10n }) },
      sellerPayout: {
        findFirst: jest.fn().mockResolvedValue({ payoutCode: 'PAY-ACTIVE' }),
      },
    };
    transactionMock.mockImplementation((callback: unknown) =>
      (callback as (client: typeof tx) => unknown)(tx),
    );

    await expect(
      service.saveSellerAccount(seller, {
        bankCode: 'VCB',
        bankName: 'Vietcombank',
        accountNumber: '0123456789',
        accountHolderName: 'NGUYEN VAN A',
      }),
    ).rejects.toThrow('Không thể đổi tài khoản ngân hàng');
  });

  it('rejects a payout below the minimum before opening a transaction', async () => {
    await expect(
      service.createSellerPayout(seller, { amount: '99999' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('reserves exact available balance and snapshots the bank account', async () => {
    const capture: {
      createdPayout?: {
        amount: Prisma.Decimal;
        bankCodeSnapshot: string;
        bankNameSnapshot: string;
        accountNumberEncryptedSnapshot: string;
      };
    } = {};
    const createPayout = jest
      .fn<unknown, [{ data: typeof payout }]>()
      .mockImplementation(({ data }) => {
        capture.createdPayout = data;
        return { ...payout, ...data };
      });
    const tx = {
      shop: { findFirst: jest.fn().mockResolvedValue({ id: 10n }) },
      $queryRaw: jest.fn().mockResolvedValue([{ ShopID: 10n }]),
      sellerPayoutAccount: { findUnique: jest.fn().mockResolvedValue(account) },
      sellerLedgerEntry: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: new Prisma.Decimal(150_000) },
        }),
      },
      sellerPayout: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: new Prisma.Decimal(50_000) },
        }),
        create: createPayout,
      },
      financeAuditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    transactionMock.mockImplementation((callback: unknown) =>
      (callback as (client: typeof tx) => unknown)(tx),
    );

    const result = await service.createSellerPayout(seller, {
      amount: '100000.00',
    });
    const options = transactionMock.mock.calls[0][1] as {
      isolationLevel: string;
    };

    expect(options.isolationLevel).toBe(
      Prisma.TransactionIsolationLevel.Serializable,
    );
    expect(capture.createdPayout).toMatchObject({
      bankCodeSnapshot: 'VCB',
      bankNameSnapshot: 'Vietcombank',
    });
    expect(capture.createdPayout?.amount.toFixed(2)).toBe('100000.00');
    expect(capture.createdPayout?.accountNumberEncryptedSnapshot).toBe(
      account.accountNumberEncrypted,
    );
    expect(result.maskedAccountNumber).toBe('•••• 6789');
    expect(JSON.stringify(result)).not.toContain('accountNumberEncrypted');
  });

  it('rejects a payout using a legacy unsupported bank account', async () => {
    const tx = {
      shop: { findFirst: jest.fn().mockResolvedValue({ id: 10n }) },
      $queryRaw: jest.fn().mockResolvedValue([{ ShopID: 10n }]),
      sellerPayoutAccount: {
        findUnique: jest.fn().mockResolvedValue({
          ...account,
          bankCode: 'FAKE',
          bankName: 'Ngân hàng không tồn tại',
        }),
      },
    };
    transactionMock.mockImplementation((callback: unknown) =>
      (callback as (client: typeof tx) => unknown)(tx),
    );

    await expect(
      service.createSellerPayout(seller, { amount: '100000' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a payout above available balance after reservations', async () => {
    const tx = {
      shop: { findFirst: jest.fn().mockResolvedValue({ id: 10n }) },
      $queryRaw: jest.fn().mockResolvedValue([{ ShopID: 10n }]),
      sellerPayoutAccount: { findUnique: jest.fn().mockResolvedValue(account) },
      sellerLedgerEntry: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: new Prisma.Decimal(100_000) },
        }),
      },
      sellerPayout: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: new Prisma.Decimal(1) },
        }),
      },
    };
    transactionMock.mockImplementation((callback: unknown) =>
      (callback as (client: typeof tx) => unknown)(tx),
    );

    await expect(
      service.createSellerPayout(seller, { amount: '100000' }),
    ).rejects.toThrow('Số dư khả dụng không đủ');
  });

  it('allows the seller to cancel only their pending payout', async () => {
    const persisted = { ...payout, status: SellerPayoutStatus.Cancelled };
    let updateWhere: { shopId?: bigint; status?: SellerPayoutStatus } | null =
      null;
    const updateMany = jest
      .fn<
        unknown,
        [{ where: { shopId?: bigint; status?: SellerPayoutStatus } }]
      >()
      .mockImplementation(({ where }) => {
        updateWhere = where;
        return { count: 1 };
      });
    const tx = {
      shop: { findFirst: jest.fn().mockResolvedValue({ id: 10n }) },
      sellerPayout: {
        findFirst: jest.fn().mockResolvedValue(payout),
        updateMany,
        findUniqueOrThrow: jest.fn().mockResolvedValue(persisted),
      },
      financeAuditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    transactionMock.mockImplementation((callback: unknown) =>
      (callback as (client: typeof tx) => unknown)(tx),
    );

    await expect(
      service.cancelSellerPayout(seller, '20'),
    ).resolves.toMatchObject({ status: SellerPayoutStatus.Cancelled });
    expect(updateWhere).toMatchObject({
      shopId: 10n,
      status: SellerPayoutStatus.PendingApproval,
    });
  });

  it('rejects an admin transition when the expected from-state changed', async () => {
    const tx = {
      sellerPayout: {
        findUnique: jest.fn().mockResolvedValue({
          ...payout,
          status: SellerPayoutStatus.Rejected,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    transactionMock.mockImplementation((callback: unknown) =>
      (callback as (client: typeof tx) => unknown)(tx),
    );

    await expect(service.approvePayout(admin, '20')).rejects.toThrow(
      'Trạng thái yêu cầu rút tiền đã thay đổi',
    );
  });

  it('marks a processing payout paid with one negative append-only ledger entry', async () => {
    const capture: {
      createdEntry?: {
        entryType: SellerLedgerEntryType;
        amount: Prisma.Decimal;
        payoutId: bigint;
      };
    } = {};
    const createEntry = jest
      .fn<
        unknown,
        [
          {
            data: {
              entryType: SellerLedgerEntryType;
              amount: Prisma.Decimal;
              payoutId: bigint;
            };
          },
        ]
      >()
      .mockImplementation(({ data }) => {
        capture.createdEntry = data;
        return data;
      });
    const tx = {
      sellerPayout: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      sellerLedgerEntry: { create: createEntry },
    };
    const processing = { ...payout, status: SellerPayoutStatus.Processing };

    await expect(
      service.markPayoutPaid(
        tx as never,
        processing,
        'FT123',
        new Date('2026-07-30T10:00:00.000Z'),
      ),
    ).resolves.toEqual({
      payoutCode: payout.payoutCode,
      status: SellerPayoutStatus.Paid,
    });
    expect(capture.createdEntry?.entryType).toBe(
      SellerLedgerEntryType.PayoutDebit,
    );
    expect(capture.createdEntry?.amount.toFixed(2)).toBe('-100000.00');
    expect(capture.createdEntry?.payoutId).toBe(payout.id);
  });

  it('rejects manually matching an inbound transaction', async () => {
    const tx = {
      bankTransaction: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1n,
          matchStatus: BankTransactionMatchStatus.Unmatched,
          payoutId: null,
          transferType: 'in',
          transferAmount: payout.amount,
        }),
      },
      sellerPayout: {
        findUnique: jest.fn().mockResolvedValue({
          ...payout,
          status: SellerPayoutStatus.Processing,
        }),
      },
    };
    transactionMock.mockImplementation((callback: unknown) =>
      (callback as (client: typeof tx) => unknown)(tx),
    );

    await expect(
      service.manuallyMatchBankTransaction(admin, '1', {
        payoutId: '20',
        reason: 'Đã kiểm tra sao kê ngân hàng',
      }),
    ).rejects.toThrow('Giao dịch phải là khoản tiền chuyển ra');
  });
});
