import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { VerificationStatus } from '@prisma/client';
import {
  createPaginatedResult,
  getPaginationParams,
} from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types';
import { AdminShopQueryDto } from './dto/admin-shop-query.dto';
import { CreateShopDto } from './dto/create-shop.dto';
import { PauseShopIndefinitelyDto } from './dto/pause-shop-indefinitely.dto';
import { RejectShopDto } from './dto/reject-shop.dto';
import { ScheduleShopPauseDto } from './dto/schedule-shop-pause.dto';
import { ShopCatalogQueryDto } from './dto/shop-catalog-query.dto';
import { UpsertShopCategoryDto } from './dto/upsert-shop-category.dto';
import { ShopResponse } from './types';

const SHOP_STATUS_PENDING_APPROVAL = 'PendingApproval';
const SHOP_STATUS_APPROVED = 'Approved';
const SHOP_STATUS_REJECTED = 'Rejected';

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async listShops(query: AdminShopQueryDto) {
    const { page, limit, skip, take } = getPaginationParams(query);
    const where = {
      isDeleted: false,
      ...(query.status ? { shopStatus: query.status } : {}),
    };

    const [shops, total] = await Promise.all([
      this.prisma.shop.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { shopName: 'asc' }],
        skip,
        take,
        include: {
          sellerVerification: {
            select: { id: true, verificationStatus: true },
          },
        },
      }),
      this.prisma.shop.count({ where }),
    ]);

    return createPaginatedResult({
      items: shops.map((shop) => ({
        ...this.toShopResponse(shop),
        sellerVerificationId: shop.sellerVerification?.id.toString() ?? null,
        verificationStatus: shop.sellerVerification?.verificationStatus ?? null,
      })),
      page,
      limit,
      total,
      message: 'Shops retrieved successfully',
    });
  }

  async getMyShop(user: AuthenticatedUser): Promise<ShopResponse | null> {
    const shop = await this.prisma.shop.findFirst({
      where: {
        ownerUserId: user.id,
        isDeleted: false,
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return shop ? this.toShopResponse(shop) : null;
  }

  async getMyShopOperation(user: AuthenticatedUser) {
    const shop = await this.requireOwnedShopForOperation(user);
    return this.toOperationResponse(shop, new Date());
  }

  async scheduleMyShopPause(
    user: AuthenticatedUser,
    dto: ScheduleShopPauseDto,
  ) {
    const shop = await this.requireOwnedShopForOperation(user);
    this.assertSellerCanControlOperation(shop);
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    const now = new Date();
    const maxEndsAt = new Date(startsAt.getTime() + 90 * 24 * 60 * 60 * 1000);
    if (endsAt <= startsAt || endsAt <= now || endsAt > maxEndsAt) {
      throw new BadRequestException({
        code: 'SHOP_PAUSE_INTERVAL_INVALID',
        message:
          'Thời gian nghỉ phải kết thúc sau thời gian bắt đầu, còn hiệu lực và không vượt quá 90 ngày.',
        details: [{ field: 'endsAt' }],
      });
    }
    const reason = this.normalizeNullableText(dto.reason);
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.shop.update({
        where: { id: shop.id },
        data: {
          operationMode: 'PausedUntil',
          pauseStartsAt: startsAt,
          pauseEndsAt: endsAt,
          pauseReason: reason,
          operationUpdatedByUserId: user.id,
          operationUpdatedAt: now,
          updatedAt: now,
        },
      });
      await tx.shopOperationHistory.create({
        data: {
          shopId: shop.id,
          action: 'ScheduledPause',
          startsAt,
          endsAt,
          reason,
          actorUserId: user.id,
          actorRole: 'Seller',
          createdAt: now,
        },
      });
      return row;
    });
    return this.toOperationResponse(updated, now);
  }

  async pauseMyShopIndefinitely(
    user: AuthenticatedUser,
    dto: PauseShopIndefinitelyDto,
  ) {
    const shop = await this.requireOwnedShopForOperation(user);
    this.assertSellerCanControlOperation(shop);
    const now = new Date();
    const reason = this.normalizeNullableText(dto.reason);
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.shop.update({
        where: { id: shop.id },
        data: {
          operationMode: 'PausedIndefinitely',
          pauseStartsAt: now,
          pauseEndsAt: null,
          pauseReason: reason,
          operationUpdatedByUserId: user.id,
          operationUpdatedAt: now,
          updatedAt: now,
        },
      });
      await tx.shopOperationHistory.create({
        data: {
          shopId: shop.id,
          action: 'IndefinitePause',
          startsAt: now,
          reason,
          actorUserId: user.id,
          actorRole: 'Seller',
          createdAt: now,
        },
      });
      return row;
    });
    return this.toOperationResponse(updated, now);
  }

  async resumeMyShop(user: AuthenticatedUser) {
    const shop = await this.requireOwnedShopForOperation(user);
    this.assertSellerCanControlOperation(shop);
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.shop.update({
        where: { id: shop.id },
        data: {
          operationMode: 'Open',
          pauseStartsAt: null,
          pauseEndsAt: null,
          pauseReason: null,
          operationUpdatedByUserId: user.id,
          operationUpdatedAt: now,
          updatedAt: now,
        },
      });
      await tx.shopOperationHistory.create({
        data: {
          shopId: shop.id,
          action: 'Resume',
          actorUserId: user.id,
          actorRole: 'Seller',
          createdAt: now,
        },
      });
      return row;
    });
    return this.toOperationResponse(updated, now);
  }

  async createShop(
    user: AuthenticatedUser,
    dto: CreateShopDto,
  ): Promise<ShopResponse> {
    const publicSlug = this.slugify(dto.shopName);

    if (!publicSlug) {
      throw new BadRequestException({
        code: 'INVALID_SHOP_NAME',
        message: 'Shop name is invalid',
        details: [{ field: 'shopName' }],
      });
    }

    const ownedDraft = await this.prisma.shop.findFirst({
      where: {
        ownerUserId: user.id,
        shopStatus: { in: ['Draft', 'Rejected'] },
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
    });
    const now = new Date();
    if (ownedDraft) {
      const shop = await this.prisma.shop.update({
        where: { id: ownedDraft.id },
        data: {
          shopName: dto.shopName,
          slug: `draft-${user.id.toString()}`,
          shopStatus: 'Draft',
          rejectionReason: null,
          approvedByUserId: null,
          approvedAt: null,
          province: this.normalizeNullableText(dto.province),
          ward: this.normalizeNullableText(dto.ward),
          streetAddress: this.normalizeNullableText(dto.streetAddress),
          updatedAt: now,
        },
      });
      return this.toShopResponse(shop);
    }
    const draftSlug = `draft-${user.id.toString()}`;
    const shop = await this.prisma.shop.create({
      data: {
        ownerUserId: user.id,
        shopName: dto.shopName,
        slug: draftSlug,
        description: this.normalizeNullableText(dto.description),
        email: this.normalizeNullableText(dto.email),
        phoneNumber: this.normalizeNullableText(dto.phoneNumber),
        province: this.normalizeNullableText(dto.province),
        ward: this.normalizeNullableText(dto.ward),
        streetAddress: this.normalizeNullableText(dto.streetAddress),
        taxCode: this.normalizeNullableText(dto.taxCode),
        shopStatus: 'Draft',
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      },
    });

    return this.toShopResponse(shop);
  }

  async getPublicShopCatalog(slug: string, query: ShopCatalogQueryDto) {
    const shop = await this.prisma.shop.findFirst({
      where: {
        slug,
        shopStatus: SHOP_STATUS_APPROVED,
        isDeleted: false,
        ownerUser: { userStatus: 'Active', isDeleted: false },
      },
      select: {
        id: true,
        shopName: true,
        slug: true,
        description: true,
        province: true,
        createdAt: true,
        operationMode: true,
        pauseStartsAt: true,
        pauseEndsAt: true,
      },
    });
    if (!shop)
      throw new NotFoundException({
        code: 'SHOP_NOT_FOUND',
        message: 'Không tìm thấy gian hàng.',
      });

    const now = new Date();
    const isPaused = this.isOperationPaused(shop, now);
    const category = query.category
      ? await this.prisma.shopCategory.findFirst({
          where: { shopId: shop.id, slug: query.category, isActive: true },
          select: { id: true },
        })
      : null;
    if (query.category && !category)
      throw new NotFoundException({
        code: 'SHOP_CATEGORY_NOT_FOUND',
        message: 'Danh mục của gian hàng không tồn tại.',
      });

    const where = {
      shopId: shop.id,
      isDeleted: false,
      isViolation: false,
      productStatus: 'Published',
      ...(isPaused ? { id: { equals: -1n } } : {}),
      ...(category
        ? { shopCategoryProducts: { some: { shopCategoryId: category.id } } }
        : {}),
      ...(query.search
        ? {
            productName: {
              contains: query.search,
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [categories, products, total] = await Promise.all([
      this.prisma.shopCategory.findMany({
        where: { shopId: shop.id, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { categoryName: 'asc' }],
        include: { _count: { select: { categoryProducts: true } } },
      }),
      this.prisma.product.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          images: { where: { isThumbnail: true }, take: 1 },
          variants: { where: { variantStatus: 'Active' } },
          shop: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);
    return {
      shop: {
        ...shop,
        id: shop.id.toString(),
        idString: shop.id.toString(),
        isAcceptingOrders: !isPaused,
      },
      categories: categories.map((item) => ({
        id: item.id.toString(),
        idString: item.id.toString(),
        categoryName: item.categoryName,
        slug: item.slug,
        imageUrl: item.imageUrl,
        parentShopCategoryId: item.parentShopCategoryId?.toString() ?? null,
        productCount: item._count.categoryProducts,
      })),
      products: products.map((product) => ({
        id: product.id.toString(),
        idString: product.id.toString(),
        slug: product.slug,
        productName: product.productName,
        priceMin: product.variants
          .reduce(
            (min, variant) => (variant.price.lt(min) ? variant.price : min),
            product.basePrice,
          )
          .toString(),
        thumbnailImage: product.images[0]
          ? { ...product.images[0], id: product.images[0].id.toString() }
          : null,
        shop: {
          id: product.shop.id.toString(),
          shopName: product.shop.shopName,
          slug: product.shop.slug,
        },
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async listOwnedShopCategories(user: AuthenticatedUser) {
    const shop = await this.requireOwnedApprovedShop(user);
    const rows = await this.prisma.shopCategory.findMany({
      where: { shopId: shop.id },
      orderBy: [{ sortOrder: 'asc' }, { categoryName: 'asc' }],
      include: { categoryProducts: { select: { productId: true } } },
    });
    return rows.map((row) => this.toShopCategoryResponse(row));
  }

  async createOwnedShopCategory(
    user: AuthenticatedUser,
    dto: UpsertShopCategoryDto,
  ) {
    const shop = await this.requireOwnedApprovedShop(user);
    await this.assertParentCategory(shop.id, dto.parentShopCategoryId);
    const row = await this.prisma.shopCategory.create({
      data: {
        shopId: shop.id,
        categoryName: dto.categoryName,
        slug: await this.uniqueShopCategorySlug(shop.id, dto.categoryName),
        parentShopCategoryId: dto.parentShopCategoryId
          ? BigInt(dto.parentShopCategoryId)
          : null,
        description: this.normalizeNullableText(dto.description),
        imageUrl: this.normalizeNullableText(dto.imageUrl),
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: { categoryProducts: { select: { productId: true } } },
    });
    return this.toShopCategoryResponse(row);
  }

  async updateOwnedShopCategory(
    user: AuthenticatedUser,
    id: string,
    dto: UpsertShopCategoryDto,
  ) {
    const shop = await this.requireOwnedApprovedShop(user);
    const categoryId = this.parseShopId(id);
    await this.requireOwnedCategory(shop.id, categoryId);
    await this.assertParentCategory(
      shop.id,
      dto.parentShopCategoryId,
      categoryId,
    );
    const row = await this.prisma.shopCategory.update({
      where: { id: categoryId },
      data: {
        categoryName: dto.categoryName,
        parentShopCategoryId: dto.parentShopCategoryId
          ? BigInt(dto.parentShopCategoryId)
          : null,
        description: this.normalizeNullableText(dto.description),
        imageUrl: this.normalizeNullableText(dto.imageUrl),
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
        updatedAt: new Date(),
      },
      include: { categoryProducts: { select: { productId: true } } },
    });
    return this.toShopCategoryResponse(row);
  }

  async assignOwnedShopCategoryProducts(
    user: AuthenticatedUser,
    id: string,
    productIds: string[],
  ) {
    const shop = await this.requireOwnedApprovedShop(user);
    const categoryId = this.parseShopId(id);
    await this.requireOwnedCategory(shop.id, categoryId);
    const ids = productIds.map((value) => this.parseShopId(value));
    const count = await this.prisma.product.count({
      where: { id: { in: ids }, shopId: shop.id, isDeleted: false },
    });
    if (count !== ids.length)
      throw new BadRequestException({
        code: 'SHOP_CATEGORY_PRODUCT_INVALID',
        message: 'Một hoặc nhiều sản phẩm không thuộc gian hàng.',
      });
    await this.prisma.$transaction(async (tx) => {
      await tx.shopCategoryProduct.deleteMany({
        where: { shopCategoryId: categoryId },
      });
      if (ids.length)
        await tx.shopCategoryProduct.createMany({
          data: ids.map((productId, sortOrder) => ({
            shopCategoryId: categoryId,
            productId,
            sortOrder,
          })),
        });
    });
    return this.listOwnedShopCategories(user);
  }

  async deleteOwnedShopCategory(user: AuthenticatedUser, id: string) {
    const shop = await this.requireOwnedApprovedShop(user);
    const categoryId = this.parseShopId(id);
    await this.requireOwnedCategory(shop.id, categoryId);
    await this.prisma.shopCategory.delete({ where: { id: categoryId } });
    return { success: true };
  }

  private isOperationPaused(
    shop: {
      operationMode: string;
      pauseStartsAt: Date | null;
      pauseEndsAt: Date | null;
    },
    now: Date,
  ) {
    if (shop.operationMode === 'PausedIndefinitely') return true;
    return (
      shop.operationMode === 'PausedUntil' &&
      shop.pauseStartsAt !== null &&
      shop.pauseEndsAt !== null &&
      now >= shop.pauseStartsAt &&
      now < shop.pauseEndsAt
    );
  }

  private async requireOwnedShopForOperation(user: AuthenticatedUser) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerUserId: user.id, isDeleted: false },
      include: { ownerUser: { select: { userStatus: true, isDeleted: true } } },
    });
    if (!shop)
      throw new NotFoundException({
        code: 'SHOP_NOT_FOUND',
        message: 'Không tìm thấy gian hàng.',
        details: [],
      });
    return shop;
  }

  private assertSellerCanControlOperation(
    shop: Awaited<ReturnType<ShopsService['requireOwnedShopForOperation']>>,
  ) {
    if (shop.ownerUser.isDeleted || shop.ownerUser.userStatus !== 'Active')
      throw new BadRequestException({
        code: 'SELLER_ACCOUNT_SUSPENDED',
        message: 'Tài khoản hiện không được phép thay đổi trạng thái nhận đơn.',
        details: [],
      });
    if (shop.shopStatus !== SHOP_STATUS_APPROVED)
      throw new BadRequestException({
        code: 'SHOP_NOT_APPROVED',
        message:
          'Chỉ gian hàng đang được sàn cho phép hoạt động mới có thể thay đổi trạng thái nhận đơn.',
        details: [],
      });
  }

  private toOperationResponse(
    shop: {
      id: bigint;
      operationMode: string;
      pauseStartsAt: Date | null;
      pauseEndsAt: Date | null;
      pauseReason: string | null;
      operationUpdatedAt: Date | null;
      shopStatus: string;
    },
    now: Date,
  ) {
    const isWithinSchedule =
      shop.operationMode === 'PausedUntil' &&
      shop.pauseStartsAt !== null &&
      shop.pauseEndsAt !== null &&
      now >= shop.pauseStartsAt &&
      now < shop.pauseEndsAt;
    const isAcceptingOrders =
      shop.shopStatus === SHOP_STATUS_APPROVED &&
      (shop.operationMode === 'Open' ||
        (shop.operationMode === 'PausedUntil' && !isWithinSchedule));
    return {
      shopId: shop.id.toString(),
      operationMode: shop.operationMode,
      pauseStartsAt: shop.pauseStartsAt,
      pauseEndsAt: shop.pauseEndsAt,
      pauseReason: shop.pauseReason,
      operationUpdatedAt: shop.operationUpdatedAt,
      isAcceptingOrders,
    };
  }

  private async requireOwnedApprovedShop(user: AuthenticatedUser) {
    const shop = await this.prisma.shop.findFirst({
      where: {
        ownerUserId: user.id,
        shopStatus: SHOP_STATUS_APPROVED,
        isDeleted: false,
      },
      select: { id: true },
    });
    if (!shop)
      throw new NotFoundException({
        code: 'SHOP_NOT_FOUND',
        message: 'Không tìm thấy gian hàng đã được duyệt.',
      });
    return shop;
  }
  private async requireOwnedCategory(shopId: bigint, id: bigint) {
    const row = await this.prisma.shopCategory.findFirst({
      where: { id, shopId },
    });
    if (!row)
      throw new NotFoundException({
        code: 'SHOP_CATEGORY_NOT_FOUND',
        message: 'Không tìm thấy danh mục của gian hàng.',
      });
    return row;
  }
  private async assertParentCategory(
    shopId: bigint,
    parentId?: string,
    selfId?: bigint,
  ) {
    if (!parentId) return;
    const id = this.parseShopId(parentId);
    if (id === selfId)
      throw new BadRequestException({
        code: 'SHOP_CATEGORY_PARENT_INVALID',
        message: 'Danh mục không thể là cha của chính nó.',
      });
    await this.requireOwnedCategory(shopId, id);
  }
  private async uniqueShopCategorySlug(shopId: bigint, name: string) {
    const base = this.slugify(name);
    if (!base)
      throw new BadRequestException({
        code: 'SHOP_CATEGORY_NAME_INVALID',
        message: 'Tên danh mục không hợp lệ.',
      });
    let slug = base;
    let suffix = 2;
    while (
      await this.prisma.shopCategory.findUnique({
        where: { shopId_slug: { shopId, slug } },
        select: { id: true },
      })
    )
      slug = `${base}-${suffix++}`;
    return slug;
  }
  private toShopCategoryResponse(row: {
    id: bigint;
    parentShopCategoryId: bigint | null;
    categoryName: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    sortOrder: number;
    isActive: boolean;
    categoryProducts: Array<{ productId: bigint }>;
  }) {
    return {
      id: row.id.toString(),
      idString: row.id.toString(),
      parentShopCategoryId: row.parentShopCategoryId?.toString() ?? null,
      categoryName: row.categoryName,
      slug: row.slug,
      description: row.description,
      imageUrl: row.imageUrl,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      productIds: row.categoryProducts.map((item) => item.productId.toString()),
    };
  }

  async approveShop(
    user: AuthenticatedUser,
    shopId: string,
  ): Promise<ShopResponse> {
    const id = this.parseShopId(shopId);
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: {
        sellerVerification: { select: { verificationStatus: true } },
      },
    });

    if (!shop || shop.isDeleted) {
      throw new NotFoundException({
        code: 'SHOP_NOT_FOUND',
        message: 'Shop not found',
        details: [{ field: 'shopId' }],
      });
    }

    if (shop.shopStatus !== SHOP_STATUS_PENDING_APPROVAL) {
      throw new BadRequestException({
        code: 'SHOP_NOT_PENDING_APPROVAL',
        message: 'Only pending shops can be approved',
        details: [{ field: 'shopStatus', currentStatus: shop.shopStatus }],
      });
    }

    if (
      shop.sellerVerification?.verificationStatus !==
      VerificationStatus.Approved
    ) {
      throw new BadRequestException({
        code: 'SHOP_SELLER_VERIFICATION_REQUIRED',
        message:
          'Chỉ có thể duyệt gian hàng khi hồ sơ người bán đã được xác minh.',
        details: [
          {
            field: 'sellerVerification',
            verificationStatus:
              shop.sellerVerification?.verificationStatus ?? null,
          },
        ],
      });
    }

    const now = new Date();
    const updatedShop = await this.prisma.shop.update({
      where: { id },
      data: {
        shopStatus: SHOP_STATUS_APPROVED,
        approvedByUserId: user.id,
        approvedAt: now,
        rejectionReason: null,
        updatedAt: now,
      },
    });

    return this.toShopResponse(updatedShop);
  }

  async rejectShop(
    user: AuthenticatedUser,
    shopId: string,
    dto: RejectShopDto,
  ): Promise<ShopResponse> {
    const id = this.parseShopId(shopId);
    const shop = await this.prisma.shop.findUnique({ where: { id } });

    if (!shop || shop.isDeleted) {
      throw new NotFoundException({
        code: 'SHOP_NOT_FOUND',
        message: 'Shop not found',
        details: [{ field: 'shopId' }],
      });
    }

    if (shop.shopStatus !== SHOP_STATUS_PENDING_APPROVAL) {
      throw new BadRequestException({
        code: 'SHOP_NOT_PENDING_APPROVAL',
        message: 'Only pending shops can be rejected',
        details: [{ field: 'shopStatus', currentStatus: shop.shopStatus }],
      });
    }

    const now = new Date();
    const updatedShop = await this.prisma.shop.update({
      where: { id },
      data: {
        shopStatus: SHOP_STATUS_REJECTED,
        approvedByUserId: user.id,
        approvedAt: now,
        rejectionReason: dto.reason,
        updatedAt: now,
      },
    });

    return this.toShopResponse(updatedShop);
  }

  async setShopVisibility(
    shopId: string,
    visible: boolean,
  ): Promise<ShopResponse> {
    const id = this.parseShopId(shopId);
    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop || shop.isDeleted)
      throw new NotFoundException({
        code: 'SHOP_NOT_FOUND',
        message: 'Không tìm thấy gian hàng',
        details: [],
      });
    const updated = await this.prisma.shop.update({
      where: { id },
      data: {
        shopStatus: visible ? SHOP_STATUS_APPROVED : 'Suspended',
        updatedAt: new Date(),
      },
    });
    return this.toShopResponse(updated);
  }

  async deleteShop(shopId: string): Promise<ShopResponse> {
    const id = this.parseShopId(shopId);
    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop || shop.isDeleted)
      throw new NotFoundException({
        code: 'SHOP_NOT_FOUND',
        message: 'Không tìm thấy gian hàng',
        details: [],
      });
    const updated = await this.prisma.shop.update({
      where: { id },
      data: { isDeleted: true, shopStatus: 'Deleted', updatedAt: new Date() },
    });
    return this.toShopResponse(updated);
  }

  private toShopResponse(shop: {
    id: bigint;
    ownerUserId: bigint;
    shopName: string;
    slug: string;
    description: string | null;
    email: string | null;
    phoneNumber: string | null;
    province: string | null;
    ward: string | null;
    streetAddress: string | null;
    taxCode: string | null;
    shopStatus: string;
    operationMode: 'Open' | 'PausedUntil' | 'PausedIndefinitely';
    pauseStartsAt: Date | null;
    pauseEndsAt: Date | null;
    pauseReason: string | null;
    operationUpdatedAt: Date | null;
    approvedByUserId: bigint | null;
    approvedAt: Date | null;
    rejectionReason: string | null;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date | null;
  }): ShopResponse {
    return {
      id: shop.id.toString(),
      idString: shop.id.toString(),
      ownerUserId: shop.ownerUserId.toString(),
      ownerUserIdString: shop.ownerUserId.toString(),
      shopName: shop.shopName,
      slug: shop.slug,
      description: shop.description,
      email: shop.email,
      phoneNumber: shop.phoneNumber,
      province: shop.province,
      ward: shop.ward,
      streetAddress: shop.streetAddress,
      taxCode: shop.taxCode,
      shopStatus: shop.shopStatus,
      operationMode: shop.operationMode,
      pauseStartsAt: shop.pauseStartsAt,
      pauseEndsAt: shop.pauseEndsAt,
      pauseReason: shop.pauseReason,
      operationUpdatedAt: shop.operationUpdatedAt,
      isAcceptingOrders: this.toOperationResponse(shop, new Date())
        .isAcceptingOrders,
      approvedByUserId: shop.approvedByUserId?.toString() ?? null,
      approvedByUserIdString: shop.approvedByUserId?.toString() ?? null,
      approvedAt: shop.approvedAt,
      rejectionReason: shop.rejectionReason,
      isDeleted: shop.isDeleted,
      createdAt: shop.createdAt,
      updatedAt: shop.updatedAt,
    };
  }

  private parseShopId(value: string): bigint {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException({
        code: 'INVALID_SHOP_ID',
        message: 'Shop id is invalid',
        details: [{ field: 'shopId' }],
      });
    }

    return BigInt(value);
  }

  private slugify(value: string): string {
    return value
      .replace(/[đĐ]/g, 'd')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 180);
  }

  private normalizeNullableText(value: string | undefined): string | null {
    if (value === undefined) {
      return null;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  }
}
