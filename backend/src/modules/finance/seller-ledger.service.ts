import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  SellerLedgerEntryType,
  SellerLedgerSourceType,
} from '@prisma/client';
import {
  createPaginatedResult,
  getPaginationParams,
} from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types';
import {
  AdminSellerLedgerQueryDto,
  SellerLedgerQueryDto,
} from './dto/seller-ledger-query.dto';
import {
  PAYOUT_RESERVED_STATUSES,
  SELLER_LEDGER_HOLD_MS,
} from './finance.constants';

const COMPLETED_STATUS = 'Completed';
const ZERO = new Prisma.Decimal(0);

type AccrualClient = Pick<
  Prisma.TransactionClient,
  'shopOrder' | 'sellerLedgerEntry'
>;

@Injectable()
export class SellerLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async accrueCompletedShopOrder(
    client: AccrualClient,
    shopOrderId: bigint,
    completedAt: Date,
  ) {
    const shopOrder = await client.shopOrder.findUniqueOrThrow({
      where: { id: shopOrderId },
      select: {
        id: true,
        shopId: true,
        shopOrderCode: true,
        orderStatus: true,
        subtotalAmount: true,
        discountAmount: true,
        voucherUsages: {
          select: {
            discountAmount: true,
            voucher: { select: { shopId: true } },
          },
        },
        order: {
          select: {
            shopOrders: {
              orderBy: { id: 'asc' },
              select: { id: true, subtotalAmount: true },
            },
            voucherUsages: {
              where: { voucher: { shopId: null } },
              select: { discountAmount: true },
            },
          },
        },
      },
    });

    if (shopOrder.orderStatus !== COMPLETED_STATUS) {
      throw new Error(
        `Cannot accrue ledger for shop order ${shopOrderId.toString()} before completion.`,
      );
    }

    const shopFundedDiscount = shopOrder.voucherUsages.reduce(
      (total, usage) =>
        usage.voucher.shopId === shopOrder.shopId
          ? total.add(usage.discountAmount)
          : total,
      ZERO,
    );
    const platformDiscount = shopOrder.order.voucherUsages.reduce(
      (total, usage) => total.add(usage.discountAmount),
      ZERO,
    );
    const platformVoucherCredit = this.allocatePlatformDiscount(
      shopOrder.id,
      shopOrder.order.shopOrders,
      platformDiscount,
    );
    const classifiedDiscount = shopFundedDiscount.add(platformVoucherCredit);
    const saleCredit = shopOrder.subtotalAmount.sub(shopOrder.discountAmount);

    if (
      saleCredit.isNegative() ||
      platformVoucherCredit.isNegative() ||
      !classifiedDiscount.equals(shopOrder.discountAmount)
    ) {
      throw new Error(
        `Invalid financial snapshot for shop order ${shopOrderId.toString()}.`,
      );
    }

    const sourceId = shopOrder.id.toString();
    const availableAt = new Date(completedAt.getTime() + SELLER_LEDGER_HOLD_MS);
    const metadata: Prisma.InputJsonObject = {
      shopOrderCode: shopOrder.shopOrderCode,
      subtotalAmount: shopOrder.subtotalAmount.toFixed(2),
      discountAmount: shopOrder.discountAmount.toFixed(2),
      shopFundedDiscount: shopFundedDiscount.toFixed(2),
      platformFundedDiscount: platformVoucherCredit.toFixed(2),
    };
    const entries: Prisma.SellerLedgerEntryCreateManyInput[] = [];

    if (!saleCredit.isZero()) {
      entries.push({
        shopId: shopOrder.shopId,
        shopOrderId: shopOrder.id,
        entryType: SellerLedgerEntryType.SaleCredit,
        sourceType: SellerLedgerSourceType.ShopOrder,
        sourceId,
        amount: saleCredit,
        description: `Doanh thu đơn ${shopOrder.shopOrderCode}`,
        metadata,
        availableAt,
        createdAt: completedAt,
      });
    }

    if (!platformVoucherCredit.isZero()) {
      entries.push({
        shopId: shopOrder.shopId,
        shopOrderId: shopOrder.id,
        entryType: SellerLedgerEntryType.PlatformVoucherCredit,
        sourceType: SellerLedgerSourceType.ShopOrder,
        sourceId,
        amount: platformVoucherCredit,
        description: `Sàn bù voucher cho đơn ${shopOrder.shopOrderCode}`,
        metadata,
        availableAt,
        createdAt: completedAt,
      });
    }

    const result = entries.length
      ? await client.sellerLedgerEntry.createMany({
          data: entries,
          skipDuplicates: true,
        })
      : { count: 0 };

    return {
      createdEntryCount: result.count,
      expectedAmount: saleCredit.add(platformVoucherCredit),
      availableAt,
    };
  }

  async getSellerSummary(user: AuthenticatedUser) {
    const shop = await this.requireOwnedShop(user.id);
    const now = new Date();
    const [pending, matured, reserved, paid] = await Promise.all([
      this.prisma.sellerLedgerEntry.aggregate({
        where: { shopId: shop.id, availableAt: { gt: now } },
        _sum: { amount: true },
      }),
      this.prisma.sellerLedgerEntry.aggregate({
        where: { shopId: shop.id, availableAt: { lte: now } },
        _sum: { amount: true },
      }),
      this.prisma.sellerPayout.aggregate({
        where: { shopId: shop.id, status: { in: PAYOUT_RESERVED_STATUSES } },
        _sum: { amount: true },
      }),
      this.prisma.sellerLedgerEntry.aggregate({
        where: {
          shopId: shop.id,
          entryType: SellerLedgerEntryType.PayoutDebit,
        },
        _sum: { amount: true },
      }),
    ]);
    const reservedAmount = reserved._sum.amount ?? ZERO;
    const availableAmount = (matured._sum.amount ?? ZERO).sub(reservedAmount);

    return {
      shop: this.toShopResponse(shop),
      pendingAmount: this.money(pending._sum.amount),
      availableAmount: this.money(availableAmount),
      reservedAmount: this.money(reservedAmount),
      paidAmount: this.money(paid._sum.amount?.abs()),
      holdDays: SELLER_LEDGER_HOLD_MS / (24 * 60 * 60 * 1000),
      asOf: now,
    };
  }

  async listSellerLedger(user: AuthenticatedUser, query: SellerLedgerQueryDto) {
    const shop = await this.requireOwnedShop(user.id);
    return this.listLedger(query, shop.id);
  }

  async listAdminLedger(query: AdminSellerLedgerQueryDto) {
    return this.listLedger(
      query,
      query.shopId ? BigInt(query.shopId) : undefined,
    );
  }

  private async listLedger(query: SellerLedgerQueryDto, shopId?: bigint) {
    const { page, limit, skip, take } = getPaginationParams(query);
    const createdAt = this.getDateRange(query.from, query.to);
    const q = query.q?.trim();
    const where: Prisma.SellerLedgerEntryWhereInput = {
      ...(shopId ? { shopId } : {}),
      ...(query.entryType ? { entryType: query.entryType } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(q
        ? {
            OR: [
              { sourceId: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              {
                shopOrder: {
                  shopOrderCode: { contains: q, mode: 'insensitive' },
                },
              },
              { shop: { shopName: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.sellerLedgerEntry.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          shop: { select: { id: true, shopName: true, code: true } },
          shopOrder: {
            select: { id: true, shopOrderCode: true, orderStatus: true },
          },
        },
      }),
      this.prisma.sellerLedgerEntry.count({ where }),
    ]);

    return createPaginatedResult({
      items: items.map((entry) => ({
        id: entry.id.toString(),
        shop: this.toShopResponse(entry.shop),
        shopOrder: entry.shopOrder
          ? {
              id: entry.shopOrder.id.toString(),
              shopOrderCode: entry.shopOrder.shopOrderCode,
              orderStatus: entry.shopOrder.orderStatus,
            }
          : null,
        entryType: entry.entryType,
        sourceType: entry.sourceType,
        sourceId: entry.sourceId,
        amount: entry.amount.toFixed(2),
        direction: entry.amount.isPositive() ? 'Credit' : 'Debit',
        description: entry.description,
        metadata: entry.metadata,
        availableAt: entry.availableAt,
        createdAt: entry.createdAt,
      })),
      page,
      limit,
      total,
    });
  }

  private async requireOwnedShop(ownerUserId: bigint) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerUserId, isDeleted: false },
      select: { id: true, shopName: true, code: true },
    });

    if (!shop) {
      throw new NotFoundException({
        code: 'SELLER_SHOP_NOT_FOUND',
        message: 'Không tìm thấy gian hàng của người bán.',
        details: [],
      });
    }

    return shop;
  }

  private allocatePlatformDiscount(
    shopOrderId: bigint,
    shopOrders: Array<{ id: bigint; subtotalAmount: Prisma.Decimal }>,
    discountAmount: Prisma.Decimal,
  ): Prisma.Decimal {
    if (discountAmount.isZero() || shopOrders.length === 0) return ZERO;
    const totalSubtotal = shopOrders.reduce(
      (total, shopOrder) => total.add(shopOrder.subtotalAmount),
      ZERO,
    );
    if (totalSubtotal.isZero()) return ZERO;

    let allocated = ZERO;
    for (const [index, shopOrder] of shopOrders.entries()) {
      const share =
        index === shopOrders.length - 1
          ? discountAmount.sub(allocated)
          : shopOrder.subtotalAmount
              .mul(discountAmount)
              .div(totalSubtotal)
              .toDecimalPlaces(2);
      allocated = allocated.add(share);
      if (shopOrder.id === shopOrderId) return share;
    }

    throw new Error(
      `Shop order ${shopOrderId.toString()} is not in its order.`,
    );
  }

  private getDateRange(from?: string, to?: string) {
    if (!from && !to) return undefined;
    const start = from ? new Date(from) : undefined;
    const end = to ? new Date(to) : undefined;

    if (start && end && start > end) {
      throw new BadRequestException({
        code: 'INVALID_LEDGER_DATE_RANGE',
        message: 'Thời gian bắt đầu phải trước thời gian kết thúc.',
        details: [{ field: 'from' }, { field: 'to' }],
      });
    }

    return {
      ...(start ? { gte: start } : {}),
      ...(end ? { lte: end } : {}),
    };
  }

  private money(value: Prisma.Decimal | null | undefined): string {
    return (value ?? ZERO).toFixed(2);
  }

  private toShopResponse(shop: { id: bigint; shopName: string; code: string }) {
    return {
      id: shop.id.toString(),
      shopName: shop.shopName,
      code: shop.code,
    };
  }
}
