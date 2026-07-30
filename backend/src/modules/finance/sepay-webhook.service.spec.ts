import { UnauthorizedException } from '@nestjs/common';
import { BankTransactionMatchStatus } from '@prisma/client';
import { createHmac } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { SepayWebhookDto } from './dto/sepay-webhook.dto';
import { PayoutService } from './payout.service';
import { SepayWebhookService } from './sepay-webhook.service';

const SECRET = '0123456789abcdef0123456789abcdef';
const dto: SepayWebhookDto = {
  id: '9001',
  gateway: 'VCB',
  accountNumber: '0123456789',
  transferType: 'out',
  transferAmount: '100000.00',
  transactionDate: '2026-07-30T10:00:00.000Z',
  code: 'PAY-ABC-123',
  content: 'PAY-ABC-123',
  referenceCode: 'FT123',
};

const raw = Buffer.from(JSON.stringify(dto));

describe('SepayWebhookService', () => {
  const originalEnv = { ...process.env };
  let prisma: {
    bankTransaction: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let payoutService: { markPayoutPaid: jest.Mock };
  let service: SepayWebhookService;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SEPAY_WEBHOOK_ENABLED: 'true',
      SEPAY_WEBHOOK_SECRET: SECRET,
    };
    prisma = {
      bankTransaction: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    payoutService = { markPayoutPaid: jest.fn() };
    service = new SepayWebhookService(
      prisma as never as PrismaService,
      payoutService as never as PayoutService,
    );
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const sign = (body: Buffer, timestamp: string) =>
    `sha256=${createHmac('sha256', SECRET)
      .update(timestamp)
      .update('.')
      .update(body)
      .digest('hex')}`;

  it('accepts a valid raw-body HMAC and current timestamp', () => {
    const timestamp = String(Date.now());
    expect(() =>
      service.verifySignature(raw, sign(raw, timestamp), timestamp),
    ).not.toThrow();
  });

  it('rejects a signature for a different body', () => {
    const timestamp = String(Date.now());
    expect(() =>
      service.verifySignature(
        Buffer.from(`${raw.toString()} `),
        sign(raw, timestamp),
        timestamp,
      ),
    ).toThrow(UnauthorizedException);
  });

  it.each([undefined, '', 'sha256=xyz', `sha256=${'0'.repeat(62)}`])(
    'rejects malformed or missing signatures: %s',
    (signature) => {
      expect(() =>
        service.verifySignature(raw, signature, String(Date.now())),
      ).toThrow(UnauthorizedException);
    },
  );

  it.each([-301_000, 301_000])(
    'rejects timestamps outside the replay window: %d',
    (offset) => {
      const timestamp = String(Date.now() + offset);
      expect(() =>
        service.verifySignature(raw, sign(raw, timestamp), timestamp),
      ).toThrow('Thời gian yêu cầu đối soát không hợp lệ');
    },
  );

  it('rejects requests when the integration is disabled', () => {
    process.env.SEPAY_WEBHOOK_ENABLED = 'false';
    expect(() => service.verifySignature(raw, undefined, undefined)).toThrow(
      'Kênh đối soát ngân hàng chưa được cấu hình',
    );
  });

  it('returns an idempotent result for the same transaction and payload', async () => {
    prisma.bankTransaction.findUnique.mockResolvedValue({
      id: 1n,
      payloadHash:
        '2aa73d9461dc9d5df52530e783d10e7fd4e18bd54bfc8a5946be61bc18108a09',
      matchStatus: BankTransactionMatchStatus.Matched,
    });
    const body = Buffer.from('stable');
    const { createHash } = await import('node:crypto');
    prisma.bankTransaction.findUnique.mockResolvedValue({
      id: 1n,
      payloadHash: createHash('sha256').update(body).digest('hex'),
      matchStatus: BankTransactionMatchStatus.Matched,
    });

    await expect(service.handleWebhook(dto, body)).resolves.toEqual({
      accepted: true,
      duplicate: true,
      matchStatus: BankTransactionMatchStatus.Matched,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('persists an integrity conflict for the same provider ID with another payload', async () => {
    prisma.bankTransaction.findUnique.mockResolvedValue({
      id: 1n,
      payloadHash: 'different',
      matchStatus: BankTransactionMatchStatus.Unmatched,
    });
    prisma.bankTransaction.update.mockResolvedValue({});

    await expect(service.handleWebhook(dto, raw)).rejects.toThrow(
      'Mã giao dịch ngân hàng bị gửi lại với dữ liệu khác',
    );
    expect(prisma.bankTransaction.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: { matchStatus: BankTransactionMatchStatus.IntegrityConflict },
    });
  });

  it('stores an unmatched inbound transaction with masked account data', async () => {
    let createdTransaction: {
      accountNumberMasked: string;
      matchStatus: BankTransactionMatchStatus;
    } | null = null;
    const tx = {
      sellerPayout: { findUnique: jest.fn().mockResolvedValue(null) },
      bankTransaction: {
        create: jest
          .fn<
            unknown,
            [
              {
                data: {
                  accountNumberMasked: string;
                  matchStatus: BankTransactionMatchStatus;
                };
              },
            ]
          >()
          .mockImplementation(({ data }) => {
            createdTransaction = data;
            return { id: 22n };
          }),
      },
    };
    prisma.$transaction.mockImplementation(
      (callback: (client: typeof tx) => unknown) => callback(tx),
    );
    const inbound: SepayWebhookDto = {
      ...dto,
      transferType: 'in',
      code: undefined,
      content: 'customer transfer',
    };

    await expect(
      service.handleWebhook(inbound, Buffer.from(JSON.stringify(inbound))),
    ).resolves.toMatchObject({
      accepted: true,
      matchStatus: BankTransactionMatchStatus.Unmatched,
    });
    expect(createdTransaction).toMatchObject({
      accountNumberMasked: '•••• 6789',
      matchStatus: BankTransactionMatchStatus.Unmatched,
    });
    expect(payoutService.markPayoutPaid).not.toHaveBeenCalled();
  });
});
