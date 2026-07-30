import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  BankTransactionMatchStatus,
  Prisma,
  SellerPayoutStatus,
} from '@prisma/client';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  getSepayWebhookSecret,
  isSepayWebhookEnabled,
} from '../../config/finance.config';
import { SepayWebhookDto } from './dto/sepay-webhook.dto';
import { SEPAY_PROVIDER } from './finance.constants';
import { PayoutService } from './payout.service';

const MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000;
const PAYOUT_CODE_PATTERN = /(?:^|\s)(PAY-[A-Z0-9-]+)(?=\s|$)/i;

@Injectable()
export class SepayWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payoutService: PayoutService,
  ) {}

  verifySignature(
    rawBody: Buffer | undefined,
    signatureHeader: string | undefined,
    timestampHeader: string | undefined,
  ): void {
    if (!isSepayWebhookEnabled()) {
      throw new ServiceUnavailableException({
        code: 'SEPAY_WEBHOOK_NOT_CONFIGURED',
        message: 'Kênh đối soát ngân hàng chưa được cấu hình.',
        details: [],
      });
    }
    const secret = getSepayWebhookSecret();
    if (!rawBody || !signatureHeader || !timestampHeader) {
      this.throwInvalidSignature();
    }
    const timestamp = Number(timestampHeader);
    const timestampMs =
      timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
    if (
      !Number.isFinite(timestampMs) ||
      Math.abs(Date.now() - timestampMs) > MAX_TIMESTAMP_DRIFT_MS
    ) {
      throw new UnauthorizedException({
        code: 'SEPAY_WEBHOOK_TIMESTAMP_INVALID',
        message: 'Thời gian yêu cầu đối soát không hợp lệ.',
        details: [],
      });
    }

    const supplied = signatureHeader.replace(/^sha256=/i, '').trim();
    if (!/^[a-f0-9]{64}$/i.test(supplied)) this.throwInvalidSignature();
    const expected = createHmac('sha256', secret)
      .update(timestampHeader)
      .update('.')
      .update(rawBody)
      .digest();
    const actual = Buffer.from(supplied, 'hex');
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      this.throwInvalidSignature();
    }
  }

  async handleWebhook(dto: SepayWebhookDto, rawBody: Buffer) {
    const payloadHash = createHash('sha256').update(rawBody).digest('hex');
    const existing = await this.resolveExistingTransaction(dto.id, payloadHash);
    if (existing) return existing;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const payoutCode = this.extractPayoutCode(dto.code, dto.content);
        const payout = payoutCode
          ? await tx.sellerPayout.findUnique({ where: { payoutCode } })
          : null;
        const amount = new Prisma.Decimal(dto.transferAmount);
        const matchStatus = !payout
          ? BankTransactionMatchStatus.Unmatched
          : dto.transferType !== 'out'
            ? BankTransactionMatchStatus.InvalidDirection
            : !amount.equals(payout.amount)
              ? BankTransactionMatchStatus.AmountMismatch
              : payout.status !== SellerPayoutStatus.Processing
                ? BankTransactionMatchStatus.Unmatched
                : BankTransactionMatchStatus.Matched;
        const now = new Date();
        const bankTransaction = await tx.bankTransaction.create({
          data: {
            provider: SEPAY_PROVIDER,
            providerTransactionId: dto.id,
            ...(matchStatus === BankTransactionMatchStatus.Matched
              ? { payoutId: payout!.id, shopId: payout!.shopId, matchedAt: now }
              : {}),
            gateway: dto.gateway,
            accountNumberMasked: this.maskAccountNumber(dto.accountNumber),
            transferType: dto.transferType,
            transferAmount: amount,
            transactionDate: new Date(dto.transactionDate),
            code: payoutCode ?? dto.code,
            content: dto.content,
            referenceCode: dto.referenceCode,
            matchStatus,
            payloadHash,
            payloadMasked: this.maskPayload(dto),
          },
        });

        if (matchStatus === BankTransactionMatchStatus.Matched && payout) {
          await this.payoutService.markPayoutPaid(
            tx,
            payout,
            dto.referenceCode ?? dto.id,
            now,
          );
          await tx.financeAuditLog.create({
            data: {
              shopId: payout.shopId,
              payoutId: payout.id,
              bankTransactionId: bankTransaction.id,
              actorRole: 'System',
              action: 'BankTransactionAutoMatched',
              fromStatus: payout.status,
              toStatus: SellerPayoutStatus.Paid,
              metadata: { providerTransactionId: dto.id, payoutCode },
            },
          });
        }

        return {
          accepted: true,
          duplicate: false,
          matchStatus,
          payoutCode: payout?.payoutCode ?? null,
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrent = await this.resolveExistingTransaction(
          dto.id,
          payloadHash,
        );
        if (concurrent) return concurrent;
      }
      throw error;
    }
  }

  private async resolveExistingTransaction(
    providerTransactionId: string,
    payloadHash: string,
  ) {
    const existing = await this.prisma.bankTransaction.findUnique({
      where: {
        provider_providerTransactionId: {
          provider: SEPAY_PROVIDER,
          providerTransactionId,
        },
      },
      select: { id: true, payloadHash: true, matchStatus: true },
    });
    if (!existing) return null;
    if (existing.payloadHash !== payloadHash) {
      await this.prisma.bankTransaction.update({
        where: { id: existing.id },
        data: { matchStatus: BankTransactionMatchStatus.IntegrityConflict },
      });
      throw new ConflictException({
        code: 'SEPAY_TRANSACTION_INTEGRITY_CONFLICT',
        message: 'Mã giao dịch ngân hàng bị gửi lại với dữ liệu khác.',
        details: [],
      });
    }
    return {
      accepted: true,
      duplicate: true,
      matchStatus: existing.matchStatus,
    };
  }

  private extractPayoutCode(code?: string, content?: string): string | null {
    for (const value of [code, content]) {
      const match = value?.toUpperCase().match(PAYOUT_CODE_PATTERN);
      if (match) return match[1];
    }
    return null;
  }

  private maskAccountNumber(value: string): string {
    const normalized = value.replace(/\s+/g, '');
    return normalized.length <= 4
      ? `•••• ${normalized}`
      : `•••• ${normalized.slice(-4)}`;
  }

  private maskPayload(dto: SepayWebhookDto): Prisma.InputJsonObject {
    return {
      id: dto.id,
      gateway: dto.gateway,
      accountNumber: this.maskAccountNumber(dto.accountNumber),
      transferType: dto.transferType,
      transferAmount: dto.transferAmount,
      transactionDate: dto.transactionDate,
      code: dto.code ?? null,
      content: dto.content ?? null,
      referenceCode: dto.referenceCode ?? null,
    };
  }

  private throwInvalidSignature(): never {
    throw new UnauthorizedException({
      code: 'SEPAY_WEBHOOK_SIGNATURE_INVALID',
      message: 'Chữ ký yêu cầu đối soát không hợp lệ.',
      details: [],
    });
  }
}
