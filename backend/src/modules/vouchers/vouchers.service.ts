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
  VOUCHER_DISCOUNT_TARGET_SHIPPING,
  VOUCHER_DISCOUNT_TYPE_FIXED_AMOUNT,
  VOUCHER_DISCOUNT_TYPE_PERCENTAGE,
  VOUCHER_STATUS_ACTIVE,
  VOUCHER_STATUS_INACTIVE,
  VoucherResponse,
  VoucherSummary,
  VoucherValidationContext,
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
  discountTarget: string;
  productScope: string;
  voucherShopCategories: Array<{
    shopCategoryId: bigint;
    shopCategory: { id: bigint; categoryName: string; slug: string };
  }>;
  voucherProducts: Array<{
    productId: bigint;
    product: { id: bigint; productName: string; slug: string };
  }>;
  voucherCategories: Array<{
    categoryId: bigint;
    category: { id: bigint; categoryName: string; slug: string };
  }>;
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
      include: {
        voucherCategories: { include: { category: true } },
        voucherProducts: { include: { product: true } },
        voucherShopCategories: { include: { shopCategory: true } },
      },
    });

    const usableVouchers: VoucherSummary[] = [];

    for (const voucher of vouchers) {
      if (
        voucher.usageLimit !== null &&
        voucher.usedCount >= voucher.usageLimit
      ) {
        continue;
      }

      const priorUsage = await this.prisma.voucherUsage.count({
        where: { voucherId: voucher.id, userId: user.id },
      });
      if (priorUsage > 0) {
        continue;
      }

      const isEligible =
        subtotal !== null && subtotal.gte(voucher.minOrderAmount);
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
        discountTarget:
          voucher.discountTarget as VoucherSummary['discountTarget'],
        productScope: voucher.productScope as VoucherSummary['productScope'],
        categories:
          voucher.shopId === null
            ? this.toCategorySummaries(voucher.voucherCategories)
            : voucher.voucherShopCategories.map(({ shopCategory }) => ({
                id: shopCategory.id.toString(),
                idString: shopCategory.id.toString(),
                categoryName: shopCategory.categoryName,
                slug: shopCategory.slug,
              })),
        products: this.toProductSummaries(voucher.voucherProducts),
        eligibleAmount: subtotal?.toFixed(2) ?? '0.00',
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
    context: VoucherValidationContext,
    now: Date,
  ): Promise<VoucherValidationResult> {
    const voucher = await client.voucher.findUnique({
      where: { voucherCode: voucherCode.trim().toUpperCase() },
      include: {
        voucherCategories: { include: { category: true } },
        voucherProducts: { include: { product: true } },
        voucherShopCategories: { include: { shopCategory: true } },
      },
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
      if (
        context.orderShopId === null ||
        voucher.shopId !== context.orderShopId
      ) {
        throw new BadRequestException({
          code: 'VOUCHER_SHOP_MISMATCH',
          message: 'Mã giảm giá này không áp dụng cho gian hàng này.',
          details: [{ field: 'voucherCode', voucherCode }],
        });
      }
    }

    this.assertVoucherWindowAndStatusValid(voucher, now);
    this.assertVoucherHasRemainingUsage(voucher);
    const eligibleAmount = this.computeEligibleAmount(voucher, context);
    if (eligibleAmount.isZero()) {
      throw new BadRequestException({
        code: 'VOUCHER_NO_ELIGIBLE_ITEMS',
        message:
          voucher.discountTarget === VOUCHER_DISCOUNT_TARGET_SHIPPING
            ? 'Mã vận chuyển cần có báo giá giao hàng hợp lệ.'
            : 'Giỏ hàng không có sản phẩm thuộc danh mục áp dụng của mã này.',
        details: [{ field: 'voucherCode', voucherCode }],
      });
    }
    this.assertOrderMeetsMinimum(voucher, eligibleAmount);

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

    const discountAmount = this.computeDiscountAmount(voucher, eligibleAmount);

    return {
      voucher: {
        id: voucher.id,
        voucherCode: voucher.voucherCode,
        voucherName: voucher.voucherName,
        discountType:
          voucher.discountType as VoucherValidationResult['voucher']['discountType'],
        discountValue: voucher.discountValue.toString(),
        maxDiscountAmount: voucher.maxDiscountAmount?.toString() ?? null,
        discountTarget:
          voucher.discountTarget as VoucherValidationResult['voucher']['discountTarget'],
        categoryIds: voucher.voucherCategories.map((item) => item.categoryId),
        productScope:
          voucher.productScope as VoucherValidationResult['voucher']['productScope'],
        productIds: voucher.voucherProducts.map((item) => item.productId),
      },
      eligibleAmount: eligibleAmount.toFixed(2),
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

  private assertVoucherWindowAndStatusValid(
    voucher: VoucherRow,
    now: Date,
  ): void {
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
    if (
      voucher.usageLimit !== null &&
      voucher.usedCount >= voucher.usageLimit
    ) {
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

  private computeEligibleAmount(
    voucher: VoucherRow,
    context: VoucherValidationContext,
  ): Prisma.Decimal {
    if (voucher.discountTarget === VOUCHER_DISCOUNT_TARGET_SHIPPING) {
      return context.shippingAmount;
    }

    const categoryIds = new Set(
      voucher.voucherCategories.map((item) => item.categoryId.toString()),
    );
    const shopCategoryIds = new Set(
      voucher.voucherShopCategories.map((item) =>
        item.shopCategoryId.toString(),
      ),
    );
    const productIds = new Set(
      voucher.voucherProducts.map((item) => item.productId.toString()),
    );
    return context.productLines.reduce(
      (total, line) =>
        voucher.productScope === 'AllProducts' ||
        (voucher.productScope === 'Categories' &&
          (voucher.shopId === null
            ? categoryIds.has(line.categoryId.toString())
            : line.shopCategoryIds.some((id) =>
                shopCategoryIds.has(id.toString()),
              ))) ||
        (voucher.productScope === 'SpecificProducts' &&
          productIds.has(line.productId.toString()))
          ? total.add(line.amount)
          : total,
      new Prisma.Decimal(0),
    );
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
        include: {
          voucherCategories: { include: { category: true } },
          voucherProducts: { include: { product: true } },
          voucherShopCategories: { include: { shopCategory: true } },
        },
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

    await this.assertValidTargetAndCategories(
      dto.discountTarget,
      dto.productScope,
      dto.categoryIds,
      dto.productIds,
      shopId,
    );

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
        discountTarget: dto.discountTarget,
        productScope:
          dto.discountTarget === VOUCHER_DISCOUNT_TARGET_SHIPPING
            ? 'AllProducts'
            : dto.productScope,
        discountValue: dto.discountValue,
        maxDiscountAmount: dto.maxDiscountAmount ?? null,
        minOrderAmount: dto.minOrderAmount ?? 0,
        usageLimit: dto.usageLimit ?? null,
        usedCount: 0,
        startAt: dto.startAt,
        endAt: dto.endAt,
        voucherStatus: VOUCHER_STATUS_ACTIVE,
        createdAt: new Date(),
        voucherProducts: dto.productIds?.length
          ? {
              create: dto.productIds.map((productId) => ({
                productId: BigInt(productId),
              })),
            }
          : undefined,
        voucherShopCategories:
          shopId !== null && dto.categoryIds?.length
            ? {
                create: dto.categoryIds.map((shopCategoryId) => ({
                  shopCategoryId: BigInt(shopCategoryId),
                })),
              }
            : undefined,
        voucherCategories:
          shopId === null && dto.categoryIds?.length
            ? {
                create: dto.categoryIds.map((categoryId) => ({
                  categoryId: BigInt(categoryId),
                })),
              }
            : undefined,
      },
      include: {
        voucherCategories: { include: { category: true } },
        voucherProducts: { include: { product: true } },
        voucherShopCategories: { include: { shopCategory: true } },
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

    const nextDiscountValue =
      dto.discountValue ?? Number(voucher.discountValue);
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

    const nextDiscountTarget = dto.discountTarget ?? voucher.discountTarget;
    const nextProductScope = dto.productScope ?? voucher.productScope;
    await this.assertValidTargetAndCategories(
      nextDiscountTarget,
      nextProductScope,
      dto.categoryIds,
      dto.productIds,
      shopId,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.categoryIds !== undefined) {
        await tx.voucherCategory.deleteMany({ where: { voucherId: id } });
        await tx.voucherShopCategory.deleteMany({ where: { voucherId: id } });
      }
      if (dto.productIds !== undefined) {
        await tx.voucherProduct.deleteMany({ where: { voucherId: id } });
      }

      return tx.voucher.update({
        where: { id },
        data: {
          ...(dto.voucherName !== undefined
            ? { voucherName: dto.voucherName }
            : {}),
          ...(dto.discountValue !== undefined
            ? { discountValue: dto.discountValue }
            : {}),
          ...(dto.maxDiscountAmount !== undefined
            ? { maxDiscountAmount: dto.maxDiscountAmount }
            : {}),
          ...(dto.minOrderAmount !== undefined
            ? { minOrderAmount: dto.minOrderAmount }
            : {}),
          ...(dto.usageLimit !== undefined
            ? { usageLimit: dto.usageLimit }
            : {}),
          ...(dto.startAt !== undefined ? { startAt: dto.startAt } : {}),
          ...(dto.endAt !== undefined ? { endAt: dto.endAt } : {}),
          ...(dto.productScope !== undefined
            ? { productScope: dto.productScope }
            : {}),
          ...(dto.discountTarget !== undefined
            ? { discountTarget: dto.discountTarget }
            : {}),
          ...(dto.voucherStatus !== undefined
            ? { voucherStatus: dto.voucherStatus }
            : {}),
          ...(dto.productIds?.length
            ? {
                voucherProducts: {
                  create: dto.productIds.map((productId) => ({
                    productId: BigInt(productId),
                  })),
                },
              }
            : {}),
          ...(dto.categoryIds?.length
            ? shopId === null
              ? {
                  voucherCategories: {
                    create: dto.categoryIds.map((categoryId) => ({
                      categoryId: BigInt(categoryId),
                    })),
                  },
                }
              : {
                  voucherShopCategories: {
                    create: dto.categoryIds.map((shopCategoryId) => ({
                      shopCategoryId: BigInt(shopCategoryId),
                    })),
                  },
                }
            : {}),
        },
        include: {
          voucherCategories: { include: { category: true } },
          voucherProducts: { include: { product: true } },
          voucherShopCategories: { include: { shopCategory: true } },
        },
      });
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
      include: {
        voucherCategories: { include: { category: true } },
        voucherProducts: { include: { product: true } },
        voucherShopCategories: { include: { shopCategory: true } },
      },
    });

    return this.toVoucherResponse(updated);
  }

  private async assertValidTargetAndCategories(
    discountTarget: string,
    productScope: string,
    categoryIds: string[] | undefined,
    productIds: string[] | undefined,
    shopId: bigint | null,
  ): Promise<void> {
    if (
      shopId !== null &&
      discountTarget === VOUCHER_DISCOUNT_TARGET_SHIPPING
    ) {
      throw new BadRequestException({
        code: 'VOUCHER_SHOP_SHIPPING_NOT_SUPPORTED',
        message: 'Gian hàng chỉ có thể tạo voucher giảm tiền hàng.',
        details: [{ field: 'discountTarget' }],
      });
    }
    if (
      discountTarget !== VOUCHER_DISCOUNT_TARGET_SHIPPING &&
      ((productScope === 'Categories') !== Boolean(categoryIds?.length) ||
        (productScope === 'SpecificProducts') !== Boolean(productIds?.length))
    ) {
      throw new BadRequestException({
        code: 'VOUCHER_PRODUCT_SCOPE_INVALID',
        message:
          'Phạm vi áp dụng và danh sách sản phẩm hoặc danh mục chưa phù hợp.',
        details: [{ field: 'productScope' }],
      });
    }
    if (
      discountTarget === VOUCHER_DISCOUNT_TARGET_SHIPPING &&
      categoryIds?.length
    ) {
      throw new BadRequestException({
        code: 'VOUCHER_SHIPPING_CATEGORIES_NOT_ALLOWED',
        message: 'Voucher phí vận chuyển không áp dụng theo danh mục sản phẩm.',
        details: [{ field: 'categoryIds' }],
      });
    }
    if (productIds?.length) {
      const ids = productIds.map((id) => BigInt(id));
      const count = await this.prisma.product.count({
        where: {
          id: { in: ids },
          isDeleted: false,
          ...(shopId !== null ? { shopId } : {}),
        },
      });
      if (count !== ids.length)
        throw new BadRequestException({
          code: 'VOUCHER_PRODUCT_INVALID',
          message:
            'Một hoặc nhiều sản phẩm không tồn tại hoặc không thuộc gian hàng.',
          details: [{ field: 'productIds' }],
        });
    }
    if (!categoryIds?.length) return;

    const ids = categoryIds.map((id) => BigInt(id));
    if (shopId !== null) {
      const categories = await this.prisma.shopCategory.findMany({
        where: { id: { in: ids }, shopId, isActive: true },
        select: { id: true },
      });
      if (categories.length !== ids.length)
        throw new BadRequestException({
          code: 'VOUCHER_SHOP_CATEGORY_INVALID',
          message: 'Một hoặc nhiều danh mục không thuộc gian hàng.',
          details: [{ field: 'categoryIds' }],
        });
      return;
    }
    const categories = await this.prisma.category.findMany({
      where: {
        id: { in: ids },
        isActive: true,
        ...(shopId !== null
          ? { products: { some: { shopId, isDeleted: false } } }
          : {}),
      },
      select: { id: true },
    });
    if (categories.length !== ids.length) {
      throw new BadRequestException({
        code: 'VOUCHER_CATEGORY_INVALID',
        message:
          'Một hoặc nhiều danh mục không tồn tại hoặc không thuộc sản phẩm của gian hàng.',
        details: [{ field: 'categoryIds' }],
      });
    }
  }

  private toProductSummaries(items: VoucherRow['voucherProducts']) {
    return items.map(({ product }) => ({
      id: product.id.toString(),
      idString: product.id.toString(),
      productName: product.productName,
      slug: product.slug,
    }));
  }

  private toCategorySummaries(items: VoucherRow['voucherCategories']) {
    return items.map(({ category }) => ({
      id: category.id.toString(),
      idString: category.id.toString(),
      categoryName: category.categoryName,
      slug: category.slug,
    }));
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
    discountTarget: string;
    productScope: string;
    voucherCategories: VoucherRow['voucherCategories'];
    voucherProducts: VoucherRow['voucherProducts'];
    voucherShopCategories: VoucherRow['voucherShopCategories'];
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
      discountTarget:
        voucher.discountTarget as VoucherResponse['discountTarget'],
      productScope: voucher.productScope as VoucherResponse['productScope'],
      categories:
        voucher.shopId === null
          ? this.toCategorySummaries(voucher.voucherCategories)
          : voucher.voucherShopCategories.map(({ shopCategory }) => ({
              id: shopCategory.id.toString(),
              idString: shopCategory.id.toString(),
              categoryName: shopCategory.categoryName,
              slug: shopCategory.slug,
            })),
      products: this.toProductSummaries(voucher.voucherProducts),
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
