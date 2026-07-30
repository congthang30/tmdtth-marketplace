import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BankTransactionMatchStatus,
  Prisma,
  SellerLedgerEntryType,
  SellerLedgerSourceType,
  SellerPayoutStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import {
  createPaginatedResult,
  getPaginationParams,
} from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types';
import { SellerDataCryptoService } from '../seller-verification/seller-data-crypto.service';
import {
  AdminBankTransactionQueryDto,
  AdminPayoutQueryDto,
  CreatePayoutDto,
  FailPayoutDto,
  ManualMatchDto,
  ProcessPayoutDto,
  RejectPayoutDto,
  SavePayoutAccountDto,
  SellerPayoutQueryDto,
} from './dto/payout.dto';
import {
  MINIMUM_PAYOUT_AMOUNT,
  PAYOUT_CODE_PREFIX,
  PAYOUT_RESERVED_STATUSES,
  SUPPORTED_PAYOUT_BANKS,
} from './finance.constants';

const ZERO = new Prisma.Decimal(0);
const ACTIVE_MANIFEST_STATUSES = [
  SellerPayoutStatus.PendingApproval,
  SellerPayoutStatus.Approved,
  SellerPayoutStatus.Processing,
];

type FinanceClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PayoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: SellerDataCryptoService,
  ) {}

  async getSellerAccount(user: AuthenticatedUser) {
    const shop = await this.requireOwnedShop(this.prisma, user.id);
    const account = await this.prisma.sellerPayoutAccount.findUnique({
      where: { shopId: shop.id },
    });
    return account ? this.toAccountResponse(account) : null;
  }

  async saveSellerAccount(user: AuthenticatedUser, dto: SavePayoutAccountDto) {
    const bank = SUPPORTED_PAYOUT_BANKS.find(
      ({ code }) => code === dto.bankCode,
    );
    if (!bank) {
      throw new BadRequestException({
        code: 'PAYOUT_BANK_UNSUPPORTED',
        message: 'Ngân hàng đã chọn không được hỗ trợ. Vui lòng chọn lại.',
        details: [{ field: 'bankCode' }],
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const shop = await this.requireOwnedShop(tx, user.id);
      const activePayout = await tx.sellerPayout.findFirst({
        where: { shopId: shop.id, status: { in: ACTIVE_MANIFEST_STATUSES } },
        select: { payoutCode: true },
      });
      if (activePayout) {
        throw new ConflictException({
          code: 'PAYOUT_ACCOUNT_LOCKED',
          message:
            'Không thể đổi tài khoản ngân hàng khi đang có yêu cầu rút tiền được xử lý.',
          details: [{ payoutCode: activePayout.payoutCode }],
        });
      }

      const now = new Date();
      const account = await tx.sellerPayoutAccount.upsert({
        where: { shopId: shop.id },
        create: {
          shopId: shop.id,
          bankCode: bank.code,
          bankName: bank.name,
          accountNumberEncrypted: this.crypto.encrypt(dto.accountNumber),
          accountNumberHash: this.crypto.hash(dto.accountNumber),
          accountNumberLast4: this.crypto.last4(dto.accountNumber),
          accountHolderName: dto.accountHolderName,
        },
        update: {
          bankCode: bank.code,
          bankName: bank.name,
          accountNumberEncrypted: this.crypto.encrypt(dto.accountNumber),
          accountNumberHash: this.crypto.hash(dto.accountNumber),
          accountNumberLast4: this.crypto.last4(dto.accountNumber),
          accountHolderName: dto.accountHolderName,
          status: 'Active',
          updatedAt: now,
        },
      });
      await tx.financeAuditLog.create({
        data: {
          shopId: shop.id,
          actorUserId: user.id,
          actorRole: 'Seller',
          action: 'PayoutAccountSaved',
          metadata: {
            bankCode: account.bankCode,
            accountNumberLast4: account.accountNumberLast4,
          },
        },
      });
      return this.toAccountResponse(account);
    });
  }

  async createSellerPayout(user: AuthenticatedUser, dto: CreatePayoutDto) {
    const amount = new Prisma.Decimal(dto.amount);
    if (amount.lt(MINIMUM_PAYOUT_AMOUNT)) {
      throw new BadRequestException({
        code: 'PAYOUT_BELOW_MINIMUM',
        message: `Số tiền rút tối thiểu là ${MINIMUM_PAYOUT_AMOUNT.toLocaleString('vi-VN')} ₫.`,
        details: [{ field: 'amount' }],
      });
    }

    return this.withSerializableRetry(async () =>
      this.prisma.$transaction(
        async (tx) => {
          const shop = await this.requireOwnedShop(tx, user.id);
          await tx.$queryRaw`SELECT "ShopID" FROM "Shops" WHERE "ShopID" = ${shop.id} FOR UPDATE`;
          const account = await tx.sellerPayoutAccount.findUnique({
            where: { shopId: shop.id },
          });
          if (!account || account.status !== 'Active') {
            throw new BadRequestException({
              code: 'PAYOUT_ACCOUNT_REQUIRED',
              message:
                'Vui lòng thiết lập tài khoản ngân hàng trước khi rút tiền.',
              details: [],
            });
          }

          const bank = SUPPORTED_PAYOUT_BANKS.find(
            ({ code }) => code === account.bankCode,
          );
          if (!bank) {
            throw new BadRequestException({
              code: 'PAYOUT_BANK_UNSUPPORTED',
              message:
                'Ngân hàng nhận tiền không còn được hỗ trợ. Vui lòng cập nhật tài khoản trước khi rút tiền.',
              details: [{ field: 'bankCode' }],
            });
          }

          const available = await this.getAvailableBalance(tx, shop.id);
          if (amount.gt(available)) {
            throw new BadRequestException({
              code: 'PAYOUT_INSUFFICIENT_BALANCE',
              message: 'Số dư khả dụng không đủ cho yêu cầu rút tiền này.',
              details: [{ availableAmount: available.toFixed(2) }],
            });
          }

          const payoutCode = `${PAYOUT_CODE_PREFIX}-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`;
          const payout = await tx.sellerPayout.create({
            data: {
              shopId: shop.id,
              payoutCode,
              amount,
              bankCodeSnapshot: bank.code,
              bankNameSnapshot: bank.name,
              accountNumberEncryptedSnapshot: account.accountNumberEncrypted,
              accountNumberHashSnapshot: account.accountNumberHash,
              accountNumberLast4Snapshot: account.accountNumberLast4,
              accountHolderNameSnapshot: account.accountHolderName,
              requestedByUserId: user.id,
            },
          });
          await tx.financeAuditLog.create({
            data: {
              shopId: shop.id,
              payoutId: payout.id,
              actorUserId: user.id,
              actorRole: 'Seller',
              action: 'PayoutRequested',
              toStatus: payout.status,
              metadata: { amount: amount.toFixed(2), payoutCode },
            },
          });
          return this.toPayoutResponse(payout);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }

  async listSellerPayouts(
    user: AuthenticatedUser,
    query: SellerPayoutQueryDto,
  ) {
    const shop = await this.requireOwnedShop(this.prisma, user.id);
    return this.listPayouts(query, shop.id);
  }

  async listAdminPayouts(query: AdminPayoutQueryDto) {
    return this.listPayouts(
      query,
      query.shopId ? BigInt(query.shopId) : undefined,
    );
  }

  async approvePayout(user: AuthenticatedUser, payoutId: string) {
    return this.transitionPayout(
      user,
      BigInt(payoutId),
      SellerPayoutStatus.PendingApproval,
      SellerPayoutStatus.Approved,
      { approvedByUserId: user.id, approvedAt: new Date() },
      'PayoutApproved',
    );
  }

  async rejectPayout(
    user: AuthenticatedUser,
    payoutId: string,
    dto: RejectPayoutDto,
  ) {
    return this.transitionPayout(
      user,
      BigInt(payoutId),
      SellerPayoutStatus.PendingApproval,
      SellerPayoutStatus.Rejected,
      {
        rejectedByUserId: user.id,
        rejectedAt: new Date(),
        rejectionReason: dto.reason,
      },
      'PayoutRejected',
      dto.reason,
    );
  }

  async cancelSellerPayout(user: AuthenticatedUser, payoutId: string) {
    return this.prisma.$transaction(async (tx) => {
      const shop = await this.requireOwnedShop(tx, user.id);
      const payout = await tx.sellerPayout.findFirst({
        where: { id: BigInt(payoutId), shopId: shop.id },
      });
      if (!payout) this.throwNotFound('PAYOUT_NOT_FOUND');
      const now = new Date();
      const result = await tx.sellerPayout.updateMany({
        where: {
          id: payout.id,
          shopId: shop.id,
          status: SellerPayoutStatus.PendingApproval,
        },
        data: {
          status: SellerPayoutStatus.Cancelled,
          cancelledAt: now,
          updatedAt: now,
        },
      });
      if (result.count !== 1) this.throwTransitionConflict();
      await tx.financeAuditLog.create({
        data: {
          shopId: shop.id,
          payoutId: payout.id,
          actorUserId: user.id,
          actorRole: 'Seller',
          action: 'PayoutCancelled',
          fromStatus: payout.status,
          toStatus: SellerPayoutStatus.Cancelled,
        },
      });
      return this.toPayoutResponse(
        await tx.sellerPayout.findUniqueOrThrow({ where: { id: payout.id } }),
      );
    });
  }

  async failPayout(
    user: AuthenticatedUser,
    payoutId: string,
    dto: FailPayoutDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const payout = await tx.sellerPayout.findUnique({
        where: { id: BigInt(payoutId) },
      });
      if (!payout) this.throwNotFound('PAYOUT_NOT_FOUND');
      if (
        payout.status !== SellerPayoutStatus.Approved &&
        payout.status !== SellerPayoutStatus.Processing
      ) {
        this.throwTransitionConflict();
      }
      const now = new Date();
      const result = await tx.sellerPayout.updateMany({
        where: {
          id: payout.id,
          status: {
            in: [SellerPayoutStatus.Approved, SellerPayoutStatus.Processing],
          },
        },
        data: {
          status: SellerPayoutStatus.Failed,
          failedAt: now,
          failureReason: dto.reason,
          updatedAt: now,
        },
      });
      if (result.count !== 1) this.throwTransitionConflict();
      await tx.financeAuditLog.create({
        data: {
          shopId: payout.shopId,
          payoutId: payout.id,
          actorUserId: user.id,
          actorRole: 'Admin',
          action: 'PayoutFailed',
          fromStatus: payout.status,
          toStatus: SellerPayoutStatus.Failed,
          reason: dto.reason,
        },
      });
      return this.toPayoutResponse(
        await tx.sellerPayout.findUniqueOrThrow({ where: { id: payout.id } }),
      );
    });
  }

  async listBankTransactions(query: AdminBankTransactionQueryDto) {
    const { page, limit, skip, take } = getPaginationParams(query);
    const q = query.q?.trim();
    const where: Prisma.BankTransactionWhereInput = {
      ...(query.matchStatus ? { matchStatus: query.matchStatus } : {}),
      ...(query.transferType ? { transferType: query.transferType } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: 'insensitive' } },
              { content: { contains: q, mode: 'insensitive' } },
              { referenceCode: { contains: q, mode: 'insensitive' } },
              { providerTransactionId: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.bankTransaction.findMany({
        where,
        skip,
        take,
        orderBy: [{ transactionDate: 'desc' }, { id: 'desc' }],
        include: {
          payout: { select: { id: true, payoutCode: true, status: true } },
          shop: { select: { id: true, shopName: true, code: true } },
        },
      }),
      this.prisma.bankTransaction.count({ where }),
    ]);
    return createPaginatedResult({
      items: items.map((item) => this.toBankTransactionResponse(item)),
      page,
      limit,
      total,
    });
  }

  async getBankTransaction(bankTransactionId: string) {
    const transaction = await this.prisma.bankTransaction.findUnique({
      where: { id: BigInt(bankTransactionId) },
      include: {
        payout: { select: { id: true, payoutCode: true, status: true } },
        shop: { select: { id: true, shopName: true, code: true } },
      },
    });
    if (!transaction) this.throwNotFound('BANK_TRANSACTION_NOT_FOUND');
    return this.toBankTransactionResponse(transaction);
  }

  async processPayout(
    user: AuthenticatedUser,
    payoutId: string,
    dto: ProcessPayoutDto,
  ) {
    const payout = await this.transitionPayout(
      user,
      BigInt(payoutId),
      SellerPayoutStatus.Approved,
      SellerPayoutStatus.Processing,
      {
        processedByUserId: user.id,
        processingAt: new Date(),
        bankReference: dto.bankReference,
        note: dto.note,
      },
      'PayoutProcessingStarted',
    );
    const persisted = await this.prisma.sellerPayout.findUniqueOrThrow({
      where: { id: BigInt(payoutId) },
      select: { accountNumberEncryptedSnapshot: true },
    });
    return {
      ...payout,
      transferInstruction: {
        content: payout.payoutCode,
        amount: payout.amount,
        bankCode: payout.bankCode,
        bankName: payout.bankName,
        accountNumber: this.crypto.decrypt(
          persisted.accountNumberEncryptedSnapshot,
        ),
        accountHolderName: payout.accountHolderName,
      },
    };
  }

  async manuallyMatchBankTransaction(
    user: AuthenticatedUser,
    bankTransactionId: string,
    dto: ManualMatchDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.bankTransaction.findUnique({
        where: { id: BigInt(bankTransactionId) },
      });
      if (!transaction) this.throwNotFound('BANK_TRANSACTION_NOT_FOUND');
      if (
        (transaction.matchStatus !== BankTransactionMatchStatus.Unmatched &&
          transaction.matchStatus !==
            BankTransactionMatchStatus.AmountMismatch) ||
        transaction.payoutId
      ) {
        throw new ConflictException({
          code: 'BANK_TRANSACTION_ALREADY_MATCHED',
          message: 'Giao dịch ngân hàng đã được đối soát.',
          details: [],
        });
      }
      const payout = await tx.sellerPayout.findUnique({
        where: { id: BigInt(dto.payoutId) },
      });
      if (!payout) this.throwNotFound('PAYOUT_NOT_FOUND');
      this.assertBankMatch(transaction, payout);
      const now = new Date();
      const result = await this.markPayoutPaid(
        tx,
        payout,
        transaction.referenceCode,
        now,
      );
      await tx.bankTransaction.update({
        where: { id: transaction.id },
        data: {
          payoutId: payout.id,
          shopId: payout.shopId,
          matchStatus: BankTransactionMatchStatus.Matched,
          matchedAt: now,
        },
      });
      await tx.financeAuditLog.create({
        data: {
          shopId: payout.shopId,
          payoutId: payout.id,
          bankTransactionId: transaction.id,
          actorUserId: user.id,
          actorRole: 'Admin',
          action: 'BankTransactionManuallyMatched',
          fromStatus: payout.status,
          toStatus: SellerPayoutStatus.Paid,
          reason: dto.reason,
        },
      });
      return result;
    });
  }

  async markPayoutPaid(
    tx: Prisma.TransactionClient,
    payout: {
      id: bigint;
      shopId: bigint;
      payoutCode: string;
      amount: Prisma.Decimal;
      status: SellerPayoutStatus;
    },
    bankReference: string | null,
    paidAt: Date,
  ) {
    if (payout.status !== SellerPayoutStatus.Processing) {
      throw new ConflictException({
        code: 'PAYOUT_NOT_PROCESSING',
        message: 'Yêu cầu rút tiền chưa ở trạng thái chờ đối soát.',
        details: [{ status: payout.status }],
      });
    }
    const updated = await tx.sellerPayout.updateMany({
      where: { id: payout.id, status: SellerPayoutStatus.Processing },
      data: {
        status: SellerPayoutStatus.Paid,
        paidAt,
        updatedAt: paidAt,
        ...(bankReference ? { bankReference } : {}),
      },
    });
    if (updated.count !== 1) this.throwTransitionConflict();
    await tx.sellerLedgerEntry.create({
      data: {
        shopId: payout.shopId,
        payoutId: payout.id,
        entryType: SellerLedgerEntryType.PayoutDebit,
        sourceType: SellerLedgerSourceType.Payout,
        sourceId: payout.id.toString(),
        amount: payout.amount.neg(),
        description: `Đã chi trả ${payout.payoutCode}`,
        metadata: { payoutCode: payout.payoutCode, bankReference },
        availableAt: paidAt,
        createdAt: paidAt,
      },
    });
    return { payoutCode: payout.payoutCode, status: SellerPayoutStatus.Paid };
  }

  private async transitionPayout(
    user: AuthenticatedUser,
    payoutId: bigint,
    fromStatus: SellerPayoutStatus,
    toStatus: SellerPayoutStatus,
    data: Prisma.SellerPayoutUncheckedUpdateManyInput,
    action: string,
    reason?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const payout = await tx.sellerPayout.findUnique({
        where: { id: payoutId },
      });
      if (!payout) this.throwNotFound('PAYOUT_NOT_FOUND');
      const now = new Date();
      const result = await tx.sellerPayout.updateMany({
        where: { id: payoutId, status: fromStatus },
        data: { ...data, status: toStatus, updatedAt: now },
      });
      if (result.count !== 1) this.throwTransitionConflict();
      await tx.financeAuditLog.create({
        data: {
          shopId: payout.shopId,
          payoutId,
          actorUserId: user.id,
          actorRole: 'Admin',
          action,
          fromStatus,
          toStatus,
          reason,
        },
      });
      const persisted = await tx.sellerPayout.findUniqueOrThrow({
        where: { id: payoutId },
      });
      return this.toPayoutResponse(persisted);
    });
  }

  private async listPayouts(query: SellerPayoutQueryDto, shopId?: bigint) {
    const { page, limit, skip, take } = getPaginationParams(query);
    const q = query.q?.trim();
    const where: Prisma.SellerPayoutWhereInput = {
      ...(shopId ? { shopId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(q
        ? {
            OR: [
              { payoutCode: { contains: q, mode: 'insensitive' } },
              { shop: { shopName: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.sellerPayout.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { shop: { select: { id: true, shopName: true, code: true } } },
      }),
      this.prisma.sellerPayout.count({ where }),
    ]);
    return createPaginatedResult({
      items: items.map((item) => this.toPayoutResponse(item)),
      page,
      limit,
      total,
    });
  }

  private async getAvailableBalance(client: FinanceClient, shopId: bigint) {
    const now = new Date();
    const [ledger, reserved] = await Promise.all([
      client.sellerLedgerEntry.aggregate({
        where: { shopId, availableAt: { lte: now } },
        _sum: { amount: true },
      }),
      client.sellerPayout.aggregate({
        where: { shopId, status: { in: PAYOUT_RESERVED_STATUSES } },
        _sum: { amount: true },
      }),
    ]);
    return (ledger._sum.amount ?? ZERO).sub(reserved._sum.amount ?? ZERO);
  }

  private async requireOwnedShop(client: FinanceClient, ownerUserId: bigint) {
    const shop = await client.shop.findFirst({
      where: { ownerUserId, shopStatus: 'Approved', isDeleted: false },
      select: { id: true, shopName: true, code: true, shopStatus: true },
    });
    if (!shop) this.throwNotFound('SELLER_SHOP_NOT_FOUND');
    return shop;
  }

  private assertBankMatch(
    transaction: { transferType: string; transferAmount: Prisma.Decimal },
    payout: { amount: Prisma.Decimal; status: SellerPayoutStatus },
  ) {
    if (transaction.transferType !== 'out') {
      throw new BadRequestException({
        code: 'BANK_TRANSACTION_INVALID_DIRECTION',
        message: 'Giao dịch phải là khoản tiền chuyển ra.',
        details: [],
      });
    }
    if (!transaction.transferAmount.equals(payout.amount)) {
      throw new BadRequestException({
        code: 'BANK_TRANSACTION_AMOUNT_MISMATCH',
        message: 'Số tiền giao dịch không khớp yêu cầu rút tiền.',
        details: [],
      });
    }
    if (payout.status !== SellerPayoutStatus.Processing) {
      throw new ConflictException({
        code: 'PAYOUT_NOT_PROCESSING',
        message: 'Yêu cầu rút tiền chưa ở trạng thái chờ đối soát.',
        details: [{ status: payout.status }],
      });
    }
  }

  private toAccountResponse(account: {
    bankCode: string;
    bankName: string;
    accountNumberLast4: string;
    accountHolderName: string;
    status: string;
    updatedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      bankCode: account.bankCode,
      bankName: account.bankName,
      maskedAccountNumber: this.crypto.mask(account.accountNumberLast4),
      accountHolderName: account.accountHolderName,
      status: account.status,
      updatedAt: account.updatedAt ?? account.createdAt,
    };
  }

  private toPayoutResponse(payout: {
    id: bigint;
    payoutCode: string;
    amount: Prisma.Decimal;
    status: SellerPayoutStatus;
    bankCodeSnapshot: string;
    bankNameSnapshot: string;
    accountNumberLast4Snapshot: string;
    accountHolderNameSnapshot: string;
    requestedAt: Date;
    approvedAt?: Date | null;
    processingAt?: Date | null;
    paidAt?: Date | null;
    rejectedAt?: Date | null;
    rejectionReason?: string | null;
    shop?: { id: bigint; shopName: string; code: string } | null;
  }) {
    return {
      id: payout.id.toString(),
      payoutCode: payout.payoutCode,
      amount: payout.amount.toFixed(2),
      status: payout.status,
      bankCode: payout.bankCodeSnapshot,
      bankName: payout.bankNameSnapshot,
      maskedAccountNumber: this.crypto.mask(payout.accountNumberLast4Snapshot),
      accountHolderName: payout.accountHolderNameSnapshot,
      requestedAt: payout.requestedAt,
      approvedAt: payout.approvedAt ?? null,
      processingAt: payout.processingAt ?? null,
      paidAt: payout.paidAt ?? null,
      rejectedAt: payout.rejectedAt ?? null,
      rejectionReason: payout.rejectionReason ?? null,
      ...(payout.shop
        ? {
            shop: {
              id: payout.shop.id.toString(),
              shopName: payout.shop.shopName,
              code: payout.shop.code,
            },
          }
        : {}),
    };
  }

  private toBankTransactionResponse(transaction: {
    id: bigint;
    provider: string;
    providerTransactionId: string;
    gateway: string;
    accountNumberMasked: string;
    transferType: string;
    transferAmount: Prisma.Decimal;
    transactionDate: Date;
    code: string | null;
    content: string | null;
    referenceCode: string | null;
    matchStatus: BankTransactionMatchStatus;
    payloadMasked: Prisma.JsonValue;
    createdAt: Date;
    payout?: {
      id: bigint;
      payoutCode: string;
      status: SellerPayoutStatus;
    } | null;
    shop?: { id: bigint; shopName: string; code: string } | null;
  }) {
    return {
      id: transaction.id.toString(),
      provider: transaction.provider,
      providerTransactionId: transaction.providerTransactionId,
      gateway: transaction.gateway,
      accountNumberMasked: transaction.accountNumberMasked,
      transferType: transaction.transferType,
      transferAmount: transaction.transferAmount.toFixed(2),
      transactionDate: transaction.transactionDate,
      code: transaction.code,
      content: transaction.content,
      referenceCode: transaction.referenceCode,
      matchStatus: transaction.matchStatus,
      payload: transaction.payloadMasked,
      createdAt: transaction.createdAt,
      payout: transaction.payout
        ? {
            id: transaction.payout.id.toString(),
            payoutCode: transaction.payout.payoutCode,
            status: transaction.payout.status,
          }
        : null,
      shop: transaction.shop
        ? {
            id: transaction.shop.id.toString(),
            shopName: transaction.shop.shopName,
            code: transaction.shop.code,
          }
        : null,
    };
  }

  private async withSerializableRetry<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        if (
          attempt >= 3 ||
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== 'P2034'
        ) {
          throw error;
        }
      }
    }
  }

  private throwNotFound(code: string): never {
    throw new NotFoundException({
      code,
      message: 'Không tìm thấy dữ liệu tài chính được yêu cầu.',
      details: [],
    });
  }

  private throwTransitionConflict(): never {
    throw new ConflictException({
      code: 'PAYOUT_STATUS_CONFLICT',
      message: 'Trạng thái yêu cầu rút tiền đã thay đổi. Vui lòng tải lại.',
      details: [],
    });
  }
}
