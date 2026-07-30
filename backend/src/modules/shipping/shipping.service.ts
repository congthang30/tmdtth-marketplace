import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { createPaginatedResult } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types';
import { CarrierRegistry } from './carriers/carrier.registry';
import {
  CarrierApiError,
  CarrierNotConfiguredError,
  CarrierOrderResult,
  CarrierTrackingResult,
} from './carriers/carrier.types';
import { GhnClient } from './carriers/ghn.client';
import { ActiveShippingServiceQueryDto } from './dto/active-shipping-service-query.dto';
import { CreateShippingQuoteDto } from './dto/create-shipping-quote.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { HandoverStationsQueryDto } from './dto/handover-stations-query.dto';
import { ShippingServiceQueryDto } from './dto/shipping-service-query.dto';
import {
  HandoverStationResponse,
  ShippingQuoteResponse,
  ShippingServiceResponse,
  ShipmentItemResponse,
  ShipmentLabelResponse,
  ShipmentResponse,
} from './types';

const SHIPPING_COMPANY_STATUS_APPROVED = 'Approved';
const PUBLIC_SHOP_STATUS_APPROVED = 'Approved';
const SHIPPING_QUOTE_TTL_MS = 30 * 60 * 1000;
const SHOP_ORDER_STATUS_PREPARED = 'Prepared';
const SHOP_ORDER_STATUS_SHIPPING = 'Shipping';
const SHOP_ORDER_STATUS_DELIVERED = 'Delivered';
const SHOP_ORDER_STATUS_COMPLETED = 'Completed';
const ORDER_STATUS_SHIPPING = 'Shipping';
const ORDER_STATUS_DELIVERED = 'Delivered';
const ORDER_STATUS_COMPLETED = 'Completed';
const SHIPMENT_STATUS_REGISTERING = 'Registering';
const SHIPMENT_STATUS_SYNC_FAILED = 'SyncFailed';
const SHIPMENT_STATUS_PENDING = 'Pending';
const SHIPMENT_STATUS_PICKED_UP = 'PickedUp';
const SHIPMENT_STATUS_IN_TRANSIT = 'InTransit';
const SHIPMENT_STATUS_DELIVERED = 'Delivered';
const SHIPMENT_STATUS_FAILED = 'Failed';
const SHIPMENT_STATUS_RETURNED = 'Returned';
const SHIPMENT_STATUS_CANCELLED = 'Cancelled';
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
  [SHIPMENT_STATUS_REGISTERING]: [
    SHIPMENT_STATUS_PENDING,
    SHIPMENT_STATUS_SYNC_FAILED,
  ],
  [SHIPMENT_STATUS_SYNC_FAILED]: [
    SHIPMENT_STATUS_REGISTERING,
    SHIPMENT_STATUS_PENDING,
  ],
  [SHIPMENT_STATUS_PENDING]: [
    SHIPMENT_STATUS_PICKED_UP,
    SHIPMENT_STATUS_IN_TRANSIT,
    SHIPMENT_STATUS_DELIVERED,
    SHIPMENT_STATUS_FAILED,
    SHIPMENT_STATUS_RETURNED,
    SHIPMENT_STATUS_CANCELLED,
  ],
  [SHIPMENT_STATUS_PICKED_UP]: [
    SHIPMENT_STATUS_IN_TRANSIT,
    SHIPMENT_STATUS_DELIVERED,
    SHIPMENT_STATUS_FAILED,
    SHIPMENT_STATUS_RETURNED,
  ],
  [SHIPMENT_STATUS_IN_TRANSIT]: [
    SHIPMENT_STATUS_DELIVERED,
    SHIPMENT_STATUS_FAILED,
    SHIPMENT_STATUS_RETURNED,
  ],
  [SHIPMENT_STATUS_DELIVERED]: [],
  [SHIPMENT_STATUS_FAILED]: [SHIPMENT_STATUS_RETURNED],
  [SHIPMENT_STATUS_RETURNED]: [],
  [SHIPMENT_STATUS_CANCELLED]: [],
};
const INVENTORY_TRANSACTION_COMPLETE_ORDER = 'COMPLETE_ORDER';
const INVENTORY_REFERENCE_TYPE_ORDER_ITEM = 'ORDER_ITEM';
/** Default pickup location used when a shop has not set its own address. */
const PLATFORM_PICKUP_PROVINCE = 'Thành phố Hà Nội';
const PLATFORM_PICKUP_WARD = 'Phường Hoàn Kiếm';
const PLATFORM_PICKUP_STREET = '1 Đường Điện Biên Phủ';

type ShippingCompanyEntity = {
  id: bigint;
  provider: string;
  code: string;
  companyName: string;
  slug: string;
  email: string | null;
  phoneNumber: string | null;
  taxCode: string | null;
  addressText: string | null;
  companyStatus: string;
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
  carrierServiceCode: string;
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
  province: string | null;
  ward: string | null;
  streetAddress: string | null;
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
      shopName: true,
      phoneNumber: true,
      province: true,
      ward: true,
      streetAddress: true,
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
      paymentMethod: {
        select: { methodCode: true },
      },
    },
  },
  items: {
    orderBy: [{ createdAt: 'asc' }],
    select: {
      id: true,
      productNameSnapshot: true,
      variantNameSnapshot: true,
      skuSnapshot: true,
      unitPrice: true,
      quantity: true,
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
  shippingCompany: true,
  shippingService: true,
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
  carrierOrderCode: string | null;
  carrierStatus: string | null;
  shipmentStatus: string;
  shippingFee: { toString(): string };
  codAmount: { toString(): string };
  handoverMethod: string;
  pickupStationId: number | null;
  pickupStationName: string | null;
  pickupStationAddress: string | null;
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly carrierRegistry: CarrierRegistry,
    private readonly ghnClient: GhnClient,
  ) {}

  /**
   * Public read-only listing of the fixed carrier registry (GHN/GHTK),
   * including each carrier's live health-check status, for admins to
   * monitor connectivity and for the checkout flow to filter available
   * carriers.
   */
  async listCarrierProviders() {
    const companies = await this.prisma.shippingCompany.findMany({
      where: { isDeleted: false },
      orderBy: [{ companyName: 'asc' }],
    });

    const withHealth = companies.map((company) => {
      const client = this.carrierRegistry.getClient(company.provider);
      const isConfigured = client.isConfigured();
      return {
        id: company.id.toString(),
        idString: company.id.toString(),
        provider: company.provider,
        code: company.code,
        companyName: company.companyName,
        slug: company.slug,
        companyStatus: company.companyStatus,
        isConfigured,
      };
    });

    return {
      message: 'Carrier providers retrieved successfully',
      data: withHealth,
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

    const client = this.carrierRegistry.getClient(
      service.shippingCompany.provider,
    );

    let feeAmount: number;
    let estimatedMinDays = service.estimatedMinDays;
    let estimatedMaxDays = service.estimatedMaxDays;
    let carrierFeeRaw: string | null = null;

    try {
      const quote = await client.getQuote({
        carrierServiceCode: service.carrierServiceCode,
        from: this.resolvePlatformPickupAddress(shop),
        to: {
          provinceName: dto.destinationProvince,
          wardName: dto.destinationWard,
          streetAddress: '',
        },
        weightGram: dto.totalWeightGram,
      });
      feeAmount = quote.feeAmount;
      estimatedMinDays = quote.estimatedMinDays;
      estimatedMaxDays = quote.estimatedMaxDays;
      carrierFeeRaw = JSON.stringify(quote.raw);
    } catch (error) {
      if (error instanceof CarrierApiError) {
        throw new BadRequestException({
          code: 'CARRIER_QUOTE_FAILED',
          message: error.message,
          details: [{ provider: error.provider }],
        });
      }
      throw error;
    }

    const now = new Date();
    const quote = await this.prisma.shippingQuote.create({
      data: {
        shopId: shop.id,
        shippingCompanyId: service.shippingCompanyId,
        shippingServiceId: service.id,
        destinationProvince: dto.destinationProvince,
        totalWeightGram: dto.totalWeightGram,
        quotedFee: new Prisma.Decimal(feeAmount),
        estimatedMinDays,
        estimatedMaxDays,
        carrierFeeRaw,
        expiresAt: new Date(now.getTime() + SHIPPING_QUOTE_TTL_MS),
        createdAt: now,
      },
    });

    return this.toShippingQuoteResponse(
      quote,
      shop,
      service,
      dto.destinationWard,
    );
  }

  async createSellerShipment(
    user: AuthenticatedUser,
    shopOrderId: string,
    dto: CreateShipmentDto,
  ): Promise<ShipmentResponse> {
    const id = this.parseShopOrderId(shopOrderId);
    const existingShipment = await this.prisma.shipment.findFirst({
      where: {
        shopOrderId: id,
        shopOrder: {
          shop: { ownerUserId: user.id, isDeleted: false },
        },
      },
      include: updateShipmentTrackingInclude,
    });

    if (existingShipment) {
      if (
        existingShipment.carrierOrderCode ||
        existingShipment.shipmentStatus !== SHIPMENT_STATUS_SYNC_FAILED
      ) {
        throw new BadRequestException({
          code: 'SHOP_ORDER_SHIPMENT_EXISTS',
          message: 'Shipment already exists for this shop order',
          details: [{ field: 'shopOrderId' }],
        });
      }

      throw new BadRequestException({
        code: 'SHIPMENT_RETRY_REQUIRED',
        message: 'Retry the failed shipment instead of creating another one',
        details: [{ shipmentId: existingShipment.id.toString() }],
      });
    }

    const shopOrder = await this.prisma.shopOrder.findFirst({
      where: {
        id,
        shop: { ownerUserId: user.id, isDeleted: false },
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
        message: 'Only prepared shop orders can arrange shipment handover',
        details: [{ field: 'orderStatus' }],
      });
    }
    if (shopOrder.items.length === 0) {
      throw new BadRequestException({
        code: 'SHOP_ORDER_HAS_NO_ITEMS',
        message: 'Shop order has no items to ship',
        details: [{ field: 'shopOrderId' }],
      });
    }
    if (
      !shopOrder.shippingServiceId ||
      !shopOrder.shippingCompanyId ||
      !shopOrder.shippingQuoteId
    ) {
      throw new BadRequestException({
        code: 'SHOP_ORDER_SHIPPING_SELECTION_MISSING',
        message: 'Shop order has no committed shipping selection',
        details: [{ field: 'shopOrderId' }],
      });
    }

    const service = await this.requireShipmentShippingService(
      this.prisma,
      shopOrder.shippingServiceId,
    );
    if (service.shippingCompanyId !== shopOrder.shippingCompanyId) {
      throw new BadRequestException({
        code: 'SHOP_ORDER_SHIPPING_SELECTION_MISMATCH',
        message: 'Shipment must use the customer shipping selection',
        details: [{ field: 'shippingServiceId' }],
      });
    }

    const station =
      dto.handoverMethod === 'Dropoff'
        ? await this.requireGhnStation(shopOrder, dto.pickupStationId)
        : null;
    const now = new Date();
    const { shipment, shipmentItems } = await this.prisma.$transaction(
      async (tx) => {
        const shipment = await tx.shipment.create({
          data: {
            shopOrderId: shopOrder.id,
            shippingCompanyId: service.shippingCompanyId,
            shippingServiceId: service.id,
            shipmentCode: this.createBusinessCode('SHP', now),
            trackingNumber: null,
            shipmentStatus: SHIPMENT_STATUS_REGISTERING,
            shippingFee: new Prisma.Decimal(
              shopOrder.shippingFeeAmount.toString(),
            ),
            codAmount: new Prisma.Decimal(
              shopOrder.order.paymentMethod.methodCode === 'COD'
                ? shopOrder.totalAmount.toString()
                : 0,
            ),
            handoverMethod: dto.handoverMethod,
            pickupStationId: station?.id ?? null,
            pickupStationName: station?.name ?? null,
            pickupStationAddress: station?.address ?? null,
            pickupAddress: this.buildPickupAddress(shopOrder.shop),
            deliveryAddress: this.buildDeliveryAddress(shopOrder),
            recipientName: shopOrder.order.receiverName,
            recipientPhone: shopOrder.order.receiverPhone,
            expectedDeliveryAt: null,
            createdAt: now,
            updatedAt: now,
          },
        });
        const shipmentItems: ShipmentItemEntity[] = [];
        for (const item of shopOrder.items) {
          shipmentItems.push(
            await tx.shipmentItem.create({
              data: {
                shipmentId: shipment.id,
                orderItemId: item.id,
                quantity: item.quantity,
                createdAt: now,
              },
            }),
          );
        }
        await tx.shipmentTrackingHistory.create({
          data: {
            shipmentId: shipment.id,
            fromStatus: null,
            toStatus: SHIPMENT_STATUS_REGISTERING,
            note: 'Đang đăng ký vận đơn với GHN',
            updatedByUserId: user.id,
            createdAt: now,
          },
        });
        return { shipment, shipmentItems };
      },
    );

    try {
      const carrierOrder = await this.createCarrierOrder(
        shipment,
        service,
        shopOrder,
      );
      const finalized = await this.finalizeCarrierRegistration(
        user,
        shipment,
        shopOrder,
        carrierOrder,
      );
      return this.toShipmentResponse(finalized, service, shipmentItems);
    } catch (error) {
      await this.markCarrierRegistrationFailed(user, shipment);
      throw this.toCarrierRegistrationException(error);
    }
  }

  private async createCarrierOrder(
    shipment: ShipmentEntity,
    service: ShippingServiceWithCompanyEntity,
    shopOrder: CreateShipmentShopOrderEntity,
  ): Promise<CarrierOrderResult> {
    const client = this.carrierRegistry.getClient(
      service.shippingCompany.provider,
    );
    if (!client.isConfigured()) {
      throw new CarrierNotConfiguredError('GHN');
    }

    const from = this.resolvePlatformPickupAddress(shopOrder.shop);
    return client.createOrder({
      carrierServiceCode: service.carrierServiceCode,
      clientOrderCode: shipment.shipmentCode,
      from: {
        ...from,
        name: shopOrder.shop.shopName,
        phone: shopOrder.shop.phoneNumber ?? undefined,
      },
      to: {
        provinceName: shopOrder.order.shippingProvince,
        wardName: shopOrder.order.shippingWard,
        streetAddress: shopOrder.order.shippingStreetAddress,
      },
      recipientName: shopOrder.order.receiverName,
      recipientPhone: shopOrder.order.receiverPhone,
      weightGram: this.calculateShopOrderWeightGram(shopOrder),
      codAmount: Number(shipment.codAmount.toString()),
      items: shopOrder.items.map((item) => ({
        name: item.variantNameSnapshot
          ? `${item.productNameSnapshot} - ${item.variantNameSnapshot}`
          : item.productNameSnapshot,
        code: item.skuSnapshot ?? undefined,
        quantity: item.quantity,
        price: Number(item.unitPrice.toString()),
        weightGram: item.productVariant.weightGram,
      })),
      note: null,
      pickupStationId: shipment.pickupStationId ?? undefined,
    });
  }

  private async finalizeCarrierRegistration(
    user: AuthenticatedUser,
    shipment: ShipmentEntity,
    shopOrder: CreateShipmentShopOrderEntity,
    carrierOrder: CarrierOrderResult,
  ): Promise<ShipmentEntity> {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const updatedShipment = await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          trackingNumber: carrierOrder.carrierOrderCode,
          carrierOrderCode: carrierOrder.carrierOrderCode,
          carrierStatus: 'ready_to_pick',
          shipmentStatus: SHIPMENT_STATUS_PENDING,
          expectedDeliveryAt: carrierOrder.expectedDeliveryAt,
          updatedAt: now,
        },
      });
      await tx.shipmentTrackingHistory.create({
        data: {
          shipmentId: shipment.id,
          fromStatus: shipment.shipmentStatus,
          toStatus: SHIPMENT_STATUS_PENDING,
          note: 'GHN đã tiếp nhận vận đơn',
          updatedByUserId: user.id,
          createdAt: now,
        },
      });
      await tx.shopOrder.update({
        where: { id: shopOrder.id },
        data: { orderStatus: SHOP_ORDER_STATUS_SHIPPING, updatedAt: now },
      });
      await tx.orderStatusHistory.create({
        data: {
          shopOrderId: shopOrder.id,
          fromStatus: shopOrder.orderStatus,
          toStatus: SHOP_ORDER_STATUS_SHIPPING,
          changedByUserId: user.id,
          reason: 'Carrier accepted shipment',
          createdAt: now,
        },
      });
      await this.updateParentOrderStatusAfterShipmentCreate(
        tx,
        user,
        shopOrder.orderId,
        now,
      );
      return updatedShipment;
    });
  }

  private async markCarrierRegistrationFailed(
    user: AuthenticatedUser,
    shipment: ShipmentEntity,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          shipmentStatus: SHIPMENT_STATUS_SYNC_FAILED,
          updatedAt: now,
        },
      });
      await tx.shipmentTrackingHistory.create({
        data: {
          shipmentId: shipment.id,
          fromStatus: shipment.shipmentStatus,
          toStatus: SHIPMENT_STATUS_SYNC_FAILED,
          note: 'GHN chưa tiếp nhận vận đơn. Có thể thử đồng bộ lại.',
          updatedByUserId: user.id,
          createdAt: now,
        },
      });
    });
  }

  private toCarrierRegistrationException(error: unknown): BadRequestException {
    const message =
      error instanceof CarrierApiError ||
      error instanceof CarrierNotConfiguredError
        ? error.message
        : 'Không thể đăng ký vận đơn với GHN. Vui lòng thử lại.';
    return new BadRequestException({
      code: 'CARRIER_ORDER_CREATE_FAILED',
      message,
      details: [{ provider: 'GHN' }],
    });
  }

  async syncSellerShipment(
    user: AuthenticatedUser,
    shopOrderId: string,
    shipmentId: string,
  ): Promise<ShipmentResponse> {
    const parsedShopOrderId = this.parseShopOrderId(shopOrderId);
    const parsedShipmentId = this.parseShipmentId(shipmentId);
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        id: parsedShipmentId,
        shopOrderId: parsedShopOrderId,
        shopOrder: {
          shop: { ownerUserId: user.id, isDeleted: false },
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

    if (!shipment.carrierOrderCode) {
      if (shipment.shipmentStatus !== SHIPMENT_STATUS_SYNC_FAILED) {
        throw new BadRequestException({
          code: 'SHIPMENT_SYNC_NOT_RETRIABLE',
          message: 'Shipment registration is not retriable',
          details: [{ field: 'shipmentStatus' }],
        });
      }
      const shopOrder = await this.prisma.shopOrder.findUniqueOrThrow({
        where: { id: shipment.shopOrderId },
        include: createShipmentShopOrderInclude,
      });
      const service = {
        ...shipment.shippingService,
        shippingCompany: shipment.shippingCompany,
      };
      try {
        await this.prisma.shipment.update({
          where: { id: shipment.id },
          data: {
            shipmentStatus: SHIPMENT_STATUS_REGISTERING,
            updatedAt: new Date(),
          },
        });
        const carrierOrder = await this.createCarrierOrder(
          shipment,
          service,
          shopOrder,
        );
        await this.finalizeCarrierRegistration(
          user,
          { ...shipment, shipmentStatus: SHIPMENT_STATUS_REGISTERING },
          shopOrder,
          carrierOrder,
        );
      } catch (error) {
        await this.markCarrierRegistrationFailed(user, {
          ...shipment,
          shipmentStatus: SHIPMENT_STATUS_REGISTERING,
        });
        throw this.toCarrierRegistrationException(error);
      }
    } else {
      await this.refreshShipmentCarrierStatus(user, shipment);
    }

    const refreshed = await this.prisma.shipment.findUniqueOrThrow({
      where: { id: shipment.id },
      include: updateShipmentTrackingInclude,
    });
    return this.toShipmentResponse(
      refreshed,
      {
        ...refreshed.shippingService,
        shippingCompany: refreshed.shippingCompany,
      },
      refreshed.items,
    );
  }

  private async refreshShipmentCarrierStatus(
    user: AuthenticatedUser,
    shipment: UpdateShipmentTrackingEntity,
  ): Promise<void> {
    if (!shipment.carrierOrderCode) return;
    const client = this.carrierRegistry.getClient(
      shipment.shippingCompany.provider,
    );
    if (!client.isConfigured()) throw new CarrierNotConfiguredError('GHN');

    try {
      const tracking = await client.getOrderStatus(shipment.carrierOrderCode);
      if (tracking.status === shipment.shipmentStatus) {
        await this.prisma.shipment.update({
          where: { id: shipment.id },
          data: {
            carrierStatus: tracking.carrierStatusRaw,
            updatedAt: new Date(),
          },
        });
        return;
      }
      await this.applyCarrierTrackingUpdate(user, shipment, tracking);
    } catch (error) {
      throw new BadRequestException({
        code: 'CARRIER_STATUS_SYNC_FAILED',
        message:
          error instanceof Error
            ? error.message
            : 'Không thể đồng bộ trạng thái từ GHN.',
        details: [{ provider: 'GHN' }],
      });
    }
  }

  private async applyCarrierTrackingUpdate(
    user: AuthenticatedUser,
    shipment: UpdateShipmentTrackingEntity,
    tracking: CarrierTrackingResult,
  ): Promise<void> {
    this.ensureShipmentStatusTransition(
      shipment.shipmentStatus,
      tracking.status,
    );

    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const updateData: Prisma.ShipmentUpdateInput = {
        shipmentStatus: tracking.status,
        carrierStatus: tracking.carrierStatusRaw,
        updatedAt: now,
      };
      if (
        !shipment.pickedUpAt &&
        [
          SHIPMENT_STATUS_PICKED_UP,
          SHIPMENT_STATUS_IN_TRANSIT,
          SHIPMENT_STATUS_DELIVERED,
        ].includes(tracking.status)
      ) {
        updateData.pickedUpAt = now;
      }
      if (tracking.status === SHIPMENT_STATUS_DELIVERED) {
        updateData.deliveredAt =
          tracking.deliveredAt ?? shipment.deliveredAt ?? now;
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
          toStatus: tracking.status,
          note: `Đồng bộ trạng thái từ GHN: ${tracking.carrierStatusRaw}`,
          updatedByUserId: user.id,
          createdAt: now,
        },
      });
      if (tracking.status === SHIPMENT_STATUS_DELIVERED) {
        await this.updateShopOrderStatusAfterShipmentDelivered(
          tx,
          user,
          updatedShipment.shopOrder,
          now,
        );
      } else if (
        tracking.status === SHIPMENT_STATUS_CANCELLED ||
        tracking.status === SHIPMENT_STATUS_RETURNED
      ) {
        await this.returnShipmentInventory(tx, user, updatedShipment, now);
      }
    });
  }

  async listSellerHandoverStations(
    user: AuthenticatedUser,
    shopOrderId: string,
    query: HandoverStationsQueryDto,
  ): Promise<{ items: HandoverStationResponse[] }> {
    if (query.handoverMethod === 'Pickup') return { items: [] };
    const shopOrder = await this.requireSellerPreparedShopOrder(
      user,
      this.parseShopOrderId(shopOrderId),
    );
    if (!this.ghnClient.isConfigured()) {
      throw this.toCarrierRegistrationException(
        new CarrierNotConfiguredError('GHN'),
      );
    }
    const pickup = this.resolvePlatformPickupAddress(shopOrder.shop);
    try {
      return {
        items: await this.ghnClient.getStations(
          pickup.provinceName,
          pickup.wardName,
        ),
      };
    } catch (error) {
      throw this.toCarrierRegistrationException(error);
    }
  }

  async getSellerShipmentLabel(
    user: AuthenticatedUser,
    shopOrderId: string,
    shipmentId: string,
  ): Promise<ShipmentLabelResponse> {
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        id: this.parseShipmentId(shipmentId),
        shopOrderId: this.parseShopOrderId(shopOrderId),
        shopOrder: {
          shop: { ownerUserId: user.id, isDeleted: false },
        },
      },
      select: { carrierOrderCode: true },
    });
    if (!shipment) {
      throw new NotFoundException({
        code: 'SHIPMENT_NOT_FOUND',
        message: 'Shipment not found',
        details: [{ field: 'shipmentId' }],
      });
    }
    if (!shipment.carrierOrderCode) {
      throw new BadRequestException({
        code: 'SHIPMENT_LABEL_NOT_READY',
        message: 'Carrier has not issued a shipment code yet',
        details: [{ field: 'carrierOrderCode' }],
      });
    }
    try {
      const printUrl = await this.ghnClient.getA5PrintUrl(
        shipment.carrierOrderCode,
      );
      return {
        printUrl,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      };
    } catch (error) {
      throw new BadRequestException({
        code: 'SHIPMENT_LABEL_CREATE_FAILED',
        message:
          error instanceof Error
            ? error.message
            : 'Không thể tạo nhãn GHN. Vui lòng thử lại.',
        details: [{ provider: 'GHN' }],
      });
    }
  }

  /**
   * Resolves the pickup address to send to the carrier for a given shop.
   * Falls back to a platform-level default pickup address when the shop
   * has not configured its own address (province/ward/streetAddress are
   * all optional on the Shop model).
   */
  private resolvePlatformPickupAddress(shop: {
    province: string | null;
    ward: string | null;
    streetAddress: string | null;
  }) {
    return {
      provinceName: shop.province ?? PLATFORM_PICKUP_PROVINCE,
      wardName: shop.ward ?? PLATFORM_PICKUP_WARD,
      streetAddress: shop.streetAddress ?? PLATFORM_PICKUP_STREET,
    };
  }

  private buildPickupAddress(shop: {
    province: string | null;
    ward: string | null;
    streetAddress: string | null;
  }): string {
    const pickup = this.resolvePlatformPickupAddress(shop);
    return [pickup.streetAddress, pickup.wardName, pickup.provinceName].join(
      ', ',
    );
  }

  private async requireSellerPreparedShopOrder(
    user: AuthenticatedUser,
    shopOrderId: bigint,
  ): Promise<CreateShipmentShopOrderEntity> {
    const shopOrder = await this.prisma.shopOrder.findFirst({
      where: {
        id: shopOrderId,
        shop: { ownerUserId: user.id, isDeleted: false },
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
        message: 'Only prepared shop orders can arrange shipment handover',
        details: [{ field: 'orderStatus' }],
      });
    }
    return shopOrder;
  }

  private async requireGhnStation(
    shopOrder: CreateShipmentShopOrderEntity,
    stationId: number | undefined,
  ): Promise<HandoverStationResponse> {
    if (!stationId) {
      throw new BadRequestException({
        code: 'PICKUP_STATION_REQUIRED',
        message: 'A GHN station is required for drop-off',
        details: [{ field: 'pickupStationId' }],
      });
    }
    if (!this.ghnClient.isConfigured()) {
      throw this.toCarrierRegistrationException(
        new CarrierNotConfiguredError('GHN'),
      );
    }
    const pickup = this.resolvePlatformPickupAddress(shopOrder.shop);
    let stations: HandoverStationResponse[];
    try {
      stations = await this.ghnClient.getStations(
        pickup.provinceName,
        pickup.wardName,
      );
    } catch (error) {
      throw this.toCarrierRegistrationException(error);
    }
    const station = stations.find((candidate) => candidate.id === stationId);
    if (!station) {
      throw new BadRequestException({
        code: 'PICKUP_STATION_INVALID',
        message: 'The selected GHN station is not available for this shop',
        details: [{ field: 'pickupStationId' }],
      });
    }
    return station;
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
        province: true,
        ward: true,
        streetAddress: true,
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
      const reservationUpdate = await client.inventoryReservation.updateMany({
        where: {
          orderItemId: item.id,
          reservationStatus: 'Active',
        },
        data: {
          reservationStatus: 'Completed',
          completedAt: now,
        },
      });
      if (reservationUpdate.count !== 1) {
        throw new BadRequestException({
          code: 'INVENTORY_RESERVATION_INVALID',
          message: 'Active inventory reservation was not found',
          details: [{ orderItemId: item.id.toString() }],
        });
      }

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

  private async returnShipmentInventory(
    client: Prisma.TransactionClient,
    user: AuthenticatedUser,
    shipment: UpdateShipmentTrackingEntity,
    now: Date,
  ): Promise<void> {
    for (const shipmentItem of shipment.items) {
      const reservation = await client.inventoryReservation.findUnique({
        where: { orderItemId: shipmentItem.orderItemId },
      });
      if (!reservation || reservation.reservationStatus !== 'Active') {
        throw new BadRequestException({
          code: 'INVENTORY_RESERVATION_INVALID',
          message: 'Active inventory reservation was not found',
          details: [{ orderItemId: shipmentItem.orderItemId.toString() }],
        });
      }

      await client.inventoryReservation.update({
        where: { id: reservation.id },
        data: { reservationStatus: 'Returned', returnedAt: now },
      });
      const update = await client.productInventory.updateMany({
        where: {
          id: reservation.productInventoryId,
          quantityReserved: { gte: reservation.quantity },
        },
        data: {
          quantityReserved: { decrement: reservation.quantity },
          quantityAvailable: { increment: reservation.quantity },
          updatedAt: now,
        },
      });
      if (update.count !== 1) {
        throw new BadRequestException({
          code: 'INVENTORY_RESERVATION_INVALID',
          message: 'Reserved inventory is not enough to return shipment',
          details: [{ orderItemId: shipmentItem.orderItemId.toString() }],
        });
      }
      const inventory = await client.productInventory.findUniqueOrThrow({
        where: { id: reservation.productInventoryId },
      });
      await client.inventoryTransaction.create({
        data: {
          productInventoryId: inventory.id,
          transactionType: 'ReturnOrder',
          quantityChange: reservation.quantity,
          quantityAfter: inventory.quantityAvailable,
          referenceType: INVENTORY_REFERENCE_TYPE_ORDER_ITEM,
          referenceId: shipmentItem.orderItemId,
          note: `Returned ${reservation.quantity} unit(s) to available stock`,
          createdByUserId: user.id,
          createdAt: now,
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
      carrierServiceCode: service.carrierServiceCode,
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
    destinationWard: string,
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
      destinationWard,
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
      carrierOrderCode: shipment.carrierOrderCode,
      carrierStatus: shipment.carrierStatus,
      shipmentStatus: shipment.shipmentStatus,
      shippingFee: shipment.shippingFee.toString(),
      codAmount: shipment.codAmount.toString(),
      handoverMethod: shipment.handoverMethod,
      pickupStation:
        shipment.pickupStationId &&
        shipment.pickupStationName &&
        shipment.pickupStationAddress
          ? {
              id: shipment.pickupStationId,
              name: shipment.pickupStationName,
              address: shipment.pickupStationAddress,
            }
          : null,
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
        provider: service.shippingCompany.provider,
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
