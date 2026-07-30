import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppRole } from '../auth/app-role.enum';
import { AuthenticatedUser } from '../auth/types';
import { CarrierRegistry } from './carriers/carrier.registry';
import { CarrierClient, CarrierQuoteResult } from './carriers/carrier.types';
import { GhnClient } from './carriers/ghn.client';
import { ShippingService } from './shipping.service';

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

type CreateShipmentShopOrderEntity = {
  id: bigint;
  orderId: bigint;
  shopId: bigint;
  shippingCompanyId: bigint | null;
  shippingServiceId: bigint | null;
  shippingQuoteId: bigint | null;
  orderStatus: string;
  shippingFeeAmount: { toString(): string };
  totalAmount: { toString(): string };
  shop: {
    id: bigint;
    ownerUserId: bigint;
    isDeleted: boolean;
    shopName: string;
    phoneNumber: string | null;
    province: string | null;
    ward: string | null;
    streetAddress: string | null;
  };
  order: {
    id: bigint;
    orderStatus: string;
    receiverName: string;
    receiverPhone: string;
    shippingProvince: string;
    shippingWard: string;
    shippingStreetAddress: string;
    paymentMethod: { methodCode: string };
  };
  items: Array<{
    id: bigint;
    quantity: number;
    productVariant: {
      weightGram: number;
    };
  }>;
};

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

type ShippingCompanyDelegateMock = {
  findMany: jest.Mock<Promise<ShippingCompanyEntity[]>, [unknown]>;
  count: jest.Mock<Promise<number>, [unknown]>;
  findUnique: jest.Mock<Promise<ShippingCompanyEntity | null>, [unknown]>;
};

type ShippingServiceDelegateMock = {
  findMany: jest.Mock<Promise<ShippingServiceEntity[]>, [unknown]>;
  count: jest.Mock<Promise<number>, [unknown]>;
  findUnique: jest.Mock<
    Promise<ShippingServiceEntity | ShippingServiceWithCompanyEntity | null>,
    [unknown]
  >;
};

type ShopDelegateMock = {
  findUnique: jest.Mock<Promise<ShippingQuoteShopEntity | null>, [unknown]>;
};

type ShippingQuoteDelegateMock = {
  create: jest.Mock<Promise<ShippingQuoteEntity>, [unknown]>;
  findUnique: jest.Mock<Promise<ShippingQuoteEntity | null>, [unknown]>;
};

type ShopOrderDelegateMock = {
  findFirst: jest.Mock<
    Promise<CreateShipmentShopOrderEntity | null>,
    [unknown]
  >;
  findUniqueOrThrow: jest.Mock<
    Promise<CreateShipmentShopOrderEntity>,
    [unknown]
  >;
  count: jest.Mock<Promise<number>, [unknown]>;
  update: jest.Mock<Promise<unknown>, [unknown]>;
};

type ShipmentDelegateMock = {
  count: jest.Mock<Promise<number>, [unknown]>;
  create: jest.Mock<Promise<ShipmentEntity>, [unknown]>;
  findFirst: jest.Mock<Promise<UpdateShipmentTrackingEntity | null>, [unknown]>;
  findUniqueOrThrow: jest.Mock<
    Promise<UpdateShipmentTrackingEntity>,
    [unknown]
  >;
  update: jest.Mock<Promise<UpdateShipmentTrackingEntity>, [unknown]>;
};

type ShipmentItemDelegateMock = {
  create: jest.Mock<Promise<ShipmentItemEntity>, [unknown]>;
};

type ShipmentTrackingHistoryDelegateMock = {
  create: jest.Mock<Promise<unknown>, [unknown]>;
};

type OrderStatusHistoryDelegateMock = {
  create: jest.Mock<Promise<unknown>, [unknown]>;
};

type OrderDelegateMock = {
  findUnique: jest.Mock<Promise<{ orderStatus: string } | null>, [unknown]>;
  update: jest.Mock<Promise<unknown>, [unknown]>;
};

type CompletionOrderItemEntity = {
  id: bigint;
  productId: bigint;
  productVariantId: bigint;
  quantity: number;
};

type ProductInventoryEntity = {
  id: bigint;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
};

type OrderItemDelegateMock = {
  findMany: jest.Mock<Promise<CompletionOrderItemEntity[]>, [unknown]>;
};

type ProductInventoryDelegateMock = {
  updateMany: jest.Mock<Promise<{ count: number }>, [unknown]>;
  findUnique: jest.Mock<Promise<ProductInventoryEntity | null>, [unknown]>;
  findUniqueOrThrow: jest.Mock<Promise<ProductInventoryEntity>, [unknown]>;
};

type InventoryTransactionDelegateMock = {
  create: jest.Mock<Promise<unknown>, [unknown]>;
};

type InventoryReservationEntity = {
  id: bigint;
  productInventoryId: bigint;
  quantity: number;
  reservationStatus: string;
};

type InventoryReservationDelegateMock = {
  updateMany: jest.Mock<Promise<{ count: number }>, [unknown]>;
  findUnique: jest.Mock<Promise<InventoryReservationEntity | null>, [unknown]>;
  update: jest.Mock<Promise<unknown>, [unknown]>;
};

type ProductDelegateMock = {
  update: jest.Mock<Promise<unknown>, [unknown]>;
};

type PrismaMock = {
  shippingCompany: ShippingCompanyDelegateMock;
  shippingService: ShippingServiceDelegateMock;
  shop: ShopDelegateMock;
  shippingQuote: ShippingQuoteDelegateMock;
  shopOrder: ShopOrderDelegateMock;
  shipment: ShipmentDelegateMock;
  shipmentItem: ShipmentItemDelegateMock;
  shipmentTrackingHistory: ShipmentTrackingHistoryDelegateMock;
  orderStatusHistory: OrderStatusHistoryDelegateMock;
  order: OrderDelegateMock;
  orderItem: OrderItemDelegateMock;
  productInventory: ProductInventoryDelegateMock;
  inventoryTransaction: InventoryTransactionDelegateMock;
  inventoryReservation: InventoryReservationDelegateMock;
  product: ProductDelegateMock;
  $transaction: jest.Mock<
    Promise<unknown>,
    [(client: PrismaMock) => Promise<unknown>]
  >;
};

type UpdateShipmentTrackingEntity = ShipmentEntity & {
  shopOrder: CreateShipmentShopOrderEntity;
  shippingService: ShippingServiceEntity;
  shippingCompany: ShippingCompanyEntity;
  items: ShipmentItemEntity[];
};

const adminUser: AuthenticatedUser = {
  id: 1n,
  idString: '1',
  email: 'admin@example.com',
  phoneNumber: null,
  userStatus: 'Active',
  roles: [AppRole.Admin],
  profile: null,
};

function createShippingCompanyEntity(
  overrides: Partial<ShippingCompanyEntity> = {},
): ShippingCompanyEntity {
  const now = new Date('2026-07-03T00:00:00.000Z');

  return {
    id: 10n,
    provider: 'GHN',
    code: '11111111-1111-4111-8111-111111111111',
    companyName: 'Giao Hàng Nhanh',
    slug: 'ghn',
    email: 'ops@ghn.test',
    phoneNumber: '0900000001',
    taxCode: 'TAX001',
    addressText: '10 Logistics',
    companyStatus: 'Approved',
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

function createShippingServiceEntity(
  overrides: Partial<ShippingServiceEntity> = {},
): ShippingServiceEntity {
  const now = new Date('2026-07-03T00:00:00.000Z');

  return {
    id: 20n,
    shippingCompanyId: 10n,
    serviceCode: 'STD',
    serviceName: 'Standard Delivery',
    carrierServiceCode: '53320',
    estimatedMinDays: 2,
    estimatedMaxDays: 5,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createShippingServiceWithCompanyEntity(
  overrides: Partial<ShippingServiceWithCompanyEntity> = {},
): ShippingServiceWithCompanyEntity {
  return {
    ...createShippingServiceEntity(),
    shippingCompany: createShippingCompanyEntity(),
    ...overrides,
  };
}

function createShippingQuoteShopEntity(
  overrides: Partial<ShippingQuoteShopEntity> = {},
): ShippingQuoteShopEntity {
  return {
    id: 100n,
    shopName: 'Seller Home',
    slug: 'seller-home',
    shopStatus: 'Approved',
    isDeleted: false,
    province: 'TP.HCM',
    ward: 'Phường Bến Nghé',
    streetAddress: '5 Kho Hàng',
    ...overrides,
  };
}

function createShippingQuoteEntity(
  overrides: Partial<ShippingQuoteEntity> = {},
): ShippingQuoteEntity {
  const now = new Date('2026-07-03T00:00:00.000Z');

  return {
    id: 30n,
    shopId: 100n,
    shippingCompanyId: 10n,
    shippingServiceId: 20n,
    destinationProvince: 'TP.HCM',
    totalWeightGram: 1500,
    quotedFee: { toString: () => '35000' },
    estimatedMinDays: 2,
    estimatedMaxDays: 5,
    expiresAt: new Date('2026-07-03T00:30:00.000Z'),
    createdAt: now,
    ...overrides,
  };
}

function createShipmentShopOrderEntity(
  overrides: Partial<CreateShipmentShopOrderEntity> = {},
): CreateShipmentShopOrderEntity {
  return {
    id: 501n,
    orderId: 900n,
    shopId: 100n,
    shippingCompanyId: 10n,
    shippingServiceId: 20n,
    shippingQuoteId: 30n,
    orderStatus: 'Prepared',
    shippingFeeAmount: { toString: () => '35000' },
    totalAmount: { toString: () => '250000' },
    shop: {
      id: 100n,
      ownerUserId: adminUser.id,
      isDeleted: false,
      shopName: 'Seller Home',
      phoneNumber: '0900000002',
      province: 'TP.HCM',
      ward: 'Phường Bến Nghé',
      streetAddress: '5 Kho Hàng',
    },
    order: {
      id: 900n,
      orderStatus: 'Prepared',
      receiverName: 'Customer Demo',
      receiverPhone: '0900000003',
      shippingProvince: 'TP.HCM',
      shippingWard: 'Phường Bến Nghé',
      shippingStreetAddress: '10 Demo',
      paymentMethod: { methodCode: 'COD' },
    },
    items: [
      {
        id: 700n,
        quantity: 1,
        productVariant: {
          weightGram: 1500,
        },
      },
    ],
    ...overrides,
  };
}

function createShipmentEntity(
  overrides: Partial<ShipmentEntity> = {},
): ShipmentEntity {
  const now = new Date('2026-07-03T00:00:00.000Z');

  return {
    id: 800n,
    shopOrderId: 501n,
    shippingCompanyId: 10n,
    shippingServiceId: 20n,
    shipmentCode: 'SHP-20260703000000-DEMO',
    trackingNumber: 'TRACK-001',
    carrierOrderCode: null,
    carrierStatus: null,
    shipmentStatus: 'Pending',
    shippingFee: { toString: () => '35000' },
    codAmount: { toString: () => '250000' },
    handoverMethod: 'Pickup',
    pickupStationId: null,
    pickupStationName: null,
    pickupStationAddress: null,
    pickupAddress: '5 Kho Hàng, Phường Bến Nghé, TP.HCM',
    deliveryAddress: '10 Demo, Phường Bến Nghé, TP.HCM',
    recipientName: 'Customer Demo',
    recipientPhone: '0900000003',
    expectedDeliveryAt: new Date('2026-07-05T00:00:00.000Z'),
    pickedUpAt: null,
    deliveredAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createShipmentItemEntity(
  overrides: Partial<ShipmentItemEntity> = {},
): ShipmentItemEntity {
  return {
    id: 810n,
    shipmentId: 800n,
    orderItemId: 700n,
    quantity: 1,
    createdAt: new Date('2026-07-03T00:00:00.000Z'),
    ...overrides,
  };
}

function createUpdateShipmentTrackingEntity(
  overrides: Partial<UpdateShipmentTrackingEntity> = {},
): UpdateShipmentTrackingEntity {
  return {
    ...createShipmentEntity(),
    shopOrder: createShipmentShopOrderEntity({ orderStatus: 'Shipping' }),
    shippingService: createShippingServiceEntity(),
    shippingCompany: createShippingCompanyEntity(),
    items: [createShipmentItemEntity()],
    ...overrides,
  };
}

type FakeCarrierClient = Omit<
  CarrierClient,
  'isConfigured' | 'getQuote' | 'createOrder'
> & {
  isConfigured: jest.Mock<boolean, []>;
  getQuote: jest.Mock<Promise<CarrierQuoteResult>, [unknown]>;
  createOrder: jest.Mock;
};

function createFakeCarrierClient(
  overrides: Partial<FakeCarrierClient> = {},
): FakeCarrierClient {
  return {
    provider: 'GHN',
    isConfigured: jest.fn<boolean, []>().mockReturnValue(false),
    healthCheck: jest.fn().mockResolvedValue(false),
    getQuote: jest
      .fn<Promise<CarrierQuoteResult>, [unknown]>()
      .mockResolvedValue({
        feeAmount: 35000,
        estimatedMinDays: 2,
        estimatedMaxDays: 5,
        raw: {},
      }),
    createOrder: jest.fn(),
    getOrderStatus: jest.fn(),
    ...overrides,
  };
}

describe('ShippingService', () => {
  let prisma: PrismaMock;
  let carrierRegistry: CarrierRegistry;
  let fakeCarrierClient: FakeCarrierClient;
  let ghnClient: jest.Mocked<
    Pick<GhnClient, 'isConfigured' | 'getStations' | 'getA5PrintUrl'>
  >;
  let service: ShippingService;

  beforeEach(() => {
    prisma = {
      shippingCompany: {
        findMany: jest.fn<Promise<ShippingCompanyEntity[]>, [unknown]>(),
        count: jest.fn<Promise<number>, [unknown]>(),
        findUnique: jest.fn<Promise<ShippingCompanyEntity | null>, [unknown]>(),
      },
      shippingService: {
        findMany: jest.fn<Promise<ShippingServiceEntity[]>, [unknown]>(),
        count: jest.fn<Promise<number>, [unknown]>(),
        findUnique: jest.fn<
          Promise<
            ShippingServiceEntity | ShippingServiceWithCompanyEntity | null
          >,
          [unknown]
        >(),
      },
      shop: {
        findUnique: jest.fn<
          Promise<ShippingQuoteShopEntity | null>,
          [unknown]
        >(),
      },
      shippingQuote: {
        create: jest.fn<Promise<ShippingQuoteEntity>, [unknown]>(),
        findUnique: jest.fn<Promise<ShippingQuoteEntity | null>, [unknown]>(),
      },
      shopOrder: {
        findFirst: jest.fn<
          Promise<CreateShipmentShopOrderEntity | null>,
          [unknown]
        >(),
        findUniqueOrThrow: jest.fn<
          Promise<CreateShipmentShopOrderEntity>,
          [unknown]
        >(),
        count: jest.fn<Promise<number>, [unknown]>(),
        update: jest.fn<Promise<unknown>, [unknown]>(),
      },
      shipment: {
        count: jest.fn<Promise<number>, [unknown]>(),
        create: jest.fn<Promise<ShipmentEntity>, [unknown]>(),
        findFirst: jest.fn<
          Promise<UpdateShipmentTrackingEntity | null>,
          [unknown]
        >(),
        findUniqueOrThrow: jest.fn<
          Promise<UpdateShipmentTrackingEntity>,
          [unknown]
        >(),
        update: jest.fn<Promise<UpdateShipmentTrackingEntity>, [unknown]>(),
      },
      shipmentItem: {
        create: jest.fn<Promise<ShipmentItemEntity>, [unknown]>(),
      },
      shipmentTrackingHistory: {
        create: jest.fn<Promise<unknown>, [unknown]>(),
      },
      orderStatusHistory: {
        create: jest.fn<Promise<unknown>, [unknown]>(),
      },
      order: {
        findUnique: jest.fn<
          Promise<{ orderStatus: string } | null>,
          [unknown]
        >(),
        update: jest.fn<Promise<unknown>, [unknown]>(),
      },
      orderItem: {
        findMany: jest.fn<Promise<CompletionOrderItemEntity[]>, [unknown]>(),
      },
      productInventory: {
        updateMany: jest.fn<Promise<{ count: number }>, [unknown]>(),
        findUnique: jest.fn<
          Promise<ProductInventoryEntity | null>,
          [unknown]
        >(),
        findUniqueOrThrow: jest.fn<
          Promise<ProductInventoryEntity>,
          [unknown]
        >(),
      },
      inventoryTransaction: {
        create: jest.fn<Promise<unknown>, [unknown]>(),
      },
      inventoryReservation: {
        updateMany: jest
          .fn<Promise<{ count: number }>, [unknown]>()
          .mockResolvedValue({ count: 1 }),
        findUnique: jest.fn<
          Promise<InventoryReservationEntity | null>,
          [unknown]
        >(),
        update: jest.fn<Promise<unknown>, [unknown]>(),
      },
      product: {
        update: jest.fn<Promise<unknown>, [unknown]>(),
      },
      $transaction: jest.fn<
        Promise<unknown>,
        [(client: PrismaMock) => Promise<unknown>]
      >((callback) => callback(prisma)),
    };

    fakeCarrierClient = createFakeCarrierClient();
    carrierRegistry = {
      getClient: jest.fn().mockReturnValue(fakeCarrierClient),
      getAllClients: jest.fn().mockReturnValue([fakeCarrierClient]),
    } as unknown as CarrierRegistry;

    ghnClient = {
      isConfigured: jest.fn().mockReturnValue(true),
      getStations: jest.fn().mockResolvedValue([]),
      getA5PrintUrl: jest
        .fn()
        .mockResolvedValue(
          'https://dev-online-gateway.ghn.vn/a5/public-api/printA5?token=test',
        ),
    };
    service = new ShippingService(
      prisma as unknown as PrismaService,
      carrierRegistry,
      ghnClient as unknown as GhnClient,
    );
  });

  it('lists the carrier registry with live configuration status', async () => {
    prisma.shippingCompany.findMany.mockResolvedValue([
      createShippingCompanyEntity(),
    ]);

    const result = await service.listCarrierProviders();

    expect(result.data[0]).toMatchObject({
      provider: 'GHN',
      slug: 'ghn',
      isConfigured: false,
    });
  });

  it('lists active shipping services with pagination', async () => {
    prisma.shippingService.findMany.mockResolvedValue([
      createShippingServiceWithCompanyEntity(),
    ]);
    prisma.shippingService.count.mockResolvedValue(1);

    const result = await service.listActiveShippingServices({
      page: 1,
      limit: 20,
    });

    expect(result.items[0].serviceCode).toBe('STD');
    expect(result.meta.total).toBe(1);
  });

  it('creates a shipping quote using the resolved carrier client', async () => {
    prisma.shop.findUnique.mockResolvedValue(createShippingQuoteShopEntity());
    prisma.shippingService.findUnique.mockResolvedValue(
      createShippingServiceWithCompanyEntity(),
    );
    prisma.shippingQuote.create.mockResolvedValue(createShippingQuoteEntity());

    const result = await service.createShippingQuote({
      shopId: '100',
      shippingServiceId: '20',
      destinationProvince: 'TP.HCM',
      destinationWard: 'Phường Bến Nghé',
      totalWeightGram: 1500,
    });

    expect(fakeCarrierClient.getQuote).toHaveBeenCalledWith(
      expect.objectContaining({
        carrierServiceCode: '53320',
        weightGram: 1500,
      }),
    );
    const createArgs = prisma.shippingQuote.create.mock.calls[0][0] as {
      data: {
        shopId: bigint;
        shippingCompanyId: bigint;
        shippingServiceId: bigint;
        quotedFee: { toString(): string };
        estimatedMinDays: number;
        estimatedMaxDays: number;
        expiresAt: Date;
        createdAt: Date;
      };
    };

    expect(createArgs.data.shopId).toBe(100n);
    expect(createArgs.data.shippingCompanyId).toBe(10n);
    expect(createArgs.data.shippingServiceId).toBe(20n);
    expect(createArgs.data.quotedFee.toString()).toBe('35000');
    expect(
      createArgs.data.expiresAt.getTime() - createArgs.data.createdAt.getTime(),
    ).toBe(30 * 60 * 1000);
    expect(result.quotedFee).toBe('35000');
    expect(result.shop.slug).toBe('seller-home');
    expect(result.shippingCompany.slug).toBe('ghn');
  });

  it('rejects quote for a non-approved shop', async () => {
    prisma.shop.findUnique.mockResolvedValue(
      createShippingQuoteShopEntity({ shopStatus: 'PendingApproval' }),
    );
    prisma.shippingService.findUnique.mockResolvedValue(
      createShippingServiceWithCompanyEntity(),
    );

    await expect(
      service.createShippingQuote({
        shopId: '100',
        shippingServiceId: '20',
        destinationProvince: 'TP.HCM',
        destinationWard: 'Phường Bến Nghé',
        totalWeightGram: 1000,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.shippingQuote.create).not.toHaveBeenCalled();
  });

  it('rejects quote for an inactive shipping service', async () => {
    prisma.shop.findUnique.mockResolvedValue(createShippingQuoteShopEntity());
    prisma.shippingService.findUnique.mockResolvedValue(
      createShippingServiceWithCompanyEntity({ isActive: false }),
    );

    await expect(
      service.createShippingQuote({
        shopId: '100',
        shippingServiceId: '20',
        destinationProvince: 'TP.HCM',
        destinationWard: 'Phường Bến Nghé',
        totalWeightGram: 1000,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.shippingQuote.create).not.toHaveBeenCalled();
  });

  it('moves a prepared order to shipping only after GHN accepts it', async () => {
    prisma.shipment.findFirst.mockResolvedValue(null);
    prisma.shopOrder.findFirst.mockResolvedValue(
      createShipmentShopOrderEntity(),
    );
    prisma.shippingService.findUnique.mockResolvedValue(
      createShippingServiceWithCompanyEntity(),
    );
    const registeringShipment = createShipmentEntity({
      trackingNumber: null,
      shipmentStatus: 'Registering',
    });
    const acceptedShipment = createShipmentEntity({
      trackingNumber: 'GHN-ORDER-001',
      carrierOrderCode: 'GHN-ORDER-001',
      carrierStatus: 'ready_to_pick',
      shipmentStatus: 'Pending',
    });
    prisma.shipment.create.mockResolvedValue(registeringShipment);
    prisma.shipment.update.mockResolvedValue(
      createUpdateShipmentTrackingEntity(acceptedShipment),
    );
    prisma.shipmentItem.create.mockResolvedValue(createShipmentItemEntity());
    prisma.shipmentTrackingHistory.create.mockResolvedValue({ id: 820n });
    prisma.shopOrder.update.mockResolvedValue({ id: 501n });
    prisma.orderStatusHistory.create.mockResolvedValue({ id: 830n });
    prisma.shopOrder.count.mockResolvedValue(0);
    prisma.order.findUnique.mockResolvedValue({ orderStatus: 'Prepared' });
    prisma.order.update.mockResolvedValue({ id: 900n });
    fakeCarrierClient.isConfigured.mockReturnValue(true);
    fakeCarrierClient.createOrder.mockResolvedValue({
      carrierOrderCode: 'GHN-ORDER-001',
      feeAmount: 35000,
      expectedDeliveryAt: new Date('2026-07-05T00:00:00.000Z'),
      raw: {},
    });

    const result = await service.createSellerShipment(adminUser, '501', {
      handoverMethod: 'Pickup',
    });
    const shipmentArgs = prisma.shipment.create.mock.calls[0][0] as {
      data: {
        trackingNumber: null;
        shipmentStatus: string;
        shippingFee: { toString(): string };
        codAmount: { toString(): string };
        handoverMethod: string;
        pickupAddress: string;
      };
    };

    expect(shipmentArgs.data).toMatchObject({
      trackingNumber: null,
      shipmentStatus: 'Registering',
      handoverMethod: 'Pickup',
      pickupAddress: '5 Kho Hàng, Phường Bến Nghé, TP.HCM',
    });
    expect(shipmentArgs.data.shippingFee.toString()).toBe('35000');
    expect(shipmentArgs.data.codAmount.toString()).toBe('250000');
    expect(fakeCarrierClient.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        clientOrderCode: registeringShipment.shipmentCode,
        codAmount: 250000,
        pickupStationId: undefined,
      }),
    );
    expect(prisma.shopOrder.update).toHaveBeenCalledWith({
      where: { id: 501n },
      data: {
        orderStatus: 'Shipping',
        updatedAt: expect.any(Date) as Date,
      },
    });
    expect(result).toMatchObject({
      carrierOrderCode: 'GHN-ORDER-001',
      trackingNumber: 'GHN-ORDER-001',
      shipmentStatus: 'Pending',
      handoverMethod: 'Pickup',
    });
  });

  it('keeps the shop order prepared and marks sync failed when GHN rejects it', async () => {
    prisma.shipment.findFirst.mockResolvedValue(null);
    prisma.shopOrder.findFirst.mockResolvedValue(
      createShipmentShopOrderEntity(),
    );
    prisma.shippingService.findUnique.mockResolvedValue(
      createShippingServiceWithCompanyEntity(),
    );
    prisma.shipment.create.mockResolvedValue(
      createShipmentEntity({ shipmentStatus: 'Registering' }),
    );
    prisma.shipmentItem.create.mockResolvedValue(createShipmentItemEntity());
    prisma.shipmentTrackingHistory.create.mockResolvedValue({ id: 820n });
    prisma.shipment.update.mockResolvedValue(
      createUpdateShipmentTrackingEntity({ shipmentStatus: 'SyncFailed' }),
    );
    fakeCarrierClient.isConfigured.mockReturnValue(true);
    fakeCarrierClient.createOrder.mockRejectedValue(
      new Error('GHN unavailable'),
    );

    await expect(
      service.createSellerShipment(adminUser, '501', {
        handoverMethod: 'Pickup',
      }),
    ).rejects.toMatchObject({
      response: { code: 'CARRIER_ORDER_CREATE_FAILED' },
    });
    expect(prisma.shopOrder.update).not.toHaveBeenCalled();
    expect(prisma.order.update).not.toHaveBeenCalled();
    expect(prisma.shipment.update).toHaveBeenCalledWith({
      where: { id: 800n },
      data: {
        shipmentStatus: 'SyncFailed',
        updatedAt: expect.any(Date) as Date,
      },
    });
  });

  it('rejects shipment when shop order is not prepared', async () => {
    prisma.shipment.findFirst.mockResolvedValue(null);
    prisma.shopOrder.findFirst.mockResolvedValue(
      createShipmentShopOrderEntity({ orderStatus: 'Confirmed' }),
    );

    await expect(
      service.createSellerShipment(adminUser, '501', {
        handoverMethod: 'Pickup',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.shipment.create).not.toHaveBeenCalled();
  });

  it('syncs carrier-owned shipment status and writes history', async () => {
    const shipment = createUpdateShipmentTrackingEntity({
      carrierOrderCode: 'GHN-ORDER-001',
      trackingNumber: 'GHN-ORDER-001',
    });
    prisma.shipment.findFirst.mockResolvedValue(shipment);
    prisma.shipment.update.mockResolvedValue(
      createUpdateShipmentTrackingEntity({
        ...shipment,
        carrierStatus: 'transporting',
        shipmentStatus: 'InTransit',
        pickedUpAt: new Date('2026-07-03T03:00:00.000Z'),
      }),
    );
    prisma.shipment.findUniqueOrThrow.mockResolvedValue(
      createUpdateShipmentTrackingEntity({
        ...shipment,
        carrierStatus: 'transporting',
        shipmentStatus: 'InTransit',
      }),
    );
    prisma.shipmentTrackingHistory.create.mockResolvedValue({ id: 820n });
    fakeCarrierClient.isConfigured.mockReturnValue(true);
    fakeCarrierClient.getOrderStatus = jest.fn().mockResolvedValue({
      status: 'InTransit',
      carrierStatusRaw: 'transporting',
      deliveredAt: null,
    });

    const result = await service.syncSellerShipment(adminUser, '501', '800');
    const updateArgs = prisma.shipment.update.mock.calls[0][0] as {
      data: {
        shipmentStatus: string;
        carrierStatus: string;
        pickedUpAt: Date;
      };
    };
    const historyArgs = prisma.shipmentTrackingHistory.create.mock
      .calls[0][0] as {
      data: {
        shipmentId: bigint;
        fromStatus: string;
        toStatus: string;
        note: string;
        updatedByUserId: bigint;
      };
    };

    expect(updateArgs.data).toMatchObject({
      shipmentStatus: 'InTransit',
      carrierStatus: 'transporting',
    });
    expect(updateArgs.data.pickedUpAt).toBeInstanceOf(Date);
    expect(historyArgs.data).toMatchObject({
      shipmentId: 800n,
      fromStatus: 'Pending',
      toStatus: 'InTransit',
      note: 'Đồng bộ trạng thái từ GHN: transporting',
      updatedByUserId: adminUser.id,
    });
    expect(result.shipmentStatus).toBe('InTransit');
  });

  it('completes shop order and parent order when final shipment is delivered', async () => {
    const shipment = createUpdateShipmentTrackingEntity({
      shipmentStatus: 'InTransit',
      carrierOrderCode: 'GHN-ORDER-001',
      trackingNumber: 'GHN-ORDER-001',
    });
    prisma.shipment.findFirst.mockResolvedValue(shipment);
    prisma.shipment.update.mockResolvedValue(
      createUpdateShipmentTrackingEntity({
        ...shipment,
        carrierStatus: 'delivered',
        shipmentStatus: 'Delivered',
        deliveredAt: new Date('2026-07-03T04:00:00.000Z'),
      }),
    );
    prisma.shipment.findUniqueOrThrow.mockResolvedValue(
      createUpdateShipmentTrackingEntity({
        ...shipment,
        carrierStatus: 'delivered',
        shipmentStatus: 'Delivered',
      }),
    );
    fakeCarrierClient.isConfigured.mockReturnValue(true);
    fakeCarrierClient.getOrderStatus = jest.fn().mockResolvedValue({
      status: 'Delivered',
      carrierStatusRaw: 'delivered',
      deliveredAt: new Date('2026-07-03T04:00:00.000Z'),
    });
    prisma.shipmentTrackingHistory.create.mockResolvedValue({ id: 820n });
    prisma.shipment.count.mockResolvedValue(0);
    prisma.shopOrder.update
      .mockResolvedValueOnce({ id: 501n, orderId: 900n })
      .mockResolvedValueOnce({ id: 501n, orderId: 900n });
    prisma.orderItem.findMany.mockResolvedValue([
      {
        id: 700n,
        productId: 100n,
        productVariantId: 200n,
        quantity: 1,
      },
    ]);
    prisma.productInventory.updateMany.mockResolvedValue({ count: 1 });
    prisma.productInventory.findUnique.mockResolvedValue({
      id: 400n,
      quantityOnHand: 11,
      quantityReserved: 0,
      quantityAvailable: 11,
    });
    prisma.inventoryTransaction.create.mockResolvedValue({ id: 840n });
    prisma.product.update.mockResolvedValue({ id: 100n });
    prisma.orderStatusHistory.create.mockResolvedValue({ id: 830n });
    prisma.shopOrder.count.mockResolvedValue(0);
    prisma.order.findUnique.mockResolvedValue({ orderStatus: 'Shipping' });
    prisma.order.update.mockResolvedValue({ id: 900n });

    const result = await service.syncSellerShipment(adminUser, '501', '800');
    const shopOrderUpdateArgs = prisma.shopOrder.update.mock.calls[0][0] as {
      where: { id: bigint };
      data: { orderStatus: string; updatedAt: Date };
    };
    const shopOrderCompletedArgs = prisma.shopOrder.update.mock.calls[1][0] as {
      where: { id: bigint };
      data: { orderStatus: string; completedAt: Date; updatedAt: Date };
    };
    const inventoryUpdateArgs = prisma.productInventory.updateMany.mock
      .calls[0][0] as {
      where: {
        productVariantId: bigint;
        quantityOnHand: { gte: number };
        quantityReserved: { gte: number };
      };
      data: {
        quantityOnHand: { decrement: number };
        quantityReserved: { decrement: number };
      };
    };
    const inventoryHistoryArgs = prisma.inventoryTransaction.create.mock
      .calls[0][0] as {
      data: {
        productInventoryId: bigint;
        transactionType: string;
        quantityChange: number;
        quantityAfter: number;
        referenceType: string;
        referenceId: bigint;
      };
    };
    const shopHistoryArgs = prisma.orderStatusHistory.create.mock
      .calls[0][0] as {
      data: {
        shopOrderId: bigint;
        fromStatus: string;
        toStatus: string;
      };
    };
    const shopCompletedHistoryArgs = prisma.orderStatusHistory.create.mock
      .calls[1][0] as {
      data: {
        shopOrderId: bigint;
        fromStatus: string;
        toStatus: string;
      };
    };
    const orderHistoryArgs = prisma.orderStatusHistory.create.mock
      .calls[2][0] as {
      data: {
        orderId: bigint;
        fromStatus: string;
        toStatus: string;
      };
    };
    const orderCompletedHistoryArgs = prisma.orderStatusHistory.create.mock
      .calls[3][0] as {
      data: {
        orderId: bigint;
        fromStatus: string;
        toStatus: string;
      };
    };

    expect(shopOrderUpdateArgs).toMatchObject({
      where: { id: 501n },
      data: { orderStatus: 'Delivered' },
    });
    expect(shopOrderCompletedArgs).toMatchObject({
      where: { id: 501n },
      data: { orderStatus: 'Completed' },
    });
    expect(inventoryUpdateArgs.where).toMatchObject({
      productVariantId: 200n,
      quantityOnHand: { gte: 1 },
      quantityReserved: { gte: 1 },
    });
    expect(inventoryUpdateArgs.data).toMatchObject({
      quantityOnHand: { decrement: 1 },
      quantityReserved: { decrement: 1 },
    });
    expect(inventoryHistoryArgs.data).toMatchObject({
      productInventoryId: 400n,
      transactionType: 'COMPLETE_ORDER',
      quantityChange: -1,
      quantityAfter: 11,
      referenceType: 'ORDER_ITEM',
      referenceId: 700n,
    });
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 100n },
      data: {
        soldCount: { increment: 1n },
        updatedAt: expect.any(Date) as Date,
      },
    });
    expect(prisma.order.update).toHaveBeenNthCalledWith(1, {
      where: { id: 900n },
      data: {
        orderStatus: 'Delivered',
        updatedAt: expect.any(Date) as Date,
      },
    });
    expect(prisma.order.update).toHaveBeenNthCalledWith(2, {
      where: { id: 900n },
      data: {
        orderStatus: 'Completed',
        completedAt: expect.any(Date) as Date,
        updatedAt: expect.any(Date) as Date,
      },
    });
    expect(shopHistoryArgs.data).toMatchObject({
      shopOrderId: 501n,
      fromStatus: 'Shipping',
      toStatus: 'Delivered',
    });
    expect(shopCompletedHistoryArgs.data).toMatchObject({
      shopOrderId: 501n,
      fromStatus: 'Delivered',
      toStatus: 'Completed',
    });
    expect(orderHistoryArgs.data).toMatchObject({
      orderId: 900n,
      fromStatus: 'Shipping',
      toStatus: 'Delivered',
    });
    expect(orderCompletedHistoryArgs.data).toMatchObject({
      orderId: 900n,
      fromStatus: 'Delivered',
      toStatus: 'Completed',
    });
    expect(result.shipmentStatus).toBe('Delivered');
  });

  it('returns reserved stock only after GHN confirms the shipment was returned', async () => {
    const shipment = createUpdateShipmentTrackingEntity({
      shipmentStatus: 'InTransit',
      carrierOrderCode: 'GHN-ORDER-001',
      trackingNumber: 'GHN-ORDER-001',
    });
    const returnedShipment = createUpdateShipmentTrackingEntity({
      ...shipment,
      carrierStatus: 'returned',
      shipmentStatus: 'Returned',
    });
    prisma.shipment.findFirst.mockResolvedValue(shipment);
    prisma.shipment.update.mockResolvedValue(returnedShipment);
    prisma.shipment.findUniqueOrThrow.mockResolvedValue(returnedShipment);
    prisma.shipmentTrackingHistory.create.mockResolvedValue({ id: 820n });
    prisma.inventoryReservation.findUnique.mockResolvedValue({
      id: 600n,
      productInventoryId: 400n,
      quantity: 1,
      reservationStatus: 'Active',
    });
    prisma.inventoryReservation.update.mockResolvedValue({ id: 600n });
    prisma.productInventory.updateMany.mockResolvedValue({ count: 1 });
    prisma.productInventory.findUniqueOrThrow.mockResolvedValue({
      id: 400n,
      quantityOnHand: 12,
      quantityReserved: 0,
      quantityAvailable: 12,
    });
    prisma.inventoryTransaction.create.mockResolvedValue({ id: 840n });
    fakeCarrierClient.isConfigured.mockReturnValue(true);
    fakeCarrierClient.getOrderStatus = jest.fn().mockResolvedValue({
      status: 'Returned',
      carrierStatusRaw: 'returned',
      deliveredAt: null,
    });

    const result = await service.syncSellerShipment(adminUser, '501', '800');

    expect(prisma.inventoryReservation.update).toHaveBeenCalledWith({
      where: { id: 600n },
      data: {
        reservationStatus: 'Returned',
        returnedAt: expect.any(Date) as Date,
      },
    });
    expect(prisma.productInventory.updateMany).toHaveBeenCalledWith({
      where: { id: 400n, quantityReserved: { gte: 1 } },
      data: {
        quantityReserved: { decrement: 1 },
        quantityAvailable: { increment: 1 },
        updatedAt: expect.any(Date) as Date,
      },
    });
    expect(prisma.inventoryTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productInventoryId: 400n,
        transactionType: 'ReturnOrder',
        quantityChange: 1,
        quantityAfter: 12,
        referenceType: 'ORDER_ITEM',
        referenceId: 700n,
        createdByUserId: adminUser.id,
      }) as unknown,
    });
    expect(result.shipmentStatus).toBe('Returned');
  });
});
