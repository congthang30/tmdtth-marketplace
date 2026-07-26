import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppRole } from '../auth/app-role.enum';
import { AuthenticatedUser } from '../auth/types';
import { ShippingService } from './shipping.service';

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

type CreateShipmentShopOrderEntity = {
  id: bigint;
  orderId: bigint;
  shopId: bigint;
  orderStatus: string;
  shop: {
    id: bigint;
    ownerUserId: bigint;
    isDeleted: boolean;
  };
  order: {
    id: bigint;
    orderStatus: string;
    receiverName: string;
    receiverPhone: string;
    shippingProvince: string;
    shippingWard: string;
    shippingStreetAddress: string;
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

type ShippingCompanyDelegateMock = {
  findMany: jest.Mock<Promise<ShippingCompanyEntity[]>, [unknown]>;
  count: jest.Mock<Promise<number>, [unknown]>;
  findUnique: jest.Mock<Promise<ShippingCompanyEntity | null>, [unknown]>;
  create: jest.Mock<Promise<ShippingCompanyEntity>, [unknown]>;
  update: jest.Mock<Promise<ShippingCompanyEntity>, [unknown]>;
};

type ShippingServiceDelegateMock = {
  findMany: jest.Mock<Promise<ShippingServiceEntity[]>, [unknown]>;
  count: jest.Mock<Promise<number>, [unknown]>;
  findUnique: jest.Mock<
    Promise<ShippingServiceEntity | ShippingServiceWithCompanyEntity | null>,
    [unknown]
  >;
  create: jest.Mock<Promise<ShippingServiceEntity>, [unknown]>;
  update: jest.Mock<Promise<ShippingServiceEntity>, [unknown]>;
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
  count: jest.Mock<Promise<number>, [unknown]>;
  update: jest.Mock<Promise<unknown>, [unknown]>;
};

type ShipmentDelegateMock = {
  count: jest.Mock<Promise<number>, [unknown]>;
  create: jest.Mock<Promise<ShipmentEntity>, [unknown]>;
  findFirst: jest.Mock<Promise<UpdateShipmentTrackingEntity | null>, [unknown]>;
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
};

type InventoryTransactionDelegateMock = {
  create: jest.Mock<Promise<unknown>, [unknown]>;
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
  product: ProductDelegateMock;
  $transaction: jest.Mock<
    Promise<unknown>,
    [(client: PrismaMock) => Promise<unknown>]
  >;
};

type UpdateShipmentTrackingEntity = ShipmentEntity & {
  shopOrder: CreateShipmentShopOrderEntity;
  shippingService: ShippingServiceWithCompanyEntity;
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
    ownerUserId: adminUser.id,
    code: '11111111-1111-4111-8111-111111111111',
    companyName: 'Fast Ship',
    slug: 'fast-ship',
    email: 'ops@fast-ship.test',
    phoneNumber: '0900000001',
    taxCode: 'TAX001',
    addressText: '10 Logistics',
    companyStatus: 'Approved',
    approvedByUserId: adminUser.id,
    approvedAt: now,
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
    baseFee: { toString: () => '25000' },
    feePerKg: { toString: () => '5000' },
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
    orderStatus: 'Prepared',
    shop: {
      id: 100n,
      ownerUserId: adminUser.id,
      isDeleted: false,
    },
    order: {
      id: 900n,
      orderStatus: 'Prepared',
      receiverName: 'Customer Demo',
      receiverPhone: '0900000003',
      shippingProvince: 'TP.HCM',
      shippingWard: 'Phường Bến Nghé',
      shippingStreetAddress: '10 Demo',
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
    shipmentStatus: 'Pending',
    shippingFee: { toString: () => '35000' },
    codAmount: { toString: () => '0' },
    pickupAddress: 'Seller warehouse',
    deliveryAddress: '10 Demo, Phường Bến Nghé, Quận 1, TP.HCM',
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
    shippingService: createShippingServiceWithCompanyEntity(),
    items: [createShipmentItemEntity()],
    ...overrides,
  };
}

describe('ShippingService admin shipping companies', () => {
  let prisma: PrismaMock;
  let service: ShippingService;

  beforeEach(() => {
    prisma = {
      shippingCompany: {
        findMany: jest.fn<Promise<ShippingCompanyEntity[]>, [unknown]>(),
        count: jest.fn<Promise<number>, [unknown]>(),
        findUnique: jest.fn<Promise<ShippingCompanyEntity | null>, [unknown]>(),
        create: jest.fn<Promise<ShippingCompanyEntity>, [unknown]>(),
        update: jest.fn<Promise<ShippingCompanyEntity>, [unknown]>(),
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
        create: jest.fn<Promise<ShippingServiceEntity>, [unknown]>(),
        update: jest.fn<Promise<ShippingServiceEntity>, [unknown]>(),
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
      },
      inventoryTransaction: {
        create: jest.fn<Promise<unknown>, [unknown]>(),
      },
      product: {
        update: jest.fn<Promise<unknown>, [unknown]>(),
      },
      $transaction: jest.fn<
        Promise<unknown>,
        [(client: PrismaMock) => Promise<unknown>]
      >((callback) => callback(prisma)),
    };
    service = new ShippingService(prisma as unknown as PrismaService);
  });

  it('lists non-deleted shipping companies with pagination', async () => {
    prisma.shippingCompany.findMany.mockResolvedValue([
      createShippingCompanyEntity(),
    ]);
    prisma.shippingCompany.count.mockResolvedValue(1);

    const result = await service.listShippingCompanies({ page: 2, limit: 5 });
    const findArgs = prisma.shippingCompany.findMany.mock.calls[0][0] as {
      where: { isDeleted: boolean };
      skip: number;
      take: number;
    };

    expect(findArgs.where).toEqual({ isDeleted: false });
    expect(findArgs.skip).toBe(5);
    expect(findArgs.take).toBe(5);
    expect(result.meta).toEqual({
      page: 2,
      limit: 5,
      total: 1,
      totalPages: 1,
    });
    expect(result.items[0].slug).toBe('fast-ship');
  });

  it('creates an approved company owned by the current admin', async () => {
    prisma.shippingCompany.findUnique.mockResolvedValue(null);
    prisma.shippingCompany.create.mockResolvedValue(
      createShippingCompanyEntity(),
    );

    const result = await service.createShippingCompany(adminUser, {
      companyName: 'Fast Ship',
      slug: 'fast-ship',
      email: 'ops@fast-ship.test',
      phoneNumber: '0900000001',
      taxCode: 'TAX001',
      addressText: '10 Logistics',
    });
    const createArgs = prisma.shippingCompany.create.mock.calls[0][0] as {
      data: {
        ownerUserId: bigint;
        companyStatus: string;
        approvedByUserId: bigint;
        approvedAt: Date;
      };
    };

    expect(createArgs.data.ownerUserId).toBe(adminUser.id);
    expect(createArgs.data.companyStatus).toBe('Approved');
    expect(createArgs.data.approvedByUserId).toBe(adminUser.id);
    expect(createArgs.data.approvedAt).toBeInstanceOf(Date);
    expect(result.companyStatus).toBe('Approved');
  });

  it('rejects duplicate shipping company slug', async () => {
    prisma.shippingCompany.findUnique.mockResolvedValue(
      createShippingCompanyEntity(),
    );

    await expect(
      service.createShippingCompany(adminUser, {
        companyName: 'Fast Ship',
        slug: 'fast-ship',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.shippingCompany.create).not.toHaveBeenCalled();
  });

  it('updates company status to approved with approver metadata', async () => {
    prisma.shippingCompany.findUnique.mockResolvedValue(
      createShippingCompanyEntity({
        companyStatus: 'PendingApproval',
        approvedByUserId: null,
        approvedAt: null,
      }),
    );
    prisma.shippingCompany.update.mockResolvedValue(
      createShippingCompanyEntity({ companyStatus: 'Approved' }),
    );

    const result = await service.updateShippingCompany(adminUser, '10', {
      companyStatus: 'Approved',
    });
    const updateArgs = prisma.shippingCompany.update.mock.calls[0][0] as {
      data: {
        companyStatus: string;
        approvedByUserId: bigint;
        approvedAt: Date;
        updatedAt: Date;
      };
    };

    expect(updateArgs.data.companyStatus).toBe('Approved');
    expect(updateArgs.data.approvedByUserId).toBe(adminUser.id);
    expect(updateArgs.data.approvedAt).toBeInstanceOf(Date);
    expect(updateArgs.data.updatedAt).toBeInstanceOf(Date);
    expect(result.companyStatus).toBe('Approved');
  });

  it('soft deletes a shipping company', async () => {
    prisma.shippingCompany.findUnique.mockResolvedValue(
      createShippingCompanyEntity(),
    );
    prisma.shippingCompany.update.mockResolvedValue(
      createShippingCompanyEntity({
        companyStatus: 'Inactive',
        isDeleted: true,
        deletedAt: new Date('2026-07-03T01:00:00.000Z'),
      }),
    );

    const result = await service.deleteShippingCompany('10');
    const updateArgs = prisma.shippingCompany.update.mock.calls[0][0] as {
      where: { id: bigint };
      data: {
        companyStatus: string;
        isDeleted: boolean;
        deletedAt: Date;
      };
    };

    expect(updateArgs.where.id).toBe(10n);
    expect(updateArgs.data.companyStatus).toBe('Inactive');
    expect(updateArgs.data.isDeleted).toBe(true);
    expect(updateArgs.data.deletedAt).toBeInstanceOf(Date);
    expect(result).toEqual({ id: '10', deleted: true });
  });

  it('does not return deleted companies by id', async () => {
    prisma.shippingCompany.findUnique.mockResolvedValue(
      createShippingCompanyEntity({ isDeleted: true }),
    );

    await expect(service.getShippingCompany('10')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lists shipping services filtered by company with pagination', async () => {
    prisma.shippingService.findMany.mockResolvedValue([
      createShippingServiceEntity(),
    ]);
    prisma.shippingService.count.mockResolvedValue(1);

    const result = await service.listShippingServices({
      page: 2,
      limit: 5,
      shippingCompanyId: '10',
    });
    const findArgs = prisma.shippingService.findMany.mock.calls[0][0] as {
      where: { shippingCompanyId: bigint };
      skip: number;
      take: number;
    };

    expect(findArgs.where).toEqual({ shippingCompanyId: 10n });
    expect(findArgs.skip).toBe(5);
    expect(findArgs.take).toBe(5);
    expect(result.meta.total).toBe(1);
    expect(result.items[0].serviceCode).toBe('STD');
  });

  it('lists active shipping services for an approved shop', async () => {
    prisma.shop.findUnique.mockResolvedValue(createShippingQuoteShopEntity());
    prisma.shippingService.findMany.mockResolvedValue([
      createShippingServiceWithCompanyEntity(),
    ]);
    prisma.shippingService.count.mockResolvedValue(1);

    const result = await service.listActiveShippingServices({
      page: 1,
      limit: 10,
      shopId: '100',
    });
    const serviceFindArgs = prisma.shippingService.findMany.mock
      .calls[0][0] as {
      where: {
        isActive: boolean;
        shippingCompany: { companyStatus: string; isDeleted: boolean };
      };
      skip: number;
      take: number;
    };

    expect(serviceFindArgs.where).toEqual({
      isActive: true,
      shippingCompany: {
        companyStatus: 'Approved',
        isDeleted: false,
      },
    });
    expect(serviceFindArgs.skip).toBe(0);
    expect(serviceFindArgs.take).toBe(10);
    expect(result.items[0].serviceCode).toBe('STD');
  });

  it('creates a shipping service for an approved company', async () => {
    prisma.shippingCompany.findUnique.mockResolvedValue(
      createShippingCompanyEntity(),
    );
    prisma.shippingService.findUnique.mockResolvedValue(null);
    prisma.shippingService.create.mockResolvedValue(
      createShippingServiceEntity(),
    );

    const result = await service.createShippingService({
      shippingCompanyId: '10',
      serviceCode: 'STD',
      serviceName: 'Standard Delivery',
      baseFee: '25000',
      feePerKg: '5000',
      estimatedMinDays: 2,
      estimatedMaxDays: 5,
    });
    const createArgs = prisma.shippingService.create.mock.calls[0][0] as {
      data: {
        shippingCompanyId: bigint;
        serviceCode: string;
        baseFee: string;
        feePerKg: string;
        estimatedMinDays: number;
        estimatedMaxDays: number;
        isActive: boolean;
      };
    };

    expect(createArgs.data.shippingCompanyId).toBe(10n);
    expect(createArgs.data.serviceCode).toBe('STD');
    expect(createArgs.data.baseFee).toBe('25000');
    expect(createArgs.data.feePerKg).toBe('5000');
    expect(createArgs.data.estimatedMinDays).toBe(2);
    expect(createArgs.data.estimatedMaxDays).toBe(5);
    expect(createArgs.data.isActive).toBe(true);
    expect(result.baseFee).toBe('25000');
  });

  it('rejects duplicate shipping service code in the same company', async () => {
    prisma.shippingCompany.findUnique.mockResolvedValue(
      createShippingCompanyEntity(),
    );
    prisma.shippingService.findUnique.mockResolvedValue(
      createShippingServiceEntity(),
    );

    await expect(
      service.createShippingService({
        shippingCompanyId: '10',
        serviceCode: 'STD',
        serviceName: 'Standard Delivery',
        baseFee: '25000',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.shippingService.create).not.toHaveBeenCalled();
  });

  it('rejects creating service for a non-approved company', async () => {
    prisma.shippingCompany.findUnique.mockResolvedValue(
      createShippingCompanyEntity({ companyStatus: 'PendingApproval' }),
    );

    await expect(
      service.createShippingService({
        shippingCompanyId: '10',
        serviceCode: 'STD',
        serviceName: 'Standard Delivery',
        baseFee: '25000',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.shippingService.findUnique).not.toHaveBeenCalled();
    expect(prisma.shippingService.create).not.toHaveBeenCalled();
  });

  it('updates a shipping service and validates estimated day range', async () => {
    prisma.shippingService.findUnique.mockResolvedValue(
      createShippingServiceEntity(),
    );

    await expect(
      service.updateShippingService('20', {
        estimatedMinDays: 7,
        estimatedMaxDays: 3,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.shippingService.update).not.toHaveBeenCalled();
  });

  it('deactivates a shipping service', async () => {
    prisma.shippingService.findUnique.mockResolvedValue(
      createShippingServiceEntity(),
    );
    prisma.shippingService.update.mockResolvedValue(
      createShippingServiceEntity({ isActive: false }),
    );

    const result = await service.deactivateShippingService('20');
    const updateArgs = prisma.shippingService.update.mock.calls[0][0] as {
      where: { id: bigint };
      data: { isActive: boolean; updatedAt: Date };
    };

    expect(updateArgs.where.id).toBe(20n);
    expect(updateArgs.data.isActive).toBe(false);
    expect(updateArgs.data.updatedAt).toBeInstanceOf(Date);
    expect(result).toEqual({ id: '20', deactivated: true });
  });

  it('creates a shipping quote using service fee rules', async () => {
    prisma.shop.findUnique.mockResolvedValue(createShippingQuoteShopEntity());
    prisma.shippingService.findUnique.mockResolvedValue(
      createShippingServiceWithCompanyEntity(),
    );
    prisma.shippingQuote.create.mockResolvedValue(createShippingQuoteEntity());

    const result = await service.createShippingQuote({
      shopId: '100',
      shippingServiceId: '20',
      destinationProvince: 'TP.HCM',
      totalWeightGram: 1500,
    });
    const createArgs = prisma.shippingQuote.create.mock.calls[0][0] as {
      data: {
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
    };

    expect(createArgs.data.shopId).toBe(100n);
    expect(createArgs.data.shippingCompanyId).toBe(10n);
    expect(createArgs.data.shippingServiceId).toBe(20n);
    expect(createArgs.data.quotedFee.toString()).toBe('35000');
    expect(createArgs.data.estimatedMinDays).toBe(2);
    expect(createArgs.data.estimatedMaxDays).toBe(5);
    expect(
      createArgs.data.expiresAt.getTime() - createArgs.data.createdAt.getTime(),
    ).toBe(30 * 60 * 1000);
    expect(result.quotedFee).toBe('35000');
    expect(result.shop.slug).toBe('seller-home');
    expect(result.shippingCompany.slug).toBe('fast-ship');
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
        totalWeightGram: 1000,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.shippingQuote.create).not.toHaveBeenCalled();
  });

  it('creates a seller shipment from a prepared shop order', async () => {
    prisma.shopOrder.findFirst.mockResolvedValue(
      createShipmentShopOrderEntity(),
    );
    prisma.shipment.count.mockResolvedValue(0);
    prisma.shippingService.findUnique.mockResolvedValue(
      createShippingServiceWithCompanyEntity(),
    );
    prisma.shippingQuote.findUnique.mockResolvedValue(
      createShippingQuoteEntity({
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      }),
    );
    prisma.shipment.create.mockResolvedValue(createShipmentEntity());
    prisma.shipmentItem.create.mockResolvedValue(createShipmentItemEntity());
    prisma.shipmentTrackingHistory.create.mockResolvedValue({ id: 820n });
    prisma.shopOrder.update.mockResolvedValue({ id: 501n });
    prisma.orderStatusHistory.create.mockResolvedValue({ id: 830n });
    prisma.shopOrder.count.mockResolvedValue(0);
    prisma.order.findUnique.mockResolvedValue({ orderStatus: 'Prepared' });
    prisma.order.update.mockResolvedValue({ id: 900n });

    const result = await service.createSellerShipment(adminUser, '501', {
      shippingServiceId: '20',
      shippingQuoteId: '30',
      trackingNumber: 'TRACK-001',
      pickupAddress: 'Seller warehouse',
      expectedDeliveryAt: '2026-07-05T00:00:00.000Z',
      note: 'Ready for courier',
    });
    const shipmentArgs = prisma.shipment.create.mock.calls[0][0] as {
      data: {
        shopOrderId: bigint;
        shippingCompanyId: bigint;
        shippingServiceId: bigint;
        trackingNumber: string;
        shipmentStatus: string;
        shippingFee: { toString(): string };
        deliveryAddress: string;
        recipientName: string;
        expectedDeliveryAt: Date;
      };
    };
    const shipmentItemArgs = prisma.shipmentItem.create.mock.calls[0][0] as {
      data: {
        shipmentId: bigint;
        orderItemId: bigint;
        quantity: number;
      };
    };
    const shopOrderUpdateArgs = prisma.shopOrder.update.mock.calls[0][0] as {
      data: {
        shippingCompanyId: bigint;
        shippingServiceId: bigint;
        shippingQuoteId: bigint;
        shippingFeeAmount: { toString(): string };
        orderStatus: string;
      };
    };

    expect(shipmentArgs.data.shopOrderId).toBe(501n);
    expect(shipmentArgs.data.shippingCompanyId).toBe(10n);
    expect(shipmentArgs.data.shippingServiceId).toBe(20n);
    expect(shipmentArgs.data.trackingNumber).toBe('TRACK-001');
    expect(shipmentArgs.data.shipmentStatus).toBe('Pending');
    expect(shipmentArgs.data.shippingFee.toString()).toBe('35000');
    expect(shipmentArgs.data.deliveryAddress).toBe(
      '10 Demo, Phường Bến Nghé, TP.HCM',
    );
    expect(shipmentArgs.data.recipientName).toBe('Customer Demo');
    expect(shipmentArgs.data.expectedDeliveryAt).toEqual(
      new Date('2026-07-05T00:00:00.000Z'),
    );
    expect(shipmentItemArgs.data).toMatchObject({
      shipmentId: 800n,
      orderItemId: 700n,
      quantity: 1,
    });
    expect(shopOrderUpdateArgs.data.shippingQuoteId).toBe(30n);
    expect(shopOrderUpdateArgs.data.shippingFeeAmount.toString()).toBe('35000');
    expect(shopOrderUpdateArgs.data.orderStatus).toBe('Shipping');
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 900n },
      data: {
        orderStatus: 'Shipping',
        updatedAt: expect.any(Date) as Date,
      },
    });
    expect(result.shipmentStatus).toBe('Pending');
    expect(result.shippingFee).toBe('35000');
    expect(result.items).toHaveLength(1);
  });

  it('rejects shipment when shop order is not prepared', async () => {
    prisma.shopOrder.findFirst.mockResolvedValue(
      createShipmentShopOrderEntity({ orderStatus: 'Confirmed' }),
    );

    await expect(
      service.createSellerShipment(adminUser, '501', {
        shippingServiceId: '20',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.shipment.create).not.toHaveBeenCalled();
  });

  it('rejects shipment with an expired shipping quote', async () => {
    prisma.shopOrder.findFirst.mockResolvedValue(
      createShipmentShopOrderEntity(),
    );
    prisma.shipment.count.mockResolvedValue(0);
    prisma.shippingService.findUnique.mockResolvedValue(
      createShippingServiceWithCompanyEntity(),
    );
    prisma.shippingQuote.findUnique.mockResolvedValue(
      createShippingQuoteEntity({
        expiresAt: new Date('2020-01-01T00:00:00.000Z'),
      }),
    );

    await expect(
      service.createSellerShipment(adminUser, '501', {
        shippingServiceId: '20',
        shippingQuoteId: '30',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.shipment.create).not.toHaveBeenCalled();
  });

  it('updates seller shipment tracking and writes history', async () => {
    prisma.shipment.findFirst.mockResolvedValue(
      createUpdateShipmentTrackingEntity(),
    );
    prisma.shipment.update.mockResolvedValue(
      createUpdateShipmentTrackingEntity({
        shipmentStatus: 'InTransit',
        pickedUpAt: new Date('2026-07-03T03:00:00.000Z'),
      }),
    );
    prisma.shipmentTrackingHistory.create.mockResolvedValue({ id: 820n });

    const result = await service.updateSellerShipmentTracking(
      adminUser,
      '501',
      '800',
      {
        shipmentStatus: 'InTransit',
        trackingNumber: 'TRACK-002',
        locationText: 'Sorting hub',
        note: 'Package scanned',
      },
    );
    const findArgs = prisma.shipment.findFirst.mock.calls[0][0] as {
      where: {
        id: bigint;
        shopOrderId: bigint;
        shopOrder: { shop: { ownerUserId: bigint; isDeleted: boolean } };
      };
    };
    const updateArgs = prisma.shipment.update.mock.calls[0][0] as {
      data: {
        shipmentStatus: string;
        trackingNumber: string;
        pickedUpAt: Date;
      };
    };
    const historyArgs = prisma.shipmentTrackingHistory.create.mock
      .calls[0][0] as {
      data: {
        shipmentId: bigint;
        fromStatus: string;
        toStatus: string;
        locationText: string;
        note: string;
        updatedByUserId: bigint;
      };
    };

    expect(findArgs.where).toEqual({
      id: 800n,
      shopOrderId: 501n,
      shopOrder: {
        shop: {
          ownerUserId: adminUser.id,
          isDeleted: false,
        },
      },
    });
    expect(updateArgs.data.shipmentStatus).toBe('InTransit');
    expect(updateArgs.data.trackingNumber).toBe('TRACK-002');
    expect(updateArgs.data.pickedUpAt).toBeInstanceOf(Date);
    expect(historyArgs.data).toMatchObject({
      shipmentId: 800n,
      fromStatus: 'Pending',
      toStatus: 'InTransit',
      locationText: 'Sorting hub',
      note: 'Package scanned',
      updatedByUserId: adminUser.id,
    });
    expect(prisma.shopOrder.update).not.toHaveBeenCalled();
    expect(result.shipmentStatus).toBe('InTransit');
  });

  it('completes shop order and parent order when final shipment is delivered', async () => {
    prisma.shipment.findFirst.mockResolvedValue(
      createUpdateShipmentTrackingEntity({ shipmentStatus: 'InTransit' }),
    );
    prisma.shipment.update.mockResolvedValue(
      createUpdateShipmentTrackingEntity({
        shipmentStatus: 'Delivered',
        deliveredAt: new Date('2026-07-03T04:00:00.000Z'),
      }),
    );
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

    const result = await service.updateSellerShipmentTracking(
      adminUser,
      '501',
      '800',
      {
        shipmentStatus: 'Delivered',
        locationText: 'Customer address',
      },
    );
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

  it('rejects invalid shipment status transitions', async () => {
    prisma.shipment.findFirst.mockResolvedValue(
      createUpdateShipmentTrackingEntity(),
    );

    await expect(
      service.updateSellerShipmentTracking(adminUser, '501', '800', {
        shipmentStatus: 'Delivered',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.shipment.update).not.toHaveBeenCalled();
    expect(prisma.shipmentTrackingHistory.create).not.toHaveBeenCalled();
  });
});
