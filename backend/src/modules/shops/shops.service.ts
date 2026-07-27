import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PayoutStatus, VerificationStatus } from '@prisma/client';
import {
  createPaginatedResult,
  getPaginationParams,
} from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types';
import { AdminShopQueryDto } from './dto/admin-shop-query.dto';
import { CreateShopDto } from './dto/create-shop.dto';
import { RejectShopDto } from './dto/reject-shop.dto';
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
      }),
      this.prisma.shop.count({ where }),
    ]);

    return createPaginatedResult({
      items: shops.map((shop) => this.toShopResponse(shop)),
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

  async createShop(
    user: AuthenticatedUser,
    dto: CreateShopDto,
  ): Promise<ShopResponse> {
    const slug = this.slugify(dto.shopName);

    if (!slug) {
      throw new BadRequestException({
        code: 'INVALID_SHOP_NAME',
        message: 'Shop name is invalid',
        details: [{ field: 'shopName' }],
      });
    }

    const existingShop = await this.prisma.shop.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingShop) {
      throw new ConflictException({
        code: 'SHOP_SLUG_EXISTS',
        message: 'Shop slug already exists',
        details: [{ field: 'shopName', slug }],
      });
    }

    const now = new Date();
    const shop = await this.prisma.shop.create({
      data: {
        ownerUserId: user.id,
        shopName: dto.shopName,
        slug,
        description: this.normalizeNullableText(dto.description),
        email: this.normalizeNullableText(dto.email),
        phoneNumber: this.normalizeNullableText(dto.phoneNumber),
        province: this.normalizeNullableText(dto.province),
        ward: this.normalizeNullableText(dto.ward),
        streetAddress: this.normalizeNullableText(dto.streetAddress),
        taxCode: this.normalizeNullableText(dto.taxCode),
        shopStatus: SHOP_STATUS_PENDING_APPROVAL,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      },
    });

    return this.toShopResponse(shop);
  }

  async getPublicShopCatalog(slug: string, query: ShopCatalogQueryDto) {
    const shop = await this.prisma.shop.findFirst({
      where: { slug, shopStatus: SHOP_STATUS_APPROVED, isDeleted: false },
      select: { id: true, shopName: true, slug: true, description: true, province: true, createdAt: true },
    });
    if (!shop) throw new NotFoundException({ code: 'SHOP_NOT_FOUND', message: 'Không tìm thấy gian hàng.' });

    const category = query.category
      ? await this.prisma.shopCategory.findFirst({ where: { shopId: shop.id, slug: query.category, isActive: true }, select: { id: true } })
      : null;
    if (query.category && !category) throw new NotFoundException({ code: 'SHOP_CATEGORY_NOT_FOUND', message: 'Danh mục của gian hàng không tồn tại.' });

    const where = {
      shopId: shop.id,
      isDeleted: false,
      isViolation: false,
      productStatus: 'Published',
      ...(category ? { shopCategoryProducts: { some: { shopCategoryId: category.id } } } : {}),
      ...(query.search ? { productName: { contains: query.search, mode: 'insensitive' as const } } : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [categories, products, total] = await Promise.all([
      this.prisma.shopCategory.findMany({
        where: { shopId: shop.id, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { categoryName: 'asc' }],
        include: { _count: { select: { categoryProducts: true } } },
      }),
      this.prisma.product.findMany({ where, skip, take: query.limit, orderBy: [{ createdAt: 'desc' }], include: { images: { where: { isThumbnail: true }, take: 1 }, variants: { where: { variantStatus: 'Active' } }, shop: true } }),
      this.prisma.product.count({ where }),
    ]);
    return {
      shop: { ...shop, id: shop.id.toString(), idString: shop.id.toString() },
      categories: categories.map((item) => ({ id: item.id.toString(), idString: item.id.toString(), categoryName: item.categoryName, slug: item.slug, parentShopCategoryId: item.parentShopCategoryId?.toString() ?? null, productCount: item._count.categoryProducts })),
      products: products.map((product) => ({ id: product.id.toString(), idString: product.id.toString(), slug: product.slug, productName: product.productName, priceMin: product.variants.reduce((min, variant) => variant.price.lt(min) ? variant.price : min, product.basePrice).toString(), thumbnailImage: product.images[0] ? { ...product.images[0], id: product.images[0].id.toString() } : null, shop: { id: product.shop.id.toString(), shopName: product.shop.shopName, slug: product.shop.slug } })),
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async listOwnedShopCategories(user: AuthenticatedUser) {
    const shop = await this.requireOwnedApprovedShop(user);
    const rows = await this.prisma.shopCategory.findMany({ where: { shopId: shop.id }, orderBy: [{ sortOrder: 'asc' }, { categoryName: 'asc' }], include: { categoryProducts: { select: { productId: true } } } });
    return rows.map((row) => this.toShopCategoryResponse(row));
  }

  async createOwnedShopCategory(user: AuthenticatedUser, dto: UpsertShopCategoryDto) {
    const shop = await this.requireOwnedApprovedShop(user);
    await this.assertParentCategory(shop.id, dto.parentShopCategoryId);
    const row = await this.prisma.shopCategory.create({ data: { shopId: shop.id, categoryName: dto.categoryName, slug: await this.uniqueShopCategorySlug(shop.id, dto.categoryName), parentShopCategoryId: dto.parentShopCategoryId ? BigInt(dto.parentShopCategoryId) : null, description: this.normalizeNullableText(dto.description), sortOrder: dto.sortOrder ?? 0, isActive: dto.isActive ?? true }, include: { categoryProducts: { select: { productId: true } } } });
    return this.toShopCategoryResponse(row);
  }

  async updateOwnedShopCategory(user: AuthenticatedUser, id: string, dto: UpsertShopCategoryDto) {
    const shop = await this.requireOwnedApprovedShop(user); const categoryId = this.parseShopId(id);
    await this.requireOwnedCategory(shop.id, categoryId); await this.assertParentCategory(shop.id, dto.parentShopCategoryId, categoryId);
    const row = await this.prisma.shopCategory.update({ where: { id: categoryId }, data: { categoryName: dto.categoryName, parentShopCategoryId: dto.parentShopCategoryId ? BigInt(dto.parentShopCategoryId) : null, description: this.normalizeNullableText(dto.description), sortOrder: dto.sortOrder, isActive: dto.isActive, updatedAt: new Date() }, include: { categoryProducts: { select: { productId: true } } } });
    return this.toShopCategoryResponse(row);
  }

  async assignOwnedShopCategoryProducts(user: AuthenticatedUser, id: string, productIds: string[]) {
    const shop = await this.requireOwnedApprovedShop(user); const categoryId = this.parseShopId(id); await this.requireOwnedCategory(shop.id, categoryId);
    const ids = productIds.map((value) => this.parseShopId(value));
    const count = await this.prisma.product.count({ where: { id: { in: ids }, shopId: shop.id, isDeleted: false } });
    if (count !== ids.length) throw new BadRequestException({ code: 'SHOP_CATEGORY_PRODUCT_INVALID', message: 'Một hoặc nhiều sản phẩm không thuộc gian hàng.' });
    await this.prisma.$transaction(async (tx) => { await tx.shopCategoryProduct.deleteMany({ where: { shopCategoryId: categoryId } }); if (ids.length) await tx.shopCategoryProduct.createMany({ data: ids.map((productId, sortOrder) => ({ shopCategoryId: categoryId, productId, sortOrder })) }); });
    return this.listOwnedShopCategories(user);
  }

  async deleteOwnedShopCategory(user: AuthenticatedUser, id: string) {
    const shop = await this.requireOwnedApprovedShop(user); const categoryId = this.parseShopId(id); await this.requireOwnedCategory(shop.id, categoryId);
    await this.prisma.shopCategory.delete({ where: { id: categoryId } }); return { success: true };
  }

  private async requireOwnedApprovedShop(user: AuthenticatedUser) {
    const shop = await this.prisma.shop.findFirst({ where: { ownerUserId: user.id, shopStatus: SHOP_STATUS_APPROVED, isDeleted: false }, select: { id: true } });
    if (!shop) throw new NotFoundException({ code: 'SHOP_NOT_FOUND', message: 'Không tìm thấy gian hàng đã được duyệt.' }); return shop;
  }
  private async requireOwnedCategory(shopId: bigint, id: bigint) { const row = await this.prisma.shopCategory.findFirst({ where: { id, shopId } }); if (!row) throw new NotFoundException({ code: 'SHOP_CATEGORY_NOT_FOUND', message: 'Không tìm thấy danh mục của gian hàng.' }); return row; }
  private async assertParentCategory(shopId: bigint, parentId?: string, selfId?: bigint) { if (!parentId) return; const id = this.parseShopId(parentId); if (id === selfId) throw new BadRequestException({ code: 'SHOP_CATEGORY_PARENT_INVALID', message: 'Danh mục không thể là cha của chính nó.' }); await this.requireOwnedCategory(shopId, id); }
  private async uniqueShopCategorySlug(shopId: bigint, name: string) { const base = this.slugify(name); if (!base) throw new BadRequestException({ code: 'SHOP_CATEGORY_NAME_INVALID', message: 'Tên danh mục không hợp lệ.' }); let slug = base; let suffix = 2; while (await this.prisma.shopCategory.findUnique({ where: { shopId_slug: { shopId, slug } }, select: { id: true } })) slug = `${base}-${suffix++}`; return slug; }
  private toShopCategoryResponse(row: { id: bigint; parentShopCategoryId: bigint | null; categoryName: string; slug: string; description: string | null; sortOrder: number; isActive: boolean; categoryProducts: Array<{ productId: bigint }> }) { return { id: row.id.toString(), idString: row.id.toString(), parentShopCategoryId: row.parentShopCategoryId?.toString() ?? null, categoryName: row.categoryName, slug: row.slug, description: row.description, sortOrder: row.sortOrder, isActive: row.isActive, productIds: row.categoryProducts.map((item) => item.productId.toString()) }; }

  async approveShop(
    user: AuthenticatedUser,
    shopId: string,
  ): Promise<ShopResponse> {
    const id = this.parseShopId(shopId);
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: {
        sellerVerification: { select: { verificationStatus: true } },
        payoutAccount: { select: { payoutStatus: true, isActive: true } },
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
        VerificationStatus.Approved ||
      shop.payoutAccount?.payoutStatus !== PayoutStatus.Verified ||
      !shop.payoutAccount.isActive
    ) {
      throw new BadRequestException({
        code: 'SHOP_SELLER_VERIFICATION_REQUIRED',
        message:
          'Chỉ có thể duyệt gian hàng khi hồ sơ người bán và tài khoản nhận tiền đã được xác minh.',
        details: [
          {
            field: 'sellerVerification',
            verificationStatus:
              shop.sellerVerification?.verificationStatus ?? null,
            payoutStatus: shop.payoutAccount?.payoutStatus ?? null,
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
