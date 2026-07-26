import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { createPaginatedResult } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types';
import { ActiveShippingServiceQueryDto } from './dto/active-shipping-service-query.dto';
import { CreateShippingCompanyDto } from './dto/create-shipping-company.dto';
import { CreateShippingQuoteDto } from './dto/create-shipping-quote.dto';
import { CreateShippingServiceDto } from './dto/create-shipping-service.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { ShippingServiceQueryDto } from './dto/shipping-service-query.dto';
import { UpdateShippingCompanyDto } from './dto/update-shipping-company.dto';
import { UpdateShippingServiceDto } from './dto/update-shipping-service.dto';
import { UpdateShipmentTrackingDto } from './dto/update-shipment-tracking.dto';
import {
  DeactivateShippingServiceResponse,
  DeleteShippingCompanyResponse,
  ShippingCompanyResponse,
  ShippingQuoteResponse,
  ShippingServiceResponse,
  ShipmentItemResponse,
  ShipmentResponse,
} from './types';

const SHIPPING_COMPANY_STATUS_APPROVED = 'Approved';
const SHIPPING_COMPANY_STATUS_INACTIVE = 'Inactive';
const PUBLIC_SHOP_STATUS_APPROVED = 'Approved';
const SHIPPING_QUOTE_TTL_MS = 30 * 60 * 1000;
const SHOP_ORDER_STATUS_PREPARED = 'Prepared';
const SHOP_ORDER_STATUS_SHIPPING = 'Shipping';
const SHOP_ORDER_STATUS_DELIVERED = 'Delivered';
const SHOP_ORDER_STATUS_COMPLETED = 'Completed';
const ORDER_STATUS_SHIPPING = 'Shipping';
const ORDER_STATUS_DELIVERED = 'Delivered';
const ORDER_STATUS_COMPLETED = 'Completed';
const SHIPMENT_STATUS_PENDING = 'Pending';
const SHIPMENT_STATUS_PICKED_UP = 'PickedUp';
const SHIPMENT_STATUS_IN_TRANSIT = 'InTransit';
const SHIPMENT_STATUS_DELIVERED = 'Delivered';
const PARENT_ORDER_PRE_SHIPPING_STATUSES = [
  'Created',
  'WaitingForSeller',
  'Confirmed',
  'Prepared',
] as const;
const PARENT_ORDER_PRE_DELIVERED_STATUSES = [
  'Created',
  'WaitingForSeller',
  'Confirmed',
  'Prepared',
  'Shipping',
] as const;
const SHIPMENT_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  [SHIPMENT_STATUS_PENDING]: [
    SHIPMENT_STATUS_PICKED_UP,
    SHIPMENT_STATUS_IN_TRANSIT,
  ],
  [SHIPMENT_STATUS_PICKED_UP]: [
    SHIPMENT_STATUS_IN_TRANSIT,
    SHIPMENT_STATUS_DELIVERED,
  ],
  [SHIPMENT_STATUS_IN_TRANSIT]: [SHIPMENT_STATUS_DELIVERED],
  [SHIPMENT_STATUS_DELIVERED]: [],
};
const INVENTORY_TRANSACTION_COMPLETE_ORDER = 'COMPLETE_ORDER';
const INVENTORY_REFERENCE_TYPE_ORDER_ITEM = 'ORDER_ITEM';

type ShippingCompanyEntity = {
  id: bigint;
  ownerUserId: bigint;
  code: string;
  companyName: string;
  slug: string;
  email: string | null;
  phoneNumber: string | null;
  taxCode: string | null;
  addressText: string | null;
  companyStatus: string;
  approvedByUserId: bigint | null;
  approvedAt: Date | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
};

type ShippingServiceEntity = {
  id: bigint;
  shippingCompanyId: bigint;
  serviceCode: string;
  serviceName: string;
  baseFee: { toString(): string };
  feePerKg: { toString(): string };
  estimatedMinDays: number;
  estimatedMaxDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date | null;
};

type ShippingQuoteShopEntity = {
  id: bigint;
  shopName: string;
  slug: string;
  shopStatus: string;
  isDeleted: boolean;
};

type ShippingServiceWithCompanyEntity = ShippingServiceEntity & {
  shippingCompany: ShippingCompanyEntity;
};

type ShippingQuoteEntity = {
  id: bigint;
  shopId: bigint;
  shippingCompanyId: bigint;
  shippingServiceId: bigint;
  destinationProvince: string;
  totalWeightGram: number;
  quotedFee: { toString(): string };
  estimatedMinDays: number;
  estimatedMaxDays: number;
  expiresAt: Date;
  createdAt: Date;
};

const createShipmentShopOrderInclude = {
  shop: {
    select: {
      id: true,
      ownerUserId: true,
      isDeleted: true,
    },
  },
  order: {
    select: {
      id: true,
      orderStatus: true,
      receiverName: true,
      receiverPhone: true,
      shippingProvince: true,
      shippingWard: true,
      shippingStreetAddress: true,
    },
  },
  items: {
    orderBy: [{ createdAt: 'asc' }],
    include: {
      productVariant: {
        select: {
          weightGram: true,
        },
      },
    },
  },
} satisfies Prisma.ShopOrderInclude;

type CreateShipmentShopOrderEntity = Prisma.ShopOrderGetPayload<{
  include: typeof createShipmentShopOrderInclude;
}>;

const updateShipmentTrackingInclude = {
  shopOrder: {
    include: {
      shop: {
        select: {
          id: true,
          ownerUserId: true,
          isDeleted: true,
        },
      },
      order: {
        select: {
          id: true,
          orderStatus: true,
        },
      },
    },
  },
  shippingService: {
    include: {
      shippingCompany: true,
    },
  },
  items: {
    orderBy: [{ createdAt: 'asc' }],
  },
} satisfies Prisma.ShipmentInclude;

type UpdateShipmentTrackingEntity = Prisma.ShipmentGetPayload<{
  include: typeof updateShipmentTrackingInclude;
}>;

type ShipmentEntity = {
  id: bigint;
  shopOrderId: bigint;
  shippingCompanyId: bigint;
  shippingServiceId: bigint;
  shipmentCode: string;
  trackingNumber: string | null;
  shipmentStatus: string;
  shippingFee: { toString(): string };
  codAmount: { toString(): string };
  pickupAddress: string | null;
  deliveryAddress: string;
  recipientName: string;
  recipientPhone: string;
  expectedDeliveryAt: Date | null;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
};

type ShipmentItemEntity = {
  id: bigint;
  shipmentId: bigint;
  orderItemId: bigint;
  quantity: number;
  createdAt: Date;
};

@Injectable()
export class ShippingService {
  constructor(private readonly prisma: PrismaService) {}

  async listShippingCompanies(query: PaginationQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;
    const where = { isDeleted: false };

    const [companies, total] = await Promise.all([
      this.prisma.shippingCompany.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { companyName: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.shippingCompany.count({ where }),
    ]);

    return createPaginatedResult({
      items: companies.map((company) =>
        this.toShippingCompanyResponse(company),
      ),
      page,
      limit,
      total,
      message: 'Shipping companies retrieved successfully',
    });
  }

  async getShippingCompany(
    shippingCompanyId: string,
  ): Promise<ShippingCompanyResponse> {
    const id = this.parseShippingCompanyId(shippingCompanyId);
    const company = await this.requireShippingCompany(id);

    return this.toShippingCompanyResponse(company);
  }

  async createShippingCompany(
    user: AuthenticatedUser,
    dto: CreateShippingCompanyDto,
  ): Promise<ShippingCompanyResponse> {
    await this.ensureSlugAvailable(dto.slug);

    const now = new Date();
    const companyStatus = dto.companyStatus ?? SHIPPING_COMPANY_STATUS_APPROVED;
    const approvedByUserId =
      companyStatus === SHIPPING_COMPANY_STATUS_APPROVED ? user.id : null;
    const approvedAt =
      companyStatus === SHIPPING_COMPANY_STATUS_APPROVED ? now : null;
    const company = await this.prisma.shippingCompany.create({
      data: {
        ownerUserId: user.id,
        companyName: dto.companyName,
        slug: dto.slug,
        email: this.normalizeNullableText(dto.email),
        phoneNumber: this.normalizeNullableText(dto.phoneNumber),
        taxCode: this.normalizeNullableText(dto.taxCode),
        addressText: this.normalizeNullableText(dto.addressText),
        companyStatus,
        approvedByUserId,
        approvedAt,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      },
    });

    return this.toShippingCompanyResponse(company);
  }

  async updateShippingCompany(
    user: AuthenticatedUser,
    shippingCompanyId: string,
    dto: UpdateShippingCompanyDto,
  ): Promise<ShippingCompanyResponse> {
    const id = this.parseShippingCompanyId(shippingCompanyId);
    const company = await this.requireShippingCompany(id);
    const data = await this.buildUpdateData(user, company, dto);

    if (Object.keys(data).length === 0) {
      return this.toShippingCompanyResponse(company);
    }

    const updatedCompany = await this.prisma.shippingCompany.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return this.toShippingCompanyResponse(updatedCompany);
  }

  async deleteShippingCompany(
    shippingCompanyId: string,
  ): Promise<DeleteShippingCompanyResponse> {
    const id = this.parseShippingCompanyId(shippingCompanyId);
    await this.requireShippingCompany(id);

    const now = new Date();
    await this.prisma.shippingCompany.update({
      where: { id },
      data: {
        companyStatus: SHIPPING_COMPANY_STATUS_INACTIVE,
        isDeleted: true,
        deletedAt: now,
        updatedAt: now,
      },
    });

    return {
      id: id.toString(),
      deleted: true,
    };
  }

  async listShippingServices(query: ShippingServiceQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;
    const shippingCompanyId = query.shippingCompanyId
      ? this.parseShippingCompanyId(query.shippingCompanyId)
      : undefined;
    const where = shippingCompanyId === undefined ? {} : { shippingCompanyId };

    const [services, total] = await Promise.all([
      this.prisma.shippingService.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { serviceName: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.shippingService.count({ where }),
    ]);

    return createPaginatedResult({
      items: services.map((service) => this.toShippingServiceResponse(service)),
      page,
      limit,
      total,
      message: 'Shipping services retrieved successfully',
    });
  }

  async listActiveShippingServices(query: ActiveShippingServiceQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;
    const where: Prisma.ShippingServiceWhereInput = {
      isActive: true,
      shippingCompany: {
        companyStatus: SHIPPING_COMPANY_STATUS_APPROVED,
        isDeleted: false,
      },
    };

    if (query.shopId) {
      await this.requireQuotableShop(this.parseShopId(query.shopId));
    }

    const [services, total] = await Promise.all([
      this.prisma.shippingService.findMany({
        where,
        include: {
          shippingCompany: true,
        },
        orderBy: [{ serviceName: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.shippingService.count({ where }),
    ]);

    return createPaginatedResult({
      items: services.map((service) => this.toShippingServiceResponse(service)),
      page,
      limit,
      total,
      message: 'Active shipping services retrieved successfully',
    });
  }

  async getShippingService(
    shippingServiceId: string,
  ): Promise<ShippingServiceResponse> {
    const id = this.parseShippingServiceId(shippingServiceId);
    const service = await this.requireShippingService(id);

    return this.toShippingServiceResponse(service);
  }

  async createShippingService(
    dto: CreateShippingServiceDto,
  ): Promise<ShippingServiceResponse> {
    const shippingCompanyId = this.parseShippingCompanyId(
      dto.shippingCompanyId,
    );
    await this.requireApprovedShippingCompany(shippingCompanyId);
    await this.ensureServiceCodeAvailable(shippingCompanyId, dto.serviceCode);

    const estimatedMinDays = dto.estimatedMinDays ?? 1;
    const estimatedMaxDays = dto.estimatedMaxDays ?? 3;
    this.ensureValidEstimatedDays(estimatedMinDays, estimatedMaxDays);

    const now = new Date();
    const service = await this.prisma.shippingService.create({
      data: {
        shippingCompanyId,
        serviceCode: dto.serviceCode,
        serviceName: dto.serviceName,
        baseFee: dto.baseFee,
        feePerKg: dto.feePerKg ?? '0',
        estimatedMinDays,
        estimatedMaxDays,
        isActive: dto.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      },
    });

    return this.toShippingServiceResponse(service);
  }

  async updateShippingService(
    shippingServiceId: string,
    dto: UpdateShippingServiceDto,
  ): Promise<ShippingServiceResponse> {
    const id = this.parseShippingServiceId(shippingServiceId);
    const service = await this.requireShippingService(id);
    const data = await this.buildShippingServiceUpdateData(service, dto);

    if (Object.keys(data).length === 0) {
      return this.toShippingServiceResponse(service);
    }

    const updatedService = await this.prisma.shippingService.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return this.toShippingServiceResponse(updatedService);
  }

  async deactivateShippingService(
    shippingServiceId: string,
  ): Promise<DeactivateShippingServiceResponse> {
    const id = this.parseShippingServiceId(shippingServiceId);
    await this.requireShippingService(id);

    await this.prisma.shippingService.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return {
      id: id.toString(),
      deactivated: true,
    };
  }

  async createShippingQuote(
    dto: CreateShippingQuoteDto,
  ): Promise<ShippingQuoteResponse> {
    const shopId = this.parseShopId(dto.shopId);
    const shippingServiceId = this.parseShippingServiceId(
      dto.shippingServiceId,
    );
    const [shop, service] = await Promise.all([
      this.requireQuotableShop(shopId),
      this.requireQuotableShippingService(shippingServiceId),
    ]);
    const quotedFee = this.calculateShippingFee(service, dto.totalWeightGram);
    const now = new Date();
    const quote = await this.prisma.shippingQuote.create({
      data: {
        shopId: shop.id,
        shippingCompanyId: service.shippingCompanyId,
        shippingServiceId: service.id,
        destinationProvince: dto.destinationProvince,
        totalWeightGram: dto.totalWeightGram,
        quotedFee,
        estimatedMinDays: service.estimatedMinDays,
        estimatedMaxDays: service.estimatedMaxDays,
        expiresAt: new Date(now.getTime() + SHIPPING_QUOTE_TTL_MS),
        createdAt: now,
      },
    });

    return this.toShippingQuoteResponse(quote, shop, service);
  }

  async createSellerShipment(
    user: AuthenticatedUser,
    shopOrderId: string,
    dto: CreateShipmentDto,
  ): Promise<ShipmentResponse> {
    const id = this.parseShopOrderId(shopOrderId);
    const shippingServiceId = this.parseShippingServiceId(
      dto.shippingServiceId,
    );
    const shippingQuoteId = dto.shippingQuoteId
      ? this.parseShippingQuoteId(dto.shippingQuoteId)
      : null;

    return this.prisma.$transaction(async (tx) => {
      const shopOrder = await tx.shopOrder.findFirst({
        where: {
          id,
          shop: {
            ownerUserId: user.id,
            isDeleted: false,
          },
        },
        include: createShipmentShopOrderInclude,
      });

      if (!shopOrder) {
        throw new NotFoundException({
          code: 'SHOP_ORDER_NOT_FOUND',
          message: 'Shop order not found',
          details: [{ field: 'shopOrderId' }],
        });
      }

      if (shopOrder.orderStatus !== SHOP_ORDER_STATUS_PREPARED) {
        throw new BadRequestException({
          code: 'SHOP_ORDER_INVALID_STATUS',
          message: 'Only prepared shop orders can create shipments',
          details: [
            {
              field: 'orderStatus',
              currentStatus: shopOrder.orderStatus,
              allowedStatus: SHOP_ORDER_STATUS_PREPARED,
            },
          ],
        });
      }

      if (shopOrder.items.length === 0) {
        throw new BadRequestException({
          code: 'SHOP_ORDER_HAS_NO_ITEMS',
          message: 'Shop order has no items to ship',
          details: [{ field: 'shopOrderId' }],
        });
      }

      const existingShipmentCount = await tx.shipment.count({
        where: { shopOrderId: shopOrder.id },
      });

      if (existingShipmentCount > 0) {
        throw new BadRequestException({
          code: 'SHOP_ORDER_SHIPMENT_EXISTS',
          message: 'Shipment already exists for this shop order',
          details: [{ field: 'shopOrderId' }],
        });
      }

      const service = await this.requireShipmentShippingService(
        tx,
        shippingServiceId,
      );
      const now = new Date();
      const shippingFee = shippingQuoteId
        ? await this.requireShipmentQuoteFee(
            tx,
            shippingQuoteId,
            shopOrder,
            service,
            now,
          )
        : this.calculateShippingFee(
            service,
            this.calculateShopOrderWeightGram(shopOrder),
          );
      const shipment = await tx.shipment.create({
        data: {
          shopOrderId: shopOrder.id,
          shippingCompanyId: service.shippingCompanyId,
          shippingServiceId: service.id,
          shipmentCode: this.createBusinessCode('SHP', now),
          trackingNumber: this.normalizeNullableText(dto.trackingNumber),
          shipmentStatus: SHIPMENT_STATUS_PENDING,
          shippingFee,
          codAmount: new Prisma.Decimal(0),
          pickupAddress: this.normalizeNullableText(dto.pickupAddress),
          deliveryAddress: this.buildDeliveryAddress(shopOrder),
          recipientName: shopOrder.order.receiverName,
          recipientPhone: shopOrder.order.receiverPhone,
          expectedDeliveryAt: dto.expectedDeliveryAt
            ? new Date(dto.expectedDeliveryAt)
            : null,
          createdAt: now,
          updatedAt: now,
        },
      });
      const shipmentItems: ShipmentItemEntity[] = [];

      for (const item of shopOrder.items) {
        const shipmentItem = await tx.shipmentItem.create({
          data: {
            shipmentId: shipment.id,
            orderItemId: item.id,
            quantity: item.quantity,
            createdAt: now,
          },
        });
        shipmentItems.push(shipmentItem);
      }

      await tx.shipmentTrackingHistory.create({
        data: {
          shipmentId: shipment.id,
          fromStatus: null,
          toStatus: SHIPMENT_STATUS_PENDING,
          note: this.normalizeNullableText(dto.note) ?? 'Shipment created',
          updatedByUserId: user.id,
          createdAt: now,
        },
      });

      await tx.shopOrder.update({
        where: { id: shopOrder.id },
        data: {
          shippingCompanyId: service.shippingCompanyId,
          shippingServiceId: service.id,
          shippingQuoteId,
          shippingFeeAmount: shippingFee,
          orderStatus: SHOP_ORDER_STATUS_SHIPPING,
          updatedAt: now,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          shopOrderId: shopOrder.id,
          fromStatus: shopOrder.orderStatus,
          toStatus: SHOP_ORDER_STATUS_SHIPPING,
          changedByUserId: user.id,
          reason: 'Shipment created',
          createdAt: now,
        },
      });

      await this.updateParentOrderStatusAfterShipmentCreate(
        tx,
        user,
        shopOrder.orderId,
        now,
      );

      return this.toShipmentResponse(shipment, service, shipmentItems);
    });
  }

  async updateSellerShipmentTracking(
    user: AuthenticatedUser,
    shopOrderId: string,
    shipmentId: string,
    dto: UpdateShipmentTrackingDto,
  ): Promise<ShipmentResponse> {
    const parsedShopOrderId = this.parseShopOrderId(shopOrderId);
    const parsedShipmentId = this.parseShipmentId(shipmentId);

    return this.prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.findFirst({
        where: {
          id: parsedShipmentId,
          shopOrderId: parsedShopOrderId,
          shopOrder: {
            shop: {
              ownerUserId: user.id,
              isDeleted: false,
            },
          },
        },
        include: updateShipmentTrackingInclude,
      });

      if (!shipment) {
        throw new NotFoundException({
          code: 'SHIPMENT_NOT_FOUND',
          message: 'Shipment not found',
          details: [{ field: 'shipmentId' }],
        });
      }

      this.ensureShipmentStatusTransition(
        shipment.shipmentStatus,
        dto.shipmentStatus,
      );

      const now = new Date();
      const updateData: Prisma.ShipmentUpdateInput = {
        shipmentStatus: dto.shipmentStatus,
        updatedAt: now,
      };

      if (dto.trackingNumber !== undefined) {
        updateData.trackingNumber = this.normalizeNullableText(
          dto.trackingNumber,
        );
      }

      if (
        !shipment.pickedUpAt &&
        [
          SHIPMENT_STATUS_PICKED_UP,
          SHIPMENT_STATUS_IN_TRANSIT,
          SHIPMENT_STATUS_DELIVERED,
        ].includes(dto.shipmentStatus)
      ) {
        updateData.pickedUpAt = now;
      }

      if (dto.shipmentStatus === SHIPMENT_STATUS_DELIVERED) {
        updateData.deliveredAt = shipment.deliveredAt ?? now;
      }

      const updatedShipment = await tx.shipment.update({
        where: { id: shipment.id },
        data: updateData,
        include: updateShipmentTrackingInclude,
      });

      await tx.shipmentTrackingHistory.create({
        data: {
          shipmentId: shipment.id,
          fromStatus: shipment.shipmentStatus,
          toStatus: dto.shipmentStatus,
          locationText: this.normalizeNullableText(dto.locationText),
          note: this.normalizeNullableText(dto.note),
          updatedByUserId: user.id,
          createdAt: now,
        },
      });

      if (dto.shipmentStatus === SHIPMENT_STATUS_DELIVERED) {
        await this.updateShopOrderStatusAfterShipmentDelivered(
          tx,
          user,
          updatedShipment.shopOrder,
          now,
        );
      }

      return this.toShipmentResponse(
        updatedShipment,
        updatedShipment.shippingService,
        updatedShipment.items,
      );
    });
  }

  private async buildUpdateData(
    user: AuthenticatedUser,
    company: ShippingCompanyEntity,
    dto: UpdateShippingCompanyDto,
  ) {
    const data: {
      companyName?: string;
      slug?: string;
      email?: string | null;
      phoneNumber?: string | null;
      taxCode?: string | null;
      addressText?: string | null;
      companyStatus?: string;
      approvedByUserId?: bigint | null;
      approvedAt?: Date | null;
    } = {};

    if (dto.companyName !== undefined) {
      data.companyName = dto.companyName;
    }

    if (dto.slug !== undefined) {
      await this.ensureSlugAvailable(dto.slug, company.id);
      data.slug = dto.slug;
    }

    if (dto.email !== undefined) {
      data.email = this.normalizeNullableText(dto.email);
    }

    if (dto.phoneNumber !== undefined) {
      data.phoneNumber = this.normalizeNullableText(dto.phoneNumber);
    }

    if (dto.taxCode !== undefined) {
      data.taxCode = this.normalizeNullableText(dto.taxCode);
    }

    if (dto.addressText !== undefined) {
      data.addressText = this.normalizeNullableText(dto.addressText);
    }

    if (dto.companyStatus !== undefined) {
      data.companyStatus = dto.companyStatus;

      if (
        dto.companyStatus === SHIPPING_COMPANY_STATUS_APPROVED &&
        company.companyStatus !== SHIPPING_COMPANY_STATUS_APPROVED
      ) {
        data.approvedByUserId = user.id;
        data.approvedAt = new Date();
      }
    }

    return data;
  }

  private async ensureSlugAvailable(
    slug: string,
    currentShippingCompanyId?: bigint,
  ): Promise<void> {
    const existingCompany = await this.prisma.shippingCompany.findUnique({
      where: { slug },
    });

    if (existingCompany && existingCompany.id !== currentShippingCompanyId) {
      throw new ConflictException({
        code: 'SHIPPING_COMPANY_SLUG_EXISTS',
        message: 'Shipping company slug already exists',
        details: [{ field: 'slug' }],
      });
    }
  }

  private async buildShippingServiceUpdateData(
    service: ShippingServiceEntity,
    dto: UpdateShippingServiceDto,
  ) {
    const data: {
      shippingCompanyId?: bigint;
      serviceCode?: string;
      serviceName?: string;
      baseFee?: string;
      feePerKg?: string;
      estimatedMinDays?: number;
      estimatedMaxDays?: number;
      isActive?: boolean;
    } = {};
    const shippingCompanyId =
      dto.shippingCompanyId !== undefined
        ? this.parseShippingCompanyId(dto.shippingCompanyId)
        : service.shippingCompanyId;
    const serviceCode = dto.serviceCode ?? service.serviceCode;

    if (dto.shippingCompanyId !== undefined) {
      await this.requireApprovedShippingCompany(shippingCompanyId);
      data.shippingCompanyId = shippingCompanyId;
    }

    if (
      dto.shippingCompanyId !== undefined ||
      (dto.serviceCode !== undefined && dto.serviceCode !== service.serviceCode)
    ) {
      await this.ensureServiceCodeAvailable(
        shippingCompanyId,
        serviceCode,
        service.id,
      );
    }

    if (dto.serviceCode !== undefined) {
      data.serviceCode = dto.serviceCode;
    }

    if (dto.serviceName !== undefined) {
      data.serviceName = dto.serviceName;
    }

    if (dto.baseFee !== undefined) {
      data.baseFee = dto.baseFee;
    }

    if (dto.feePerKg !== undefined) {
      data.feePerKg = dto.feePerKg;
    }

    const estimatedMinDays = dto.estimatedMinDays ?? service.estimatedMinDays;
    const estimatedMaxDays = dto.estimatedMaxDays ?? service.estimatedMaxDays;
    this.ensureValidEstimatedDays(estimatedMinDays, estimatedMaxDays);

    if (dto.estimatedMinDays !== undefined) {
      data.estimatedMinDays = dto.estimatedMinDays;
    }

    if (dto.estimatedMaxDays !== undefined) {
      data.estimatedMaxDays = dto.estimatedMaxDays;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    return data;
  }

  private async ensureServiceCodeAvailable(
    shippingCompanyId: bigint,
    serviceCode: string,
    currentShippingServiceId?: bigint,
  ): Promise<void> {
    const existingService = await this.prisma.shippingService.findUnique({
      where: {
        shippingCompanyId_serviceCode: {
          shippingCompanyId,
          serviceCode,
        },
      },
    });

    if (existingService && existingService.id !== currentShippingServiceId) {
      throw new ConflictException({
        code: 'SHIPPING_SERVICE_CODE_EXISTS',
        message: 'Shipping service code already exists for this company',
        details: [{ field: 'serviceCode' }],
      });
    }
  }

  private async requireApprovedShippingCompany(
    shippingCompanyId: bigint,
  ): Promise<ShippingCompanyEntity> {
    const company = await this.requireShippingCompany(shippingCompanyId);

    if (company.companyStatus !== SHIPPING_COMPANY_STATUS_APPROVED) {
      throw new BadRequestException({
        code: 'SHIPPING_COMPANY_NOT_APPROVED',
        message: 'Shipping company must be approved',
        details: [{ field: 'shippingCompanyId' }],
      });
    }

    return company;
  }

  private async requireShippingCompany(
    shippingCompanyId: bigint,
  ): Promise<ShippingCompanyEntity> {
    const company = await this.prisma.shippingCompany.findUnique({
      where: { id: shippingCompanyId },
    });

    if (!company || company.isDeleted) {
      throw new NotFoundException({
        code: 'SHIPPING_COMPANY_NOT_FOUND',
        message: 'Shipping company not found',
        details: [{ field: 'shippingCompanyId' }],
      });
    }

    return company;
  }

  private async requireShippingService(
    shippingServiceId: bigint,
  ): Promise<ShippingServiceEntity> {
    const service = await this.prisma.shippingService.findUnique({
      where: { id: shippingServiceId },
    });

    if (!service) {
      throw new NotFoundException({
        code: 'SHIPPING_SERVICE_NOT_FOUND',
        message: 'Shipping service not found',
        details: [{ field: 'shippingServiceId' }],
      });
    }

    return service;
  }

  private async requireQuotableShop(
    shopId: bigint,
  ): Promise<ShippingQuoteShopEntity> {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        shopName: true,
        slug: true,
        shopStatus: true,
        isDeleted: true,
      },
    });

    if (!shop || shop.isDeleted) {
      throw new NotFoundException({
        code: 'SHOP_NOT_FOUND',
        message: 'Shop not found',
        details: [{ field: 'shopId' }],
      });
    }

    if (shop.shopStatus !== PUBLIC_SHOP_STATUS_APPROVED) {
      throw new BadRequestException({
        code: 'SHOP_NOT_APPROVED',
        message: 'Shop is not approved for shipping quote',
        details: [{ field: 'shopId' }],
      });
    }

    return shop;
  }

  private async requireQuotableShippingService(
    shippingServiceId: bigint,
  ): Promise<ShippingServiceWithCompanyEntity> {
    const service = await this.prisma.shippingService.findUnique({
      where: { id: shippingServiceId },
      include: { shippingCompany: true },
    });

    if (!service) {
      throw new NotFoundException({
        code: 'SHIPPING_SERVICE_NOT_FOUND',
        message: 'Shipping service not found',
        details: [{ field: 'shippingServiceId' }],
      });
    }

    if (!service.isActive) {
      throw new BadRequestException({
        code: 'SHIPPING_SERVICE_NOT_ACTIVE',
        message: 'Shipping service is not active',
        details: [{ field: 'shippingServiceId' }],
      });
    }

    if (service.shippingCompany.isDeleted) {
      throw new NotFoundException({
        code: 'SHIPPING_COMPANY_NOT_FOUND',
        message: 'Shipping company not found',
        details: [{ field: 'shippingCompanyId' }],
      });
    }

    if (
      service.shippingCompany.companyStatus !== SHIPPING_COMPANY_STATUS_APPROVED
    ) {
      throw new BadRequestException({
        code: 'SHIPPING_COMPANY_NOT_APPROVED',
        message: 'Shipping company must be approved',
        details: [{ field: 'shippingCompanyId' }],
      });
    }

    return service;
  }

  private async requireShipmentShippingService(
    client: Prisma.TransactionClient,
    shippingServiceId: bigint,
  ): Promise<ShippingServiceWithCompanyEntity> {
    const service = await client.shippingService.findUnique({
      where: { id: shippingServiceId },
      include: { shippingCompany: true },
    });

    if (!service) {
      throw new NotFoundException({
        code: 'SHIPPING_SERVICE_NOT_FOUND',
        message: 'Shipping service not found',
        details: [{ field: 'shippingServiceId' }],
      });
    }

    if (!service.isActive) {
      throw new BadRequestException({
        code: 'SHIPPING_SERVICE_NOT_ACTIVE',
        message: 'Shipping service is not active',
        details: [{ field: 'shippingServiceId' }],
      });
    }

    if (service.shippingCompany.isDeleted) {
      throw new NotFoundException({
        code: 'SHIPPING_COMPANY_NOT_FOUND',
        message: 'Shipping company not found',
        details: [{ field: 'shippingCompanyId' }],
      });
    }

    if (
      service.shippingCompany.companyStatus !== SHIPPING_COMPANY_STATUS_APPROVED
    ) {
      throw new BadRequestException({
        code: 'SHIPPING_COMPANY_NOT_APPROVED',
        message: 'Shipping company must be approved',
        details: [{ field: 'shippingCompanyId' }],
      });
    }

    return service;
  }

  private async requireShipmentQuoteFee(
    client: Prisma.TransactionClient,
    shippingQuoteId: bigint,
    shopOrder: CreateShipmentShopOrderEntity,
    service: ShippingServiceWithCompanyEntity,
    now: Date,
  ): Promise<Prisma.Decimal> {
    const quote = await client.shippingQuote.findUnique({
      where: { id: shippingQuoteId },
    });

    if (!quote) {
      throw new NotFoundException({
        code: 'SHIPPING_QUOTE_NOT_FOUND',
        message: 'Shipping quote not found',
        details: [{ field: 'shippingQuoteId' }],
      });
    }

    if (
      quote.shopId !== shopOrder.shopId ||
      quote.shippingServiceId !== service.id ||
      quote.shippingCompanyId !== service.shippingCompanyId
    ) {
      throw new BadRequestException({
        code: 'SHIPPING_QUOTE_MISMATCH',
        message: 'Shipping quote does not match this shop order',
        details: [{ field: 'shippingQuoteId' }],
      });
    }

    if (quote.expiresAt <= now) {
      throw new BadRequestException({
        code: 'SHIPPING_QUOTE_EXPIRED',
        message: 'Shipping quote has expired',
        details: [{ field: 'shippingQuoteId' }],
      });
    }

    return new Prisma.Decimal(quote.quotedFee.toString());
  }

  private parseShippingCompanyId(value: string): bigint {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException({
        code: 'INVALID_SHIPPING_COMPANY_ID',
        message: 'Shipping company id is invalid',
        details: [{ field: 'shippingCompanyId' }],
      });
    }

    return BigInt(value);
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

  private parseShopOrderId(value: string): bigint {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException({
        code: 'INVALID_SHOP_ORDER_ID',
        message: 'Shop order id is invalid',
        details: [{ field: 'shopOrderId' }],
      });
    }

    return BigInt(value);
  }

  private parseShippingServiceId(value: string): bigint {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException({
        code: 'INVALID_SHIPPING_SERVICE_ID',
        message: 'Shipping service id is invalid',
        details: [{ field: 'shippingServiceId' }],
      });
    }

    return BigInt(value);
  }

  private parseShippingQuoteId(value: string): bigint {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException({
        code: 'INVALID_SHIPPING_QUOTE_ID',
        message: 'Shipping quote id is invalid',
        details: [{ field: 'shippingQuoteId' }],
      });
    }

    return BigInt(value);
  }

  private parseShipmentId(value: string): bigint {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException({
        code: 'INVALID_SHIPMENT_ID',
        message: 'Shipment id is invalid',
        details: [{ field: 'shipmentId' }],
      });
    }

    return BigInt(value);
  }

  private ensureShipmentStatusTransition(
    fromStatus: string,
    toStatus: string,
  ): void {
    const allowedStatuses = SHIPMENT_STATUS_TRANSITIONS[fromStatus] ?? [];

    if (!allowedStatuses.includes(toStatus)) {
      throw new BadRequestException({
        code: 'SHIPMENT_INVALID_STATUS_TRANSITION',
        message: 'Shipment status transition is invalid',
        details: [
          {
            field: 'shipmentStatus',
            fromStatus,
            toStatus,
            allowedStatuses,
          },
        ],
      });
    }
  }

  private ensureValidEstimatedDays(
    estimatedMinDays: number,
    estimatedMaxDays: number,
  ): void {
    if (estimatedMinDays > estimatedMaxDays) {
      throw new BadRequestException({
        code: 'SHIPPING_SERVICE_INVALID_ESTIMATE',
        message: 'Minimum estimated days cannot exceed maximum estimated days',
        details: [{ field: 'estimatedMinDays' }, { field: 'estimatedMaxDays' }],
      });
    }
  }

  private calculateShippingFee(
    service: ShippingServiceEntity,
    totalWeightGram: number,
  ): Prisma.Decimal {
    const weightKgUnits = Math.max(1, Math.ceil(totalWeightGram / 1000));

    return new Prisma.Decimal(service.baseFee.toString()).add(
      new Prisma.Decimal(service.feePerKg.toString()).mul(weightKgUnits),
    );
  }

  private calculateShopOrderWeightGram(
    shopOrder: CreateShipmentShopOrderEntity,
  ): number {
    return shopOrder.items.reduce(
      (total, item) =>
        total + Math.max(0, item.productVariant.weightGram) * item.quantity,
      0,
    );
  }

  private buildDeliveryAddress(
    shopOrder: CreateShipmentShopOrderEntity,
  ): string {
    return [
      shopOrder.order.shippingStreetAddress,
      shopOrder.order.shippingWard,
      shopOrder.order.shippingProvince,
    ]
      .filter((part) => part.trim().length > 0)
      .join(', ');
  }

  private createBusinessCode(prefix: string, now: Date): string {
    const timestamp = [
      now.getUTCFullYear(),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      String(now.getUTCDate()).padStart(2, '0'),
      String(now.getUTCHours()).padStart(2, '0'),
      String(now.getUTCMinutes()).padStart(2, '0'),
      String(now.getUTCSeconds()).padStart(2, '0'),
    ].join('');
    const suffix = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

    return `${prefix}-${timestamp}-${suffix}`;
  }

  private async updateParentOrderStatusAfterShipmentCreate(
    client: Prisma.TransactionClient,
    user: AuthenticatedUser,
    orderId: bigint,
    now: Date,
  ): Promise<void> {
    const notShippingCount = await client.shopOrder.count({
      where: {
        orderId,
        orderStatus: { in: [...PARENT_ORDER_PRE_SHIPPING_STATUSES] },
      },
    });

    if (notShippingCount > 0) {
      return;
    }

    const order = await client.order.findUnique({
      where: { id: orderId },
      select: { orderStatus: true },
    });

    if (
      !order ||
      !PARENT_ORDER_PRE_SHIPPING_STATUSES.includes(
        order.orderStatus as (typeof PARENT_ORDER_PRE_SHIPPING_STATUSES)[number],
      )
    ) {
      return;
    }

    await client.order.update({
      where: { id: orderId },
      data: {
        orderStatus: ORDER_STATUS_SHIPPING,
        updatedAt: now,
      },
    });

    await client.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.orderStatus,
        toStatus: ORDER_STATUS_SHIPPING,
        changedByUserId: user.id,
        reason: 'All shop orders have shipments',
        createdAt: now,
      },
    });
  }

  private async updateShopOrderStatusAfterShipmentDelivered(
    client: Prisma.TransactionClient,
    user: AuthenticatedUser,
    shopOrder: UpdateShipmentTrackingEntity['shopOrder'],
    now: Date,
  ): Promise<void> {
    const notDeliveredShipmentCount = await client.shipment.count({
      where: {
        shopOrderId: shopOrder.id,
        shipmentStatus: { not: SHIPMENT_STATUS_DELIVERED },
      },
    });

    if (
      notDeliveredShipmentCount > 0 ||
      shopOrder.orderStatus !== SHOP_ORDER_STATUS_SHIPPING
    ) {
      return;
    }

    const deliveredShopOrder = await client.shopOrder.update({
      where: { id: shopOrder.id },
      data: {
        orderStatus: SHOP_ORDER_STATUS_DELIVERED,
        updatedAt: now,
      },
    });

    await client.orderStatusHistory.create({
      data: {
        shopOrderId: shopOrder.id,
        fromStatus: shopOrder.orderStatus,
        toStatus: SHOP_ORDER_STATUS_DELIVERED,
        changedByUserId: user.id,
        reason: 'Shipment delivered',
        createdAt: now,
      },
    });

    await this.completeShopOrderAfterDelivery(
      client,
      user,
      deliveredShopOrder.id,
      deliveredShopOrder.orderId,
      now,
    );
  }

  private async completeShopOrderAfterDelivery(
    client: Prisma.TransactionClient,
    user: AuthenticatedUser,
    shopOrderId: bigint,
    orderId: bigint,
    now: Date,
  ): Promise<void> {
    await this.deductReservedInventoryForCompletedShopOrder(
      client,
      user,
      shopOrderId,
      now,
    );

    await client.shopOrder.update({
      where: { id: shopOrderId },
      data: {
        orderStatus: SHOP_ORDER_STATUS_COMPLETED,
        completedAt: now,
        updatedAt: now,
      },
    });

    await client.orderStatusHistory.create({
      data: {
        shopOrderId,
        fromStatus: SHOP_ORDER_STATUS_DELIVERED,
        toStatus: SHOP_ORDER_STATUS_COMPLETED,
        changedByUserId: user.id,
        reason: 'Shop order completed after delivery',
        createdAt: now,
      },
    });

    await this.completeParentOrderIfAllShopOrdersCompleted(
      client,
      user,
      orderId,
      now,
    );
  }

  private async deductReservedInventoryForCompletedShopOrder(
    client: Prisma.TransactionClient,
    user: AuthenticatedUser,
    shopOrderId: bigint,
    now: Date,
  ): Promise<void> {
    const orderItems = await client.orderItem.findMany({
      where: {
        shopOrderId,
      },
      select: {
        id: true,
        productId: true,
        productVariantId: true,
        quantity: true,
      },
    });

    for (const item of orderItems) {
      const updateResult = await client.productInventory.updateMany({
        where: {
          productVariantId: item.productVariantId,
          quantityOnHand: { gte: item.quantity },
          quantityReserved: { gte: item.quantity },
        },
        data: {
          quantityOnHand: { decrement: item.quantity },
          quantityReserved: { decrement: item.quantity },
          updatedAt: now,
        },
      });

      if (updateResult.count !== 1) {
        const freshInventory = await client.productInventory.findUnique({
          where: { productVariantId: item.productVariantId },
        });

        throw new BadRequestException({
          code: 'INVENTORY_RESERVATION_INVALID',
          message: 'Reserved inventory is not enough to complete order',
          details: [
            {
              orderItemId: item.id.toString(),
              productVariantId: item.productVariantId.toString(),
              requestedQuantity: item.quantity,
              quantityOnHand: freshInventory?.quantityOnHand ?? 0,
              quantityReserved: freshInventory?.quantityReserved ?? 0,
            },
          ],
        });
      }

      const updatedInventory = await client.productInventory.findUnique({
        where: { productVariantId: item.productVariantId },
      });

      if (!updatedInventory) {
        throw new BadRequestException({
          code: 'INVENTORY_NOT_FOUND',
          message: 'Inventory record was not found',
          details: [
            {
              orderItemId: item.id.toString(),
              productVariantId: item.productVariantId.toString(),
            },
          ],
        });
      }

      await client.inventoryTransaction.create({
        data: {
          productInventoryId: updatedInventory.id,
          transactionType: INVENTORY_TRANSACTION_COMPLETE_ORDER,
          quantityChange: -item.quantity,
          quantityAfter: updatedInventory.quantityOnHand,
          referenceType: INVENTORY_REFERENCE_TYPE_ORDER_ITEM,
          referenceId: item.id,
          note: `Completed ${item.quantity} reserved unit(s) for delivered order`,
          createdByUserId: user.id,
          createdAt: now,
        },
      });

      await client.product.update({
        where: { id: item.productId },
        data: {
          soldCount: { increment: BigInt(item.quantity) },
          updatedAt: now,
        },
      });
    }
  }

  private async completeParentOrderIfAllShopOrdersCompleted(
    client: Prisma.TransactionClient,
    user: AuthenticatedUser,
    orderId: bigint,
    now: Date,
  ): Promise<void> {
    const incompleteShopOrderCount = await client.shopOrder.count({
      where: {
        orderId,
        orderStatus: { not: SHOP_ORDER_STATUS_COMPLETED },
      },
    });

    if (incompleteShopOrderCount > 0) {
      return;
    }

    const order = await client.order.findUnique({
      where: { id: orderId },
      select: { orderStatus: true },
    });

    if (!order || order.orderStatus === ORDER_STATUS_COMPLETED) {
      return;
    }

    let fromStatus = order.orderStatus;

    if (fromStatus !== ORDER_STATUS_DELIVERED) {
      if (
        !PARENT_ORDER_PRE_DELIVERED_STATUSES.includes(
          fromStatus as (typeof PARENT_ORDER_PRE_DELIVERED_STATUSES)[number],
        )
      ) {
        return;
      }

      await client.order.update({
        where: { id: orderId },
        data: {
          orderStatus: ORDER_STATUS_DELIVERED,
          updatedAt: now,
        },
      });

      await client.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus,
          toStatus: ORDER_STATUS_DELIVERED,
          changedByUserId: user.id,
          reason: 'All shop orders delivered',
          createdAt: now,
        },
      });

      fromStatus = ORDER_STATUS_DELIVERED;
    }

    await client.order.update({
      where: { id: orderId },
      data: {
        orderStatus: ORDER_STATUS_COMPLETED,
        completedAt: now,
        updatedAt: now,
      },
    });

    await client.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus,
        toStatus: ORDER_STATUS_COMPLETED,
        changedByUserId: user.id,
        reason: 'All shop orders completed',
        createdAt: now,
      },
    });
  }

  private normalizeNullableText(value: string | undefined): string | null {
    if (value === undefined) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private toShippingCompanyResponse(
    company: ShippingCompanyEntity,
  ): ShippingCompanyResponse {
    return {
      id: company.id.toString(),
      idString: company.id.toString(),
      ownerUserId: company.ownerUserId.toString(),
      ownerUserIdString: company.ownerUserId.toString(),
      code: company.code,
      companyName: company.companyName,
      slug: company.slug,
      email: company.email,
      phoneNumber: company.phoneNumber,
      taxCode: company.taxCode,
      addressText: company.addressText,
      companyStatus: company.companyStatus,
      approvedByUserId: company.approvedByUserId?.toString() ?? null,
      approvedByUserIdString: company.approvedByUserId?.toString() ?? null,
      approvedAt: company.approvedAt,
      isDeleted: company.isDeleted,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
      deletedAt: company.deletedAt,
    };
  }

  private toShippingServiceResponse(
    service: ShippingServiceEntity,
  ): ShippingServiceResponse {
    return {
      id: service.id.toString(),
      idString: service.id.toString(),
      shippingCompanyId: service.shippingCompanyId.toString(),
      shippingCompanyIdString: service.shippingCompanyId.toString(),
      serviceCode: service.serviceCode,
      serviceName: service.serviceName,
      baseFee: service.baseFee.toString(),
      feePerKg: service.feePerKg.toString(),
      estimatedMinDays: service.estimatedMinDays,
      estimatedMaxDays: service.estimatedMaxDays,
      isActive: service.isActive,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }

  private toShippingQuoteResponse(
    quote: ShippingQuoteEntity,
    shop: ShippingQuoteShopEntity,
    service: ShippingServiceWithCompanyEntity,
  ): ShippingQuoteResponse {
    return {
      id: quote.id.toString(),
      idString: quote.id.toString(),
      shop: {
        id: shop.id.toString(),
        idString: shop.id.toString(),
        shopName: shop.shopName,
        slug: shop.slug,
      },
      shippingCompany: {
        id: service.shippingCompany.id.toString(),
        idString: service.shippingCompany.id.toString(),
        companyName: service.shippingCompany.companyName,
        slug: service.shippingCompany.slug,
      },
      shippingService: {
        id: service.id.toString(),
        idString: service.id.toString(),
        serviceCode: service.serviceCode,
        serviceName: service.serviceName,
      },
      destinationProvince: quote.destinationProvince,
      totalWeightGram: quote.totalWeightGram,
      quotedFee: quote.quotedFee.toString(),
      estimatedMinDays: quote.estimatedMinDays,
      estimatedMaxDays: quote.estimatedMaxDays,
      expiresAt: quote.expiresAt,
      createdAt: quote.createdAt,
    };
  }

  private toShipmentResponse(
    shipment: ShipmentEntity,
    service: ShippingServiceWithCompanyEntity,
    items: ShipmentItemEntity[],
  ): ShipmentResponse {
    return {
      id: shipment.id.toString(),
      idString: shipment.id.toString(),
      shopOrderId: shipment.shopOrderId.toString(),
      shopOrderIdString: shipment.shopOrderId.toString(),
      shipmentCode: shipment.shipmentCode,
      trackingNumber: shipment.trackingNumber,
      shipmentStatus: shipment.shipmentStatus,
      shippingFee: shipment.shippingFee.toString(),
      codAmount: shipment.codAmount.toString(),
      pickupAddress: shipment.pickupAddress,
      deliveryAddress: shipment.deliveryAddress,
      recipientName: shipment.recipientName,
      recipientPhone: shipment.recipientPhone,
      expectedDeliveryAt: shipment.expectedDeliveryAt,
      pickedUpAt: shipment.pickedUpAt,
      deliveredAt: shipment.deliveredAt,
      shippingCompany: {
        id: service.shippingCompany.id.toString(),
        idString: service.shippingCompany.id.toString(),
        companyName: service.shippingCompany.companyName,
        slug: service.shippingCompany.slug,
      },
      shippingService: {
        id: service.id.toString(),
        idString: service.id.toString(),
        serviceCode: service.serviceCode,
        serviceName: service.serviceName,
      },
      items: items.map((item) => this.toShipmentItemResponse(item)),
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
    };
  }

  private toShipmentItemResponse(
    item: ShipmentItemEntity,
  ): ShipmentItemResponse {
    return {
      id: item.id.toString(),
      idString: item.id.toString(),
      orderItemId: item.orderItemId.toString(),
      orderItemIdString: item.orderItemId.toString(),
      quantity: item.quantity,
      createdAt: item.createdAt,
    };
  }
}
