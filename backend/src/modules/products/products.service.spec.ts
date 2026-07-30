import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppRole } from '../auth/app-role.enum';
import { AuthenticatedUser } from '../auth/types';
import { ProductsService } from './products.service';

type ProductCreateArgs = {
  data: {
    shopId: bigint;
    categoryId: bigint;
    productName: string;
    slug: string;
    description: string | null;
    brand: string | null;
    basePrice: Prisma.Decimal;
    compareAtPrice: Prisma.Decimal | null;
    warrantyMonths: number;
    weightGram: number;
    productStatus: string;
    isViolation: boolean;
    isDeleted: boolean;
    createdByUserId: bigint;
    updatedByUserId: bigint;
    createdAt: Date;
    updatedAt: Date;
    shopCategoryProducts?: {
      create: Array<{ shopCategoryId: bigint }>;
    };
  };
  include: unknown;
};

type ProductUpdateArgs = {
  where: { id: bigint };
  data: {
    productName?: string;
    slug?: string;
    basePrice?: Prisma.Decimal;
    compareAtPrice?: Prisma.Decimal | null;
    productStatus?: string;
    isDeleted?: boolean;
    deletedAt?: Date;
    updatedByUserId?: bigint;
    updatedAt?: Date;
    updatedByUser?: unknown;
    category?: unknown;
    description?: string | null;
    brand?: string | null;
    warrantyMonths?: number;
    weightGram?: number;
    shopCategoryProducts?: {
      deleteMany: Record<string, never>;
      create: Array<{ shopCategoryId: bigint }>;
    };
  };
  include: unknown;
};

type ProductVariantCreateArgs = {
  data: {
    productId: bigint;
    sku: string;
    variantName: string;
    attributes: Prisma.InputJsonValue;
    price: Prisma.Decimal;
    compareAtPrice: Prisma.Decimal | null;
    weightGram: number;
    variantStatus: string;
    createdAt: Date;
    updatedAt: Date;
  };
  include: unknown;
};

type ProductVariantUpdateArgs = {
  where: { id: bigint };
  data: {
    sku?: string;
    variantName?: string;
    attributes?: Prisma.InputJsonValue;
    price?: Prisma.Decimal;
    compareAtPrice?: Prisma.Decimal | null;
    weightGram?: number;
    variantStatus?: string;
    updatedAt: Date;
  };
  include: unknown;
};

type ProductImageCreateArgs = {
  data: {
    productId: bigint;
    productVariantId: bigint | null;
    imageUrl: string;
    altText: string | null;
    sortOrder: number;
    isThumbnail: boolean;
    createdAt: Date;
  };
};

type ProductImageUpdateArgs = {
  where: { id: bigint };
  data: {
    productVariant?: unknown;
    imageUrl?: string;
    altText?: string | null;
    sortOrder?: number;
    isThumbnail?: boolean;
  };
};

type ProductImageUpdateManyArgs = {
  where: {
    productId: bigint;
    isThumbnail: boolean;
    NOT?: { id: bigint };
  };
  data: {
    isThumbnail: boolean;
  };
};

type ProductImageDeleteArgs = {
  where: { id: bigint };
};

type ProductInventoryCreateArgs = {
  data: {
    productId: bigint;
    productVariantId: bigint;
    quantityOnHand: number;
    quantityReserved: number;
    quantityAvailable: number;
    lowStockThreshold: number;
    updatedAt: Date;
  };
};

type ProductInventoryUpdateArgs = {
  where: { id: bigint };
  data: {
    quantityOnHand: number;
    quantityAvailable: number;
    lowStockThreshold: number;
    updatedAt: Date;
  };
};

type InventoryTransactionCreateArgs = {
  data: {
    productInventoryId: bigint;
    transactionType: string;
    quantityChange: number;
    quantityAfter: number;
    referenceType: string;
    referenceId: bigint;
    note: string;
    createdByUserId: bigint;
    createdAt: Date;
  };
};

type ProductEntity = {
  id: bigint;
  productName: string;
  slug: string;
  description: string | null;
  brand: string | null;
  basePrice: Prisma.Decimal;
  compareAtPrice: Prisma.Decimal | null;
  warrantyMonths: number;
  weightGram: number;
  productStatus: string;
  isViolation: boolean;
  isDeleted: boolean;
  soldCount: bigint;
  viewCount: bigint;
  createdAt: Date;
  updatedAt: Date | null;
  shop: {
    id: bigint;
    shopName: string;
    slug: string;
  };
  category: {
    id: bigint;
    categoryName: string;
    slug: string;
  };
  images: ProductImageEntity[];
  variants: ProductVariantEntity[];
};

type ProductLookup = {
  id: bigint;
  shopId?: bigint;
  basePrice?: Prisma.Decimal;
  compareAtPrice?: Prisma.Decimal | null;
  slug?: string;
  categoryId?: bigint;
  productName?: string;
  description?: string | null;
  brand?: string | null;
  warrantyMonths?: number;
  productStatus?: string;
};

type ProductVariantEntity = {
  id: bigint;
  productId: bigint;
  sku: string;
  variantName: string;
  attributes: Prisma.JsonValue;
  price: Prisma.Decimal;
  compareAtPrice: Prisma.Decimal | null;
  weightGram: number;
  variantStatus: string;
  createdAt: Date;
  updatedAt: Date | null;
  inventoryRecords: Array<{ quantityAvailable: number }>;
};

type ProductImageEntity = {
  id: bigint;
  productId: bigint;
  productVariantId: bigint | null;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
  isThumbnail: boolean;
  createdAt: Date;
};

type ProductInventoryEntity = {
  id: bigint;
  productId: bigint;
  productVariantId: bigint;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  quantityDamaged: number;
  quantityIncoming: number;
  lowStockThreshold: number;
  updatedAt: Date;
};

type ProductDelegateMock = {
  findMany: jest.Mock<Promise<ProductEntity[]>, [unknown]>;
  findFirst: jest.Mock<Promise<ProductLookup | null>, [unknown]>;
  count: jest.Mock<Promise<number>, [unknown]>;
  create: jest.Mock<Promise<ProductEntity>, [ProductCreateArgs]>;
  update: jest.Mock<Promise<ProductEntity>, [ProductUpdateArgs]>;
};

type ProductVariantDelegateMock = {
  findMany: jest.Mock<Promise<ProductVariantEntity[]>, [unknown]>;
  findFirst: jest.Mock<
    Promise<ProductVariantEntity | { id: bigint } | null>,
    [unknown]
  >;
  create: jest.Mock<Promise<ProductVariantEntity>, [ProductVariantCreateArgs]>;
  update: jest.Mock<Promise<ProductVariantEntity>, [ProductVariantUpdateArgs]>;
};

type ProductImageDelegateMock = {
  findMany: jest.Mock<Promise<ProductImageEntity[]>, [unknown]>;
  findFirst: jest.Mock<Promise<ProductImageEntity | null>, [unknown]>;
  count: jest.Mock<Promise<number>, [unknown]>;
  create: jest.Mock<Promise<ProductImageEntity>, [ProductImageCreateArgs]>;
  update: jest.Mock<Promise<ProductImageEntity>, [ProductImageUpdateArgs]>;
  updateMany: jest.Mock<
    Promise<{ count: number }>,
    [ProductImageUpdateManyArgs]
  >;
  delete: jest.Mock<Promise<ProductImageEntity>, [ProductImageDeleteArgs]>;
};

type ProductInventoryDelegateMock = {
  findUnique: jest.Mock<Promise<ProductInventoryEntity | null>, [unknown]>;
  create: jest.Mock<
    Promise<ProductInventoryEntity>,
    [ProductInventoryCreateArgs]
  >;
  update: jest.Mock<
    Promise<ProductInventoryEntity>,
    [ProductInventoryUpdateArgs]
  >;
  updateMany: jest.Mock<Promise<{ count: number }>, [unknown]>;
  findUniqueOrThrow: jest.Mock<Promise<ProductInventoryEntity>, [unknown]>;
};

type InventoryTransactionDelegateMock = {
  create: jest.Mock<Promise<{ id: bigint }>, [InventoryTransactionCreateArgs]>;
};

type UploadAssetDelegateMock = {
  findFirst: jest.Mock<Promise<{ id: bigint; url: string } | null>, [unknown]>;
  updateMany: jest.Mock<Promise<{ count: number }>, [unknown]>;
};

type PrismaTransactionMock = {
  $executeRaw: jest.Mock<Promise<number>, unknown[]>;
  uploadAsset: UploadAssetDelegateMock;
  productVariant: ProductVariantDelegateMock;
  productImage: ProductImageDelegateMock;
  productInventory: ProductInventoryDelegateMock;
  inventoryTransaction: InventoryTransactionDelegateMock;
};

type TransactionCallback = (tx: PrismaTransactionMock) => Promise<unknown>;
type TransactionInput = TransactionCallback | Promise<unknown>[];

type PrismaMock = {
  $transaction: jest.Mock<Promise<unknown>, [TransactionInput]>;
  $executeRaw: jest.Mock<Promise<number>, unknown[]>;
  shop: {
    findFirst: jest.Mock<Promise<{ id: bigint } | null>, [unknown]>;
  };
  category: {
    findFirst: jest.Mock<Promise<{ id: bigint } | null>, [unknown]>;
  };
  shopCategory: {
    count: jest.Mock<Promise<number>, [unknown]>;
  };
  product: ProductDelegateMock;
  productVariant: ProductVariantDelegateMock;
  uploadAsset: UploadAssetDelegateMock;
  productImage: ProductImageDelegateMock;
  productInventory: ProductInventoryDelegateMock;
  inventoryTransaction: InventoryTransactionDelegateMock;
};

const sellerUser: AuthenticatedUser = {
  id: 7n,
  idString: '7',
  email: 'seller@example.com',
  phoneNumber: null,
  userStatus: 'Active',
  roles: [AppRole.Customer, AppRole.Seller],
  profile: null,
};

const createProductDto = {
  shopId: '1',
  categoryId: '10',
  productName: 'Đèn bàn gỗ',
  description: 'Đèn bàn cho phòng ngủ',
  brand: 'Home Demo',
  basePrice: '159000',
  compareAtPrice: '199000',
  warrantyMonths: 6,
  weightGram: 450,
  productStatus: 'Draft' as const,
};

function createProductEntity(
  overrides: Partial<ProductEntity> = {},
): ProductEntity {
  return {
    id: 100n,
    productName: createProductDto.productName,
    slug: 'den-ban-go',
    description: createProductDto.description,
    brand: createProductDto.brand,
    basePrice: new Prisma.Decimal(createProductDto.basePrice),
    compareAtPrice: new Prisma.Decimal(createProductDto.compareAtPrice),
    warrantyMonths: createProductDto.warrantyMonths,
    weightGram: createProductDto.weightGram,
    productStatus: createProductDto.productStatus,
    isViolation: false,
    isDeleted: false,
    soldCount: 0n,
    viewCount: 0n,
    createdAt: new Date('2026-07-03T00:00:00.000Z'),
    updatedAt: new Date('2026-07-03T00:00:00.000Z'),
    shop: {
      id: 1n,
      shopName: 'Seller Home',
      slug: 'seller-home',
    },
    category: {
      id: 10n,
      categoryName: 'Đèn ngủ',
      slug: 'den-ngu',
    },
    images: [],
    variants: [],
    ...overrides,
  };
}

function createVariantEntity(
  overrides: Partial<ProductVariantEntity> = {},
): ProductVariantEntity {
  return {
    id: 200n,
    productId: 100n,
    sku: 'DEN-BAN-GO',
    variantName: 'Màu gỗ',
    attributes: { 'Màu sắc': 'Gỗ' },
    price: new Prisma.Decimal('159000'),
    compareAtPrice: new Prisma.Decimal('199000'),
    weightGram: 450,
    variantStatus: 'Active',
    createdAt: new Date('2026-07-03T00:00:00.000Z'),
    updatedAt: new Date('2026-07-03T00:00:00.000Z'),
    inventoryRecords: [{ quantityAvailable: 8 }],
    ...overrides,
  };
}

function createImageEntity(
  overrides: Partial<ProductImageEntity> = {},
): ProductImageEntity {
  return {
    id: 300n,
    productId: 100n,
    productVariantId: null,
    imageUrl: 'https://images.example.com/demo/den-ban-go.jpg',
    altText: 'Đèn bàn gỗ',
    sortOrder: 1,
    isThumbnail: true,
    createdAt: new Date('2026-07-03T00:00:00.000Z'),
    ...overrides,
  };
}

function createInventoryEntity(
  overrides: Partial<ProductInventoryEntity> = {},
): ProductInventoryEntity {
  return {
    id: 400n,
    productId: 100n,
    productVariantId: 200n,
    quantityOnHand: 10,
    quantityReserved: 2,
    quantityAvailable: 8,
    quantityDamaged: 0,
    quantityIncoming: 0,
    lowStockThreshold: 5,
    updatedAt: new Date('2026-07-03T00:00:00.000Z'),
    ...overrides,
  };
}

describe('ProductsService', () => {
  let prisma: PrismaMock;
  let service: ProductsService;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn<Promise<unknown>, [TransactionCallback]>(),
      $executeRaw: jest.fn<Promise<number>, unknown[]>(),
      shop: {
        findFirst: jest.fn<Promise<{ id: bigint } | null>, [unknown]>(),
      },
      category: {
        findFirst: jest.fn<Promise<{ id: bigint } | null>, [unknown]>(),
      },
      shopCategory: {
        count: jest.fn<Promise<number>, [unknown]>(),
      },
      product: {
        findMany: jest.fn<Promise<ProductEntity[]>, [unknown]>(),
        findFirst: jest.fn<Promise<ProductLookup | null>, [unknown]>(),
        count: jest.fn<Promise<number>, [unknown]>(),
        create: jest.fn<Promise<ProductEntity>, [ProductCreateArgs]>(),
        update: jest.fn<Promise<ProductEntity>, [ProductUpdateArgs]>(),
      },
      productVariant: {
        findMany: jest.fn<Promise<ProductVariantEntity[]>, [unknown]>(),
        findFirst: jest.fn<
          Promise<ProductVariantEntity | { id: bigint } | null>,
          [unknown]
        >(),
        create: jest.fn<
          Promise<ProductVariantEntity>,
          [ProductVariantCreateArgs]
        >(),
        update: jest.fn<
          Promise<ProductVariantEntity>,
          [ProductVariantUpdateArgs]
        >(),
      },

      uploadAsset: {
        findFirst: jest.fn<
          Promise<{ id: bigint; url: string } | null>,
          [unknown]
        >(),
        updateMany: jest.fn<Promise<{ count: number }>, [unknown]>(),
      },
      productImage: {
        findMany: jest.fn<Promise<ProductImageEntity[]>, [unknown]>(),
        findFirst: jest.fn<Promise<ProductImageEntity | null>, [unknown]>(),
        count: jest.fn<Promise<number>, [unknown]>(),
        create: jest.fn<
          Promise<ProductImageEntity>,
          [ProductImageCreateArgs]
        >(),
        update: jest.fn<
          Promise<ProductImageEntity>,
          [ProductImageUpdateArgs]
        >(),
        updateMany: jest.fn<
          Promise<{ count: number }>,
          [ProductImageUpdateManyArgs]
        >(),
        delete: jest.fn<
          Promise<ProductImageEntity>,
          [ProductImageDeleteArgs]
        >(),
      },
      productInventory: {
        findUnique: jest.fn<
          Promise<ProductInventoryEntity | null>,
          [unknown]
        >(),
        create: jest.fn<
          Promise<ProductInventoryEntity>,
          [ProductInventoryCreateArgs]
        >(),
        update: jest.fn<
          Promise<ProductInventoryEntity>,
          [ProductInventoryUpdateArgs]
        >(),
        updateMany: jest.fn<Promise<{ count: number }>, [unknown]>(),
        findUniqueOrThrow: jest.fn<
          Promise<ProductInventoryEntity>,
          [unknown]
        >(),
      },
      inventoryTransaction: {
        create: jest.fn<
          Promise<{ id: bigint }>,
          [InventoryTransactionCreateArgs]
        >(),
      },
    };

    prisma.$executeRaw.mockResolvedValue(1);
    prisma.$transaction.mockImplementation((input) =>
      Array.isArray(input) ? Promise.all(input) : input(prisma),
    );

    service = new ProductsService(prisma as unknown as PrismaService);
  });

  it('lists products from approved shops owned by the current seller', async () => {
    prisma.product.findMany.mockResolvedValue([
      createProductEntity({
        images: [createImageEntity()],
        variants: [createVariantEntity()],
      }),
    ]);
    prisma.product.count.mockResolvedValue(1);

    const result = await service.listSellerProducts(sellerUser, {
      page: 2,
      limit: 5,
    });
    const findArgs = prisma.product.findMany.mock.calls[0][0] as {
      where: {
        isDeleted: boolean;
        shop: {
          ownerUserId: bigint;
          shopStatus: string;
          isDeleted: boolean;
        };
      };
      skip: number;
      take: number;
    };
    const countArgs = prisma.product.count.mock.calls[0][0] as {
      where: {
        shop: {
          ownerUserId: bigint;
        };
      };
    };

    expect(findArgs.where).toEqual({
      isDeleted: false,
      shop: {
        ownerUserId: sellerUser.id,
        shopStatus: 'Approved',
        isDeleted: false,
      },
    });
    expect(findArgs.skip).toBe(5);
    expect(findArgs.take).toBe(5);
    expect(countArgs.where.shop.ownerUserId).toBe(sellerUser.id);
    expect(result.meta).toEqual({
      page: 2,
      limit: 5,
      total: 1,
      totalPages: 1,
    });
    expect(result.items[0].slug).toBe('den-ban-go');
    expect(result.items[0].thumbnailImage?.imageUrl).toBe(
      'https://images.example.com/demo/den-ban-go.jpg',
    );
    expect(result.items[0].quantityAvailable).toBe(8);
  });

  it('atomically creates canonical seller shop-category assignments', async () => {
    prisma.shop.findFirst.mockResolvedValue({ id: 1n });
    prisma.category.findFirst.mockResolvedValue({ id: 10n });
    prisma.product.findFirst.mockResolvedValue(null);
    prisma.shopCategory.count.mockResolvedValue(2);
    prisma.product.create.mockResolvedValue(createProductEntity());

    await service.createSellerProduct(sellerUser, {
      ...createProductDto,
      shopCategoryIds: ['20', '20', '21'],
    });

    expect(prisma.shopCategory.count).toHaveBeenCalledWith({
      where: { id: { in: [20n, 21n] }, shopId: 1n, isActive: true },
    });
    expect(
      prisma.product.create.mock.calls[0][0].data.shopCategoryProducts,
    ).toEqual({ create: [{ shopCategoryId: 20n }, { shopCategoryId: 21n }] });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects foreign or inactive shop categories before starting create transaction', async () => {
    prisma.shop.findFirst.mockResolvedValue({ id: 1n });
    prisma.category.findFirst.mockResolvedValue({ id: 10n });
    prisma.product.findFirst.mockResolvedValue(null);
    prisma.shopCategory.count.mockResolvedValue(1);

    await expect(
      service.createSellerProduct(sellerUser, {
        ...createProductDto,
        shopCategoryIds: ['20', '21'],
      }),
    ).rejects.toMatchObject({ response: { code: 'INVALID_SHOP_CATEGORIES' } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  it('preserves assignments when omitted and atomically clears them for an empty update', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 100n,
      shopId: 1n,
      categoryId: 10n,
      productName: createProductDto.productName,
      description: createProductDto.description,
      brand: createProductDto.brand,
      warrantyMonths: 6,
      productStatus: 'Draft',
      basePrice: new Prisma.Decimal('159000'),
      compareAtPrice: new Prisma.Decimal('199000'),
    });
    prisma.product.update.mockResolvedValue(createProductEntity());

    await service.updateSellerProduct(sellerUser, '100', { brand: 'Mới' });
    expect(
      prisma.product.update.mock.calls[0][0].data.shopCategoryProducts,
    ).toBeUndefined();

    prisma.product.update.mockClear();
    await service.updateSellerProduct(sellerUser, '100', {
      shopCategoryIds: [],
    });
    expect(
      prisma.product.update.mock.calls[0][0].data.shopCategoryProducts,
    ).toEqual({ deleteMany: {}, create: [] });
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('creates a draft product for an owned approved shop', async () => {
    prisma.shop.findFirst.mockResolvedValue({ id: 1n });
    prisma.category.findFirst.mockResolvedValue({ id: 10n });
    prisma.product.findFirst.mockResolvedValue(null);
    prisma.product.create.mockResolvedValue(createProductEntity());

    const result = await service.createSellerProduct(
      sellerUser,
      createProductDto,
    );
    const createArgs = prisma.product.create.mock.calls[0][0];

    expect(prisma.shop.findFirst).toHaveBeenCalledWith({
      where: {
        id: 1n,
        ownerUserId: sellerUser.id,
        shopStatus: 'Approved',
        isDeleted: false,
      },
      select: { id: true },
    });
    expect(createArgs.data.shopId).toBe(1n);
    expect(createArgs.data.categoryId).toBe(10n);
    expect(createArgs.data.slug).toBe('den-ban-go');
    expect(createArgs.data.basePrice.toString()).toBe('159000');
    expect(createArgs.data.compareAtPrice?.toString()).toBe('199000');
    expect(createArgs.data.productStatus).toBe('Draft');
    expect(createArgs.data.createdByUserId).toBe(sellerUser.id);
    expect(result.slug).toBe('den-ban-go');
    expect(result.productStatus).toBe('Draft');
    expect(result.priceMin).toBe('159000');
    expect(result.variants).toEqual([]);
  });

  it('rejects shops that are not owned and approved for the seller', async () => {
    prisma.shop.findFirst.mockResolvedValue(null);
    prisma.category.findFirst.mockResolvedValue({ id: 10n });
    prisma.product.findFirst.mockResolvedValue(null);

    await expect(
      service.createSellerProduct(sellerUser, createProductDto),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  it('rejects duplicate product slugs inside a shop', async () => {
    prisma.shop.findFirst.mockResolvedValue({ id: 1n });
    prisma.category.findFirst.mockResolvedValue({ id: 10n });
    prisma.product.findFirst.mockResolvedValue({ id: 100n });

    await expect(
      service.createSellerProduct(sellerUser, createProductDto),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  it('rejects compareAtPrice below basePrice', async () => {
    prisma.shop.findFirst.mockResolvedValue({ id: 1n });
    prisma.category.findFirst.mockResolvedValue({ id: 10n });
    prisma.product.findFirst.mockResolvedValue(null);

    await expect(
      service.createSellerProduct(sellerUser, {
        ...createProductDto,
        compareAtPrice: '100000',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  it('updates an owned product and regenerates slug from productName', async () => {
    prisma.product.findFirst
      .mockResolvedValueOnce({
        id: 100n,
        shopId: 1n,
        basePrice: new Prisma.Decimal('159000'),
        compareAtPrice: new Prisma.Decimal('199000'),
      })
      .mockResolvedValueOnce(null);
    prisma.product.update.mockResolvedValue(
      createProductEntity({
        productName: 'Đèn bàn tre',
        slug: 'den-ban-tre',
        basePrice: new Prisma.Decimal('179000'),
        compareAtPrice: new Prisma.Decimal('209000'),
      }),
    );

    const result = await service.updateSellerProduct(sellerUser, '100', {
      productName: 'Đèn bàn tre',
      basePrice: '179000',
      compareAtPrice: '209000',
    });
    const updateArgs = prisma.product.update.mock.calls[0][0];

    expect(updateArgs.where.id).toBe(100n);
    expect(updateArgs.data.productName).toBe('Đèn bàn tre');
    expect(updateArgs.data.slug).toBe('den-ban-tre');
    expect(updateArgs.data.basePrice?.toString()).toBe('179000');
    expect(updateArgs.data.compareAtPrice?.toString()).toBe('209000');
    expect(result.slug).toBe('den-ban-tre');
  });

  it('rejects update when the product is outside seller ownership', async () => {
    prisma.product.findFirst.mockResolvedValue(null);

    await expect(
      service.updateSellerProduct(sellerUser, '100', {
        productName: 'Đèn bàn tre',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it('rejects update to a duplicate slug inside the same shop', async () => {
    prisma.product.findFirst
      .mockResolvedValueOnce({
        id: 100n,
        shopId: 1n,
        basePrice: new Prisma.Decimal('159000'),
        compareAtPrice: null,
      })
      .mockResolvedValueOnce({ id: 101n });

    await expect(
      service.updateSellerProduct(sellerUser, '100', {
        productName: 'Đèn bàn gỗ',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it('soft deletes an owned product', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 100n,
      shopId: 1n,
      basePrice: new Prisma.Decimal('159000'),
      compareAtPrice: null,
    });
    prisma.product.update.mockResolvedValue(
      createProductEntity({
        productStatus: 'Deleted',
        isDeleted: true,
      }),
    );

    const result = await service.deleteSellerProduct(sellerUser, '100');
    const updateArgs = prisma.product.update.mock.calls[0][0];

    expect(updateArgs.where.id).toBe(100n);
    expect(updateArgs.data.productStatus).toBe('Deleted');
    expect(updateArgs.data.isDeleted).toBe(true);
    expect(updateArgs.data.deletedAt).toBeInstanceOf(Date);
    expect(updateArgs.data.updatedByUserId).toBe(sellerUser.id);
    expect(result.productStatus).toBe('Deleted');
    expect(result.isDeleted).toBe(true);
  });

  it('derives the name and atomically creates variant inventory from attributes', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 100n,
      shopId: 1n,
      slug: 'den-ban-go',
      basePrice: new Prisma.Decimal('159000'),
      compareAtPrice: null,
    });
    prisma.productVariant.findFirst.mockResolvedValue(null);
    prisma.productVariant.findMany.mockResolvedValue([]);
    prisma.productVariant.create.mockResolvedValue(createVariantEntity());
    prisma.productInventory.create.mockResolvedValue(
      createInventoryEntity({
        quantityOnHand: 8,
        quantityReserved: 0,
        quantityAvailable: 8,
      }),
    );
    prisma.inventoryTransaction.create.mockResolvedValue({ id: 500n });

    const result = await service.createSellerProductVariant(sellerUser, '100', {
      attributes: { 'Màu sắc': 'Đen', 'Kích cỡ': 'S' },
      price: '159000',
      compareAtPrice: '199000',
      weightGram: 450,
      quantityOnHand: 8,
    });
    const createArgs = prisma.productVariant.create.mock.calls[0][0];
    const inventoryArgs = prisma.productInventory.create.mock.calls[0][0];

    expect(createArgs.data).toMatchObject({
      productId: 100n,
      variantName: 'Đen / S',
      attributes: { 'Màu sắc': 'Đen', 'Kích cỡ': 'S' },
    });
    expect(createArgs.data.sku).toMatch(/^DENBANGO-[A-F0-9]{8}$/);
    expect(inventoryArgs.data).toMatchObject({
      productId: 100n,
      productVariantId: 200n,
      quantityOnHand: 8,
      quantityReserved: 0,
      quantityAvailable: 8,
    });
    expect(prisma.inventoryTransaction.create).toHaveBeenCalled();
    expect(result.quantityAvailable).toBe(8);
  });

  it('atomically creates a batch of materialized attribute combinations', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 100n,
      shopId: 1n,
      slug: 'ao-thun',
      basePrice: new Prisma.Decimal('159000'),
      compareAtPrice: null,
    });
    prisma.productVariant.findFirst.mockResolvedValue(null);
    prisma.productVariant.findMany.mockResolvedValue([]);
    const combinations = [
      { 'Màu sắc': 'Đen', 'Kích cỡ': 'S' },
      { 'Màu sắc': 'Đen', 'Kích cỡ': 'M' },
      { 'Màu sắc': 'Đỏ', 'Kích cỡ': 'S' },
      { 'Màu sắc': 'Đỏ', 'Kích cỡ': 'M' },
    ];
    combinations.forEach((attributes, index) => {
      prisma.productVariant.create.mockResolvedValueOnce(
        createVariantEntity({
          id: BigInt(200 + index),
          attributes,
          variantName: Object.values(attributes).join(' / '),
        }),
      );
      prisma.productInventory.create.mockResolvedValueOnce(
        createInventoryEntity({
          id: BigInt(400 + index),
          productVariantId: BigInt(200 + index),
          quantityOnHand: 5,
          quantityReserved: 0,
          quantityAvailable: 5,
        }),
      );
    });
    prisma.inventoryTransaction.create.mockResolvedValue({ id: 500n });

    const result = await service.createSellerProductVariantsBatch(
      sellerUser,
      '100',
      {
        variants: combinations.map((attributes) => ({
          attributes,
          price: '159000',
          quantityOnHand: 5,
        })),
      },
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.productVariant.findFirst.mock.invocationCallOrder[0],
    );
    expect(prisma.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.productVariant.create.mock.invocationCallOrder[0],
    );
    expect(prisma.productVariant.create).toHaveBeenCalledTimes(4);
    expect(prisma.productInventory.create).toHaveBeenCalledTimes(4);
    expect(prisma.inventoryTransaction.create).toHaveBeenCalledTimes(4);
    expect(
      prisma.productVariant.create.mock.calls.map(
        ([call]) => call.data.attributes,
      ),
    ).toEqual(combinations);
    expect(result.map((variant) => variant.attributes)).toEqual(combinations);
  });

  it('rejects duplicate combinations inside a batch before its transaction', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 100n,
      shopId: 1n,
      slug: 'ao-thun',
      basePrice: new Prisma.Decimal('159000'),
      compareAtPrice: null,
    });

    await expect(
      service.createSellerProductVariantsBatch(sellerUser, '100', {
        variants: [
          {
            attributes: { 'Màu sắc': 'Đen', 'Kích cỡ': 'M' },
            price: '159000',
            quantityOnHand: 5,
          },
          {
            attributes: { 'Kích cỡ': 'M', 'Màu sắc': 'Đen' },
            price: '159000',
            quantityOnHand: 7,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.productVariant.create).not.toHaveBeenCalled();
  });

  it('rejects a third classification level before its transaction', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 100n,
      shopId: 1n,
      slug: 'ao-thun',
      basePrice: new Prisma.Decimal('159000'),
      compareAtPrice: null,
    });

    await expect(
      service.createSellerProductVariantsBatch(sellerUser, '100', {
        variants: [
          {
            attributes: {
              'Màu sắc': 'Đen',
              'Kích cỡ': 'M',
              'Chất liệu': 'Cotton',
            },
            price: '159000',
            quantityOnHand: 5,
          },
        ],
      }),
    ).rejects.toMatchObject({
      response: { code: 'INVALID_VARIANT_ATTRIBUTE_LEVELS' },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects inconsistent classification level names inside a batch', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 100n,
      shopId: 1n,
      slug: 'ao-thun',
      basePrice: new Prisma.Decimal('159000'),
      compareAtPrice: null,
    });

    await expect(
      service.createSellerProductVariantsBatch(sellerUser, '100', {
        variants: [
          {
            attributes: { 'Màu sắc': 'Đen', 'Kích cỡ': 'M' },
            price: '159000',
            quantityOnHand: 5,
          },
          {
            attributes: { 'Màu sắc': 'Đỏ', 'Kích cỡ sss': 'L' },
            price: '159000',
            quantityOnHand: 5,
          },
        ],
      }),
    ).rejects.toMatchObject({
      response: { code: 'VARIANT_ATTRIBUTE_SCHEMA_MISMATCH' },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a duplicate attributes combination', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 100n,
      shopId: 1n,
      slug: 'den-ban-go',
      basePrice: new Prisma.Decimal('159000'),
      compareAtPrice: null,
    });
    prisma.productVariant.findFirst.mockResolvedValue(null);
    prisma.productVariant.findMany.mockResolvedValue([
      createVariantEntity({ attributes: { 'Màu sắc': 'Đen' } }),
    ]);

    await expect(
      service.createSellerProductVariant(sellerUser, '100', {
        attributes: { 'Màu sắc': 'Đen' },
        price: '159000',
        quantityOnHand: 0,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.productVariant.create).not.toHaveBeenCalled();
  });

  it('creates zero inventory without a zero-change transaction', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 100n,
      shopId: 1n,
      slug: 'den-ban-go',
      basePrice: new Prisma.Decimal('159000'),
      compareAtPrice: null,
    });
    prisma.productVariant.findFirst.mockResolvedValue(null);
    prisma.productVariant.findMany.mockResolvedValue([]);
    prisma.productVariant.create.mockResolvedValue(createVariantEntity());
    prisma.productInventory.create.mockResolvedValue(
      createInventoryEntity({
        quantityOnHand: 0,
        quantityReserved: 0,
        quantityAvailable: 0,
      }),
    );

    const result = await service.createSellerProductVariant(sellerUser, '100', {
      attributes: { 'Phiên bản': 'Tiêu chuẩn' },
      price: '159000',
      quantityOnHand: 0,
    });

    expect(prisma.productInventory.create).toHaveBeenCalled();
    expect(prisma.inventoryTransaction.create).not.toHaveBeenCalled();
    expect(result.quantityAvailable).toBe(0);
  });

  it('rejects empty variant attribute names and values', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 100n,
      shopId: 1n,
      slug: 'den-ban-go',
      basePrice: new Prisma.Decimal('159000'),
      compareAtPrice: null,
    });
    prisma.productVariant.findFirst.mockResolvedValue(null);

    await expect(
      service.createSellerProductVariant(sellerUser, '100', {
        attributes: { 'Màu sắc': '   ' },
        price: '159000',
        quantityOnHand: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.productVariant.create).not.toHaveBeenCalled();
  });

  it('updates an owned variant', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 100n,
      shopId: 1n,
      basePrice: new Prisma.Decimal('159000'),
      compareAtPrice: null,
    });
    prisma.productVariant.findFirst.mockResolvedValue(
      createVariantEntity({ sku: 'DEN-BAN-GO' }),
    );
    prisma.productVariant.findMany.mockResolvedValue([]);
    prisma.productVariant.update.mockResolvedValue(
      createVariantEntity({
        sku: 'DEN-BAN-TRE',
        variantName: 'Tre',
        attributes: { 'Màu sắc': 'Tre' },
        price: new Prisma.Decimal('179000'),
        compareAtPrice: null,
        variantStatus: 'Inactive',
      }),
    );

    const result = await service.updateSellerProductVariant(
      sellerUser,
      '100',
      '200',
      {
        attributes: { 'Màu sắc': 'Tre' },
        price: '179000',
        compareAtPrice: undefined,
        variantStatus: 'Inactive',
      },
    );
    const updateArgs = prisma.productVariant.update.mock.calls[0][0];

    expect(updateArgs.data.attributes).toEqual({ 'Màu sắc': 'Tre' });
    expect(updateArgs.data.variantName).toBe('Tre');
    expect(updateArgs.data.price?.toString()).toBe('179000');
    expect(updateArgs.data.variantStatus).toBe('Inactive');
    expect(result.variantName).toBe('Tre');
    expect(result.variantStatus).toBe('Inactive');
  });

  it('rejects renaming a locked classification level', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 100n,
      shopId: 1n,
      basePrice: new Prisma.Decimal('159000'),
      compareAtPrice: null,
    });
    prisma.productVariant.findFirst.mockResolvedValue(
      createVariantEntity({
        attributes: { 'Màu sắc': 'Đen', 'Kích cỡ': 'M' },
      }),
    );

    await expect(
      service.updateSellerProductVariant(sellerUser, '100', '200', {
        attributes: { 'Màu sắc': 'Đen', 'Kích cỡ sss': 'M' },
      }),
    ).rejects.toMatchObject({
      response: { code: 'VARIANT_ATTRIBUTE_SCHEMA_MISMATCH' },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.productVariant.update).not.toHaveBeenCalled();
  });

  it('soft deletes an owned variant by marking it inactive', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 100n,
      shopId: 1n,
      basePrice: new Prisma.Decimal('159000'),
      compareAtPrice: null,
    });
    prisma.productVariant.findFirst.mockResolvedValue(createVariantEntity());
    prisma.productVariant.update.mockResolvedValue(
      createVariantEntity({ variantStatus: 'Inactive' }),
    );

    const result = await service.deleteSellerProductVariant(
      sellerUser,
      '100',
      '200',
    );
    const updateArgs = prisma.productVariant.update.mock.calls[0][0];

    expect(updateArgs.where.id).toBe(200n);
    expect(updateArgs.data.variantStatus).toBe('Inactive');
    expect(updateArgs.data.updatedAt).toBeInstanceOf(Date);
    expect(result.variantStatus).toBe('Inactive');
  });

  it('lists images for an owned product', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 100n,
      shopId: 1n,
      basePrice: new Prisma.Decimal('159000'),
      compareAtPrice: null,
    });
    prisma.productImage.findMany.mockResolvedValue([createImageEntity()]);

    const result = await service.listSellerProductImages(sellerUser, '100');

    expect(prisma.productImage.findMany).toHaveBeenCalledWith({
      where: { productId: 100n },
      orderBy: [{ isThumbnail: 'desc' }, { sortOrder: 'asc' }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].imageUrl).toBe(
      'https://images.example.com/demo/den-ban-go.jpg',
    );
    expect(result[0].isThumbnail).toBe(true);
  });

  it('creates a thumbnail image and resets existing thumbnails', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 100n,
      shopId: 1n,
      basePrice: new Prisma.Decimal('159000'),
      compareAtPrice: null,
    });
    prisma.uploadAsset.findFirst.mockResolvedValue({
      id: 400n,
      url: 'https://images.example.com/demo/den-ban-go.jpg',
    });
    prisma.uploadAsset.updateMany.mockResolvedValue({ count: 1 });
    prisma.productImage.count.mockResolvedValue(0);
    prisma.productImage.updateMany.mockResolvedValue({ count: 1 });
    prisma.productImage.create.mockResolvedValue(createImageEntity());

    const result = await service.createSellerProductImage(sellerUser, '100', {
      assetId: '400',
      altText: 'Đèn bàn gỗ',
      sortOrder: 1,
      isThumbnail: true,
    });
    const createArgs = prisma.productImage.create.mock.calls[0][0];

    expect(prisma.productImage.updateMany).toHaveBeenCalledWith({
      where: { productId: 100n, isThumbnail: true },
      data: { isThumbnail: false },
    });
    expect(createArgs.data.productId).toBe(100n);
    expect(createArgs.data.productVariantId).toBeNull();
    expect(createArgs.data.imageUrl).toBe(
      'https://images.example.com/demo/den-ban-go.jpg',
    );
    expect(createArgs.data.isThumbnail).toBe(true);
    expect(result.isThumbnail).toBe(true);
  });

  it('updates an image and resets competing thumbnails', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 100n,
      shopId: 1n,
      basePrice: new Prisma.Decimal('159000'),
      compareAtPrice: null,
    });
    prisma.productImage.findFirst.mockResolvedValue(
      createImageEntity({ isThumbnail: false }),
    );
    prisma.productImage.updateMany.mockResolvedValue({ count: 1 });
    prisma.productImage.update.mockResolvedValue(createImageEntity());

    const result = await service.updateSellerProductImage(
      sellerUser,
      '100',
      '300',
      {
        altText: 'Đèn bàn gỗ mới',
        isThumbnail: true,
      },
    );
    const updateArgs = prisma.productImage.update.mock.calls[0][0];

    expect(prisma.productImage.updateMany).toHaveBeenCalledWith({
      where: {
        productId: 100n,
        isThumbnail: true,
        NOT: { id: 300n },
      },
      data: { isThumbnail: false },
    });
    expect(updateArgs.where.id).toBe(300n);
    expect(updateArgs.data.altText).toBe('Đèn bàn gỗ mới');
    expect(updateArgs.data.isThumbnail).toBe(true);
    expect(result.isThumbnail).toBe(true);
  });

  it('deletes an owned product image', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 100n,
      shopId: 1n,
      basePrice: new Prisma.Decimal('159000'),
      compareAtPrice: null,
    });
    prisma.productImage.findFirst.mockResolvedValue(createImageEntity());
    prisma.productImage.delete.mockResolvedValue(createImageEntity());

    const result = await service.deleteSellerProductImage(
      sellerUser,
      '100',
      '300',
    );

    expect(prisma.productImage.delete).toHaveBeenCalledWith({
      where: { id: 300n },
    });
    expect(result).toEqual({ id: '300', deleted: true });
  });

  it('rejects image operations when the product is outside seller ownership', async () => {
    prisma.product.findFirst.mockResolvedValue(null);

    await expect(
      service.listSellerProductImages(sellerUser, '100'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.productImage.findMany).not.toHaveBeenCalled();
  });

  it('returns default inventory when a seller variant has no inventory record', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 100n,
      shopId: 1n,
      basePrice: new Prisma.Decimal('159000'),
      compareAtPrice: null,
    });
    prisma.productVariant.findFirst.mockResolvedValue(createVariantEntity());
    prisma.productInventory.findUnique.mockResolvedValue(null);

    const result = await service.getSellerVariantInventory(
      sellerUser,
      '100',
      '200',
    );

    expect(prisma.productInventory.findUnique).toHaveBeenCalledWith({
      where: { productVariantId: 200n },
    });
    expect(result).toMatchObject({
      id: null,
      productId: '100',
      productVariantId: '200',
      quantityOnHand: 0,
      quantityReserved: 0,
      quantityAvailable: 0,
      lowStockThreshold: 5,
    });
  });

  it('creates inventory and transaction log for the first received batch', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 100n,
      shopId: 1n,
      basePrice: new Prisma.Decimal('159000'),
      compareAtPrice: null,
    });
    prisma.productVariant.findFirst.mockResolvedValue(createVariantEntity());
    prisma.productInventory.findUnique.mockResolvedValue(null);
    prisma.productInventory.create.mockResolvedValue(
      createInventoryEntity({
        quantityOnHand: 12,
        quantityReserved: 0,
        quantityAvailable: 12,
        lowStockThreshold: 5,
      }),
    );
    prisma.inventoryTransaction.create.mockResolvedValue({ id: 500n });

    const result = await service.receiveSellerVariantInventory(
      sellerUser,
      '100',
      '200',
      { quantityReceived: 12 },
    );
    const createArgs = prisma.productInventory.create.mock.calls[0][0];
    const transactionArgs = prisma.inventoryTransaction.create.mock.calls[0][0];

    expect(createArgs.data).toMatchObject({
      productId: 100n,
      productVariantId: 200n,
      quantityOnHand: 12,
      quantityReserved: 0,
      quantityAvailable: 12,
      quantityDamaged: 0,
      quantityIncoming: 0,
      lowStockThreshold: 5,
    });
    expect(transactionArgs.data).toMatchObject({
      productInventoryId: 400n,
      transactionType: 'RECEIVE_STOCK',
      quantityChange: 12,
      quantityAfter: 12,
      referenceType: 'PRODUCT_VARIANT',
      referenceId: 200n,
      createdByUserId: sellerUser.id,
    });
    expect(result.quantityAvailable).toBe(12);
  });

  it('atomically adds a received batch without changing reserved stock', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 100n,
      shopId: 1n,
      basePrice: new Prisma.Decimal('159000'),
      compareAtPrice: null,
    });
    prisma.productVariant.findFirst.mockResolvedValue(createVariantEntity());
    prisma.productInventory.findUnique.mockResolvedValue(
      createInventoryEntity({
        quantityOnHand: 100,
        quantityReserved: 5,
        quantityAvailable: 95,
      }),
    );
    prisma.productInventory.update.mockResolvedValue(
      createInventoryEntity({
        quantityOnHand: 120,
        quantityReserved: 5,
        quantityAvailable: 115,
      }),
    );
    prisma.inventoryTransaction.create.mockResolvedValue({ id: 500n });

    const result = await service.receiveSellerVariantInventory(
      sellerUser,
      '100',
      '200',
      { quantityReceived: 20 },
    );
    const updateArgs = prisma.productInventory.update.mock.calls[0][0];

    expect(updateArgs.data).toMatchObject({
      quantityOnHand: { increment: 20 },
      quantityAvailable: { increment: 20 },
    });
    expect(updateArgs.data).not.toHaveProperty('quantityReserved');
    expect(updateArgs.data).not.toHaveProperty('quantityDamaged');
    expect(result).toMatchObject({
      quantityOnHand: 120,
      quantityReserved: 5,
      quantityAvailable: 115,
    });
  });

  it('moves available stock to damaged without changing on-hand or reserved', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 100n,
      shopId: 1n,
      basePrice: new Prisma.Decimal('159000'),
      compareAtPrice: null,
    });
    prisma.productVariant.findFirst.mockResolvedValue(createVariantEntity());
    prisma.productInventory.updateMany.mockResolvedValue({ count: 1 });
    prisma.productInventory.findUniqueOrThrow.mockResolvedValue(
      createInventoryEntity({
        quantityOnHand: 100,
        quantityAvailable: 92,
        quantityReserved: 5,
        quantityDamaged: 3,
      }),
    );
    prisma.inventoryTransaction.create.mockResolvedValue({ id: 500n });

    const result = await service.markSellerVariantInventoryDamaged(
      sellerUser,
      '100',
      '200',
      { quantity: 3, reason: 'Bao bì rách' },
    );
    const updateArgs = prisma.productInventory.updateMany.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };

    expect(updateArgs).toMatchObject({
      where: { productVariantId: 200n, quantityAvailable: { gte: 3 } },
      data: {
        quantityAvailable: { decrement: 3 },
        quantityDamaged: { increment: 3 },
      },
    });
    expect(updateArgs.data).not.toHaveProperty('quantityOnHand');
    expect(updateArgs.data).not.toHaveProperty('quantityReserved');
    expect(result).toMatchObject({
      quantityOnHand: 100,
      quantityAvailable: 92,
      quantityReserved: 5,
      quantityDamaged: 3,
    });
    const transactionArgs = prisma.inventoryTransaction.create.mock.calls[0][0];
    expect(transactionArgs.data).toMatchObject({
      transactionType: 'MARK_DAMAGED',
      quantityChange: -3,
      quantityAfter: 92,
    });
  });

  it('rejects damaged quantity above available stock without movement', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 100n,
      shopId: 1n,
      basePrice: new Prisma.Decimal('159000'),
      compareAtPrice: null,
    });
    prisma.productVariant.findFirst.mockResolvedValue(createVariantEntity());
    prisma.productInventory.updateMany.mockResolvedValue({ count: 0 });
    prisma.productInventory.findUnique.mockResolvedValue(
      createInventoryEntity({ quantityAvailable: 2 }),
    );

    await expect(
      service.markSellerVariantInventoryDamaged(sellerUser, '100', '200', {
        quantity: 3,
        reason: 'Hàng bị vỡ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.inventoryTransaction.create).not.toHaveBeenCalled();
  });

  it('disposes damaged stock from on-hand without changing available or reserved', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 100n,
      shopId: 1n,
      basePrice: new Prisma.Decimal('159000'),
      compareAtPrice: null,
    });
    prisma.productVariant.findFirst.mockResolvedValue(createVariantEntity());
    prisma.productInventory.updateMany.mockResolvedValue({ count: 1 });
    prisma.productInventory.findUniqueOrThrow.mockResolvedValue(
      createInventoryEntity({
        quantityOnHand: 98,
        quantityAvailable: 92,
        quantityReserved: 5,
        quantityDamaged: 1,
      }),
    );
    prisma.inventoryTransaction.create.mockResolvedValue({ id: 501n });

    const result = await service.disposeSellerVariantDamagedInventory(
      sellerUser,
      '100',
      '200',
      { quantity: 2, reason: 'Đã bàn giao đơn vị tiêu hủy' },
    );
    const updateArgs = prisma.productInventory.updateMany.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };

    expect(updateArgs).toMatchObject({
      where: {
        productVariantId: 200n,
        quantityDamaged: { gte: 2 },
        quantityOnHand: { gte: 2 },
      },
      data: {
        quantityDamaged: { decrement: 2 },
        quantityOnHand: { decrement: 2 },
      },
    });
    expect(updateArgs.data).not.toHaveProperty('quantityAvailable');
    expect(updateArgs.data).not.toHaveProperty('quantityReserved');
    expect(result).toMatchObject({
      quantityOnHand: 98,
      quantityAvailable: 92,
      quantityReserved: 5,
      quantityDamaged: 1,
    });
  });
});
