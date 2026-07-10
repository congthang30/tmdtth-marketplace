import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createPaginatedResult,
  getPaginationParams,
} from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types';
import { AdminShopQueryDto } from './dto/admin-shop-query.dto';
import { CreateShopDto } from './dto/create-shop.dto';
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
        district: this.normalizeNullableText(dto.district),
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

  async approveShop(
    user: AuthenticatedUser,
    shopId: string,
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
        message: 'Only pending shops can be approved',
        details: [{ field: 'shopStatus', currentStatus: shop.shopStatus }],
      });
    }

    const now = new Date();
    const updatedShop = await this.prisma.shop.update({
      where: { id },
      data: {
        shopStatus: SHOP_STATUS_APPROVED,
        approvedByUserId: user.id,
        approvedAt: now,
        updatedAt: now,
      },
    });

    return this.toShopResponse(updatedShop);
  }

  async rejectShop(
    user: AuthenticatedUser,
    shopId: string,
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
    district: string | null;
    ward: string | null;
    streetAddress: string | null;
    taxCode: string | null;
    shopStatus: string;
    approvedByUserId: bigint | null;
    approvedAt: Date | null;
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
      district: shop.district,
      ward: shop.ward,
      streetAddress: shop.streetAddress,
      taxCode: shop.taxCode,
      shopStatus: shop.shopStatus,
      approvedByUserId: shop.approvedByUserId?.toString() ?? null,
      approvedByUserIdString: shop.approvedByUserId?.toString() ?? null,
      approvedAt: shop.approvedAt,
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
