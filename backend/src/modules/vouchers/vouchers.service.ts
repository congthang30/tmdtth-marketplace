import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  createPaginatedResult,
  getPaginationParams,
} from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types';
import { AvailableVoucherQueryDto } from './dto/available-voucher-query.dto';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { VoucherQueryDto } from './dto/voucher-query.dto';
import {
  VOUCHER_DISCOUNT_TYPE_FIXED_AMOUNT,
  VOUCHER_DISCOUNT_TYPE_PERCENTAGE,
  VOUCHER_STATUS_ACTIVE,
  VOUCHER_STATUS_INACTIVE,
  VoucherResponse,
  VoucherSummary,
  VoucherValidationResult,
} from './types';

const SHOP_STATUS_APPROVED = 'Approved';

/** Minimal voucher row shape needed by the shared validation/application logic. */
type VoucherRow = {
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
};

type VoucherClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class VouchersService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------
  // Admin: platform vouchers (shopId = null)
  // ---------------------------------------------------------------------

  async listPlatformVouchers(query: VoucherQueryDto) {
    return this.listVouchers(query, null);
  }

  async createPlatformVoucher(dto: CreateVoucherDto): Promise<VoucherResponse> {
    return this.createVoucher(dto, null);
  }

  async updatePlatformVoucher(
    voucherId: string,
    dto: UpdateVoucherDto,
  ): Promise<VoucherResponse> {
    return this.updateVoucher(voucherId, dto, null);
  }

  async deactivatePlatformVoucher(voucherId: string): Promise<VoucherResponse> {
    return this.deactivateVoucher(voucherId, null);
  }

  // ---------------------------------------------------------------------
  // Seller: shop vouchers (shopId = caller's own shop)
  // ---------------------------------------------------------------------

  async listShopVouchers(user: AuthenticatedUser, query: VoucherQueryDto) {
    const shop = await this.requireOwnedApprovedShop(user);
    return this.listVouchers(query, shop.id);
  }

  async createShopVoucher(
    user: AuthenticatedUser,
    dto: CreateVoucherDto,
  ): Promise<VoucherResponse> {
    const shop = await this.requireOwnedApprovedShop(user);
    return this.createVoucher(dto, shop.id);
  }

  async updateShopVoucher(
    user: AuthenticatedUser,
    voucherId: string,
    dto: UpdateVoucherDto,
  ): Promise<VoucherResponse> {
    const shop = await this.requireOwnedApprovedShop(user);
    return this.updateVoucher(voucherId, dto, shop.id);
  }

  async deactivateShopVoucher(
    user: AuthenticatedUser,
    voucherId: string,
  ): Promise<VoucherResponse> {
    const shop = await this.requireOwnedApprovedShop(user);
    return this.deactivateVoucher(voucherId, shop.id);
  }

  // ---------------------------------------------------------------------
  // Public: vouchers available to the current customer
  // ---------------------------------------------------------------------

  async listAvailableVouchers(
    user: AuthenticatedUser,
    query: AvailableVoucherQueryDto,
  ): Promise<VoucherSummary[]> {
    const now = new Date();
    const subtotal = query.subtotal ? new Prisma.Decimal(query.subtotal) : null;
    const shopId = query.shopId ? BigInt(query.shopId) : null;

    const vouchers = await this.prisma.voucher.findMany({
      where: {
        voucherStatus: VOUCHER_STATUS_ACTIVE,
        startAt: { lte: now },
        endAt: { gte: now },
        OR: [{ shopId: null }, ...(shopId ? [{ shopId }] : [])],
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    const usableVouchers: VoucherSummary[] = [];

    for (const voucher of vouchers) {
      if (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) {
        continue;
      }

      const priorUsage = await this.prisma.voucherUsage.count({
        where: { voucherId: voucher.id, userId: user.id },
      });
      if (priorUsage > 0) {
        continue;
      }

      const isEligible = subtotal !== null && subtotal.gte(voucher.minOrderAmount);
      const estimatedDiscountAmount =
        isEligible && subtotal
          ? this.computeDiscountAmount(voucher, subtotal)
          : new Prisma.Decimal(0);

      usableVouchers.push({
        id: voucher.id.toString(),
        idString: voucher.id.toString(),
        voucherCode: voucher.voucherCode,
        voucherName: voucher.voucherName,
        scope: voucher.shopId === null ? 'Platform' : 'Shop',
        shopId: voucher.shopId?.toString() ?? null,
        shopIdString: voucher.shopId?.toString() ?? null,
        discountType: voucher.discountType as VoucherSummary['discountType'],
        discountValue: voucher.discountValue.toString(),
        maxDiscountAmount: voucher.maxDiscountAmount?.toString() ?? null,
        minOrderAmount: voucher.minOrderAmount.toString(),
        endAt: voucher.endAt,
        isEligible,
        estimatedDiscountAmount: estimatedDiscountAmount.toFixed(2),
      });
    }

    return usableVouchers;
  }

  // ---------------------------------------------------------------------
  // Checkout integration: validate + apply
  // ---------------------------------------------------------------------

  /**
   * Validates a voucher code for a given shop context WITHOUT recording
   * usage. Used by checkout preview so the customer can see the discount
   * before placing the order.
   *
   * @param client Prisma client or transaction; accepts a transaction so
   *   createOrder can re-validate immediately before applying, ensuring
   *   preview and creation see a consistent snapshot.
   * @param orderShopId The shopId of the shop-group this voucher would
   *   apply to, or null when validating a platform-wide voucher against
   *   the whole order. Shop vouchers are rejected unless orderShopId
   *   matches the voucher's own shopId (mã của shop khác không dùng được
   *   cho shop khác).
   */
  async validateVoucher(
    client: VoucherClient,
    user: AuthenticatedUser,
    voucherCode: string,
    orderShopId: bigint | null,
    orderSubtotal: Prisma.Decimal,
    now: Date,
  ): Promise<VoucherValidationResult> {
    const voucher = await client.voucher.findUnique({
      where: { voucherCode: voucherCode.trim().toUpperCase() },
    });

    if (!voucher) {
      throw new NotFoundException({
        code: 'VOUCHER_NOT_FOUND',
        message: 'Mã giảm giá không tồn tại.',
        details: [{ field: 'voucherCode', voucherCode }],
      });
    }

    if (voucher.shopId !== null) {
      // Shop voucher: must be scoped to exactly the shop this order-group
      // belongs to. A voucher from shop A can never discount shop B's items.
      if (orderShopId === null || voucher.shopId !== orderShopId) {
        throw new BadRequestException({
          code: 'VOUCHER_SHOP_MISMATCH',
          message: 'Mã giảm giá này không áp dụng cho gian hàng này.',
          details: [{ field: 'voucherCode', voucherCode }],
        });
      }
    }

    this.assertVoucherWindowAndStatusValid(voucher, now);
    this.assertVoucherHasRemainingUsage(voucher);
    this.assertOrderMeetsMinimum(voucher, orderSubtotal);

    const priorUsage = await client.voucherUsage.count({
      where: { voucherId: voucher.id, userId: user.id },
    });
    if (priorUsage > 0) {
      throw new BadRequestException({
        code: 'VOUCHER_ALREADY_USED',
        message: 'Bạn đã sử dụng mã giảm giá này rồi.',
        details: [{ field: 'voucherCode', voucherCode }],
      });
    }

    const discountAmount = this.computeDiscountAmount(voucher, orderSubtotal);

    return {
      voucher: {
        id: voucher.id,
        voucherCode: voucher.voucherCode,
        voucherName: voucher.voucherName,
        discountType: voucher.discountType as VoucherValidationResult['voucher']['discountType'],
        discountValue: voucher.discountValue.toString(),
        maxDiscountAmount: voucher.maxDiscountAmount?.toString() ?? null,
      },
      discountAmount: discountAmount.toFixed(2),
    };
  }

  /**
   * Records voucher usage inside an existing order-creation transaction.
   * Uses a conditional `updateMany` (usedCount < usageLimit) so concurrent
   * checkouts racing for the last remaining use cannot both succeed —
   * mirrors the inventory reservation pattern in OrdersService.
   *
   * Throws (and by extension rolls back the whole order transaction) if
   * the voucher was exhausted between preview and order creation.
   */
  async applyVoucherInTransaction(
    tx: Prisma.TransactionClient,
    user: AuthenticatedUser,
    voucherId: bigint,
    discountAmount: Prisma.Decimal,
    now: Date,
    context: { orderId?: bigint; shopOrderId?: bigint },
  ): Promise<void> {
    const voucher = await tx.voucher.findUnique({
      where: { id: voucherId },
      select: { usageLimit: true },
    });

    if (!voucher) {
      throw new NotFoundException({
        code: 'VOUCHER_NOT_FOUND',
        message: 'Voucher not found',
        details: [{ voucherId: voucherId.toString() }],
      });
    }

    const updateResult = await tx.voucher.updateMany({
      where: {
        id: voucherId,
        ...(voucher.usageLimit !== null
          ? { usedCount: { lt: voucher.usageLimit } }
          : {}),
      },
      data: { usedCount: { increment: 1 } },
    });

    if (updateResult.count !== 1) {
      throw new BadRequestException({
        code: 'VOUCHER_NO_LONGER_AVAILABLE',
        message: 'Mã giảm giá đã hết lượt sử dụng.',
        details: [{ voucherId: voucherId.toString() }],
      });
    }

    await tx.voucherUsage.create({
      data: {
        voucherId,
        userId: user.id,
        orderId: context.orderId ?? null,
        shopOrderId: context.shopOrderId ?? null,
        discountAmount,
        usedAt: now,
      },
    });
  }

  /**
   * Reverts voucher usage when an order is cancelled, so the user (and the
   * global usage counter) get the use back — consistent with how cancelled
   * orders release reserved inventory.
   */
  async revertVoucherUsagesForOrder(
    tx: Prisma.TransactionClient,
    orderId: bigint,
  ): Promise<void> {
    const usages = await tx.voucherUsage.findMany({ where: { orderId } });

    for (const usage of usages) {
      await tx.voucher.updateMany({
        where: { id: usage.voucherId, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
    }

    await tx.voucherUsage.deleteMany({ where: { orderId } });
  }

  // ---------------------------------------------------------------------
  // Shared validation rules
  // ---------------------------------------------------------------------

  private assertVoucherWindowAndStatusValid(voucher: VoucherRow, now: Date): void {
    if (voucher.voucherStatus !== VOUCHER_STATUS_ACTIVE) {
      throw new BadRequestException({
        code: 'VOUCHER_INACTIVE',
        message: 'Mã giảm giá không còn hoạt động.',
        details: [{ voucherCode: voucher.voucherCode }],
      });
    }

    if (now < voucher.startAt || now > voucher.endAt) {
      throw new BadRequestException({
        code: 'VOUCHER_OUT_OF_WINDOW',
        message: 'Mã giảm giá đã hết hạn hoặc chưa bắt đầu.',
        details: [{ voucherCode: voucher.voucherCode }],
      });
    }
  }

  private assertVoucherHasRemainingUsage(voucher: VoucherRow): void {
    if (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) {
      throw new BadRequestException({
        code: 'VOUCHER_LIMIT_REACHED',
        message: 'Mã giảm giá đã hết lượt sử dụng.',
        details: [{ voucherCode: voucher.voucherCode }],
      });
    }
  }

  private assertOrderMeetsMinimum(
    voucher: VoucherRow,
    orderSubtotal: Prisma.Decimal,
  ): void {
    if (orderSubtotal.lt(voucher.minOrderAmount)) {
      throw new BadRequestException({
        code: 'VOUCHER_MIN_ORDER_NOT_MET',
        message: `Đơn hàng chưa đạt giá trị tối thiểu ${voucher.minOrderAmount.toString()} để dùng mã này.`,
        details: [
          {
            voucherCode: voucher.voucherCode,
            minOrderAmount: voucher.minOrderAmount.toString(),
          },
        ],
      });
    }
  }

  private computeDiscountAmount(
    voucher: VoucherRow,
    orderSubtotal: Prisma.Decimal,
  ): Prisma.Decimal {
    if (voucher.discountType === VOUCHER_DISCOUNT_TYPE_FIXED_AMOUNT) {
      return Prisma.Decimal.min(voucher.discountValue, orderSubtotal);
    }

    // Percentage
    let discount = orderSubtotal.mul(voucher.discountValue).div(100);
    if (voucher.maxDiscountAmount !== null) {
      discount = Prisma.Decimal.min(discount, voucher.maxDiscountAmount);
    }
    return Prisma.Decimal.min(discount, orderSubtotal);
  }

  // ---------------------------------------------------------------------
  // CRUD internals shared by both admin and seller scopes
  // ---------------------------------------------------------------------

  private async listVouchers(query: VoucherQueryDto, shopId: bigint | null) {
    const { page, limit, skip, take } = getPaginationParams(query);
    const where = {
      shopId,
      ...(query.status ? { voucherStatus: query.status } : {}),
    };

    const [vouchers, total] = await Promise.all([
      this.prisma.voucher.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.voucher.count({ where }),
    ]);

    return createPaginatedResult({
      items: vouchers.map((voucher) => this.toVoucherResponse(voucher)),
      page,
      limit,
      total,
      message: 'Vouchers retrieved successfully',
    });
  }

  private async createVoucher(
    dto: CreateVoucherDto,
    shopId: bigint | null,
  ): Promise<VoucherResponse> {
    if (dto.endAt <= dto.startAt) {
      throw new BadRequestException({
        code: 'VOUCHER_INVALID_WINDOW',
        message: 'endAt must be after startAt',
        details: [{ field: 'endAt' }],
      });
    }

    if (
      dto.discountType === VOUCHER_DISCOUNT_TYPE_PERCENTAGE &&
      dto.discountValue > 100
    ) {
      throw new BadRequestException({
        code: 'VOUCHER_INVALID_DISCOUNT_VALUE',
        message: 'Percentage discountValue must be between 1 and 100',
        details: [{ field: 'discountValue' }],
      });
    }

    if (
      dto.discountType === VOUCHER_DISCOUNT_TYPE_FIXED_AMOUNT &&
      dto.maxDiscountAmount !== undefined
    ) {
      throw new BadRequestException({
        code: 'VOUCHER_INVALID_MAX_DISCOUNT',
        message: 'maxDiscountAmount only applies to Percentage vouchers',
        details: [{ field: 'maxDiscountAmount' }],
      });
    }

    const existing = await this.prisma.voucher.findUnique({
      where: { voucherCode: dto.voucherCode },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        code: 'VOUCHER_CODE_EXISTS',
        message: 'Mã giảm giá đã tồn tại.',
        details: [{ field: 'voucherCode', voucherCode: dto.voucherCode }],
      });
    }

    const voucher = await this.prisma.voucher.create({
      data: {
        voucherCode: dto.voucherCode,
        voucherName: dto.voucherName,
        shopId,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        maxDiscountAmount: dto.maxDiscountAmount ?? null,
        minOrderAmount: dto.minOrderAmount ?? 0,
        usageLimit: dto.usageLimit ?? null,
        usedCount: 0,
        startAt: dto.startAt,
        endAt: dto.endAt,
        voucherStatus: VOUCHER_STATUS_ACTIVE,
        createdAt: new Date(),
      },
    });

    return this.toVoucherResponse(voucher);
  }

  private async updateVoucher(
    voucherId: string,
    dto: UpdateVoucherDto,
    shopId: bigint | null,
  ): Promise<VoucherResponse> {
    const id = this.parseVoucherId(voucherId);
    const voucher = await this.requireVoucherInScope(id, shopId);

    const nextStartAt = dto.startAt ?? voucher.startAt;
    const nextEndAt = dto.endAt ?? voucher.endAt;
    if (nextEndAt <= nextStartAt) {
      throw new BadRequestException({
        code: 'VOUCHER_INVALID_WINDOW',
        message: 'endAt must be after startAt',
        details: [{ field: 'endAt' }],
      });
    }

    const nextDiscountValue = dto.discountValue ?? Number(voucher.discountValue);
    if (
      voucher.discountType === VOUCHER_DISCOUNT_TYPE_PERCENTAGE &&
      nextDiscountValue > 100
    ) {
      throw new BadRequestException({
        code: 'VOUCHER_INVALID_DISCOUNT_VALUE',
        message: 'Percentage discountValue must be between 1 and 100',
        details: [{ field: 'discountValue' }],
      });
    }

    const updated = await this.prisma.voucher.update({
      where: { id },
      data: {
        ...(dto.voucherName !== undefined ? { voucherName: dto.voucherName } : {}),
        ...(dto.discountValue !== undefined
          ? { discountValue: dto.discountValue }
          : {}),
        ...(dto.maxDiscountAmount !== undefined
          ? { maxDiscountAmount: dto.maxDiscountAmount }
          : {}),
        ...(dto.minOrderAmount !== undefined
          ? { minOrderAmount: dto.minOrderAmount }
          : {}),
        ...(dto.usageLimit !== undefined ? { usageLimit: dto.usageLimit } : {}),
        ...(dto.startAt !== undefined ? { startAt: dto.startAt } : {}),
        ...(dto.endAt !== undefined ? { endAt: dto.endAt } : {}),
        ...(dto.voucherStatus !== undefined
          ? { voucherStatus: dto.voucherStatus }
          : {}),
      },
    });

    return this.toVoucherResponse(updated);
  }

  private async deactivateVoucher(
    voucherId: string,
    shopId: bigint | null,
  ): Promise<VoucherResponse> {
    const id = this.parseVoucherId(voucherId);
    await this.requireVoucherInScope(id, shopId);

    const updated = await this.prisma.voucher.update({
      where: { id },
      data: { voucherStatus: VOUCHER_STATUS_INACTIVE },
    });

    return this.toVoucherResponse(updated);
  }

  private async requireVoucherInScope(id: bigint, shopId: bigint | null) {
    const voucher = await this.prisma.voucher.findUnique({ where: { id } });

    if (!voucher || voucher.shopId !== shopId) {
      throw new NotFoundException({
        code: 'VOUCHER_NOT_FOUND',
        message: 'Voucher not found',
        details: [{ field: 'voucherId' }],
      });
    }

    return voucher;
  }

  private async requireOwnedApprovedShop(user: AuthenticatedUser) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerUserId: user.id, isDeleted: false },
      orderBy: [{ createdAt: 'desc' }],
    });

    if (!shop) {
      throw new NotFoundException({
        code: 'SHOP_NOT_FOUND',
        message: 'Bạn chưa có gian hàng.',
        details: [],
      });
    }

    if (shop.shopStatus !== SHOP_STATUS_APPROVED) {
      throw new ForbiddenException({
        code: 'SHOP_NOT_APPROVED',
        message: 'Chỉ gian hàng đã được duyệt mới có thể tạo mã giảm giá.',
        details: [{ shopStatus: shop.shopStatus }],
      });
    }

    return shop;
  }

  private toVoucherResponse(voucher: {
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
    createdAt: Date;
  }): VoucherResponse {
    return {
      id: voucher.id.toString(),
      idString: voucher.id.toString(),
      voucherCode: voucher.voucherCode,
      voucherName: voucher.voucherName,
      scope: voucher.shopId === null ? 'Platform' : 'Shop',
      shopId: voucher.shopId?.toString() ?? null,
      shopIdString: voucher.shopId?.toString() ?? null,
      discountType: voucher.discountType as VoucherResponse['discountType'],
      discountValue: voucher.discountValue.toString(),
      maxDiscountAmount: voucher.maxDiscountAmount?.toString() ?? null,
      minOrderAmount: voucher.minOrderAmount.toString(),
      usageLimit: voucher.usageLimit,
      usedCount: voucher.usedCount,
      startAt: voucher.startAt,
      endAt: voucher.endAt,
      voucherStatus: voucher.voucherStatus,
      createdAt: voucher.createdAt,
    };
  }

  private parseVoucherId(value: string): bigint {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException({
        code: 'INVALID_VOUCHER_ID',
        message: 'Voucher id is invalid',
        details: [{ field: 'voucherId' }],
      });
    }

    return BigInt(value);
  }
}
