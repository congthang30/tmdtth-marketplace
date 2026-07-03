import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppRole } from '../auth/app-role.enum';
import { AuthenticatedUser } from '../auth/types';
import { ReviewsService } from './reviews.service';

type ReviewOrderItemEntity = {
  id: bigint;
  orderId: bigint;
  shopOrderId: bigint;
  shopId: bigint;
  productId: bigint;
  productVariantId: bigint;
  quantity: number;
  order: {
    id: bigint;
    userId: bigint;
    orderStatus: string;
  };
  shopOrder: {
    id: bigint;
    orderStatus: string;
  };
};

type ProductReviewEntity = {
  id: bigint;
  orderItemId: bigint;
  productId: bigint;
  productVariantId: bigint | null;
  userId: bigint;
  rating: number;
  reviewTitle: string | null;
  reviewContent: string | null;
  reviewStatus: string;
  createdAt: Date;
  updatedAt: Date | null;
  product: {
    id: bigint;
    productName: string;
    slug: string;
  };
  productVariant: {
    id: bigint;
    sku: string;
    variantName: string;
  } | null;
};

type PublicProductReviewEntity = Omit<ProductReviewEntity, 'product'> & {
  user: {
    profile: {
      fullName: string;
    } | null;
  };
};

type ProductEntity = {
  id: bigint;
};

type OrderItemDelegateMock = {
  findFirst: jest.Mock<Promise<ReviewOrderItemEntity | null>, [unknown]>;
};

type ProductReviewDelegateMock = {
  findUnique: jest.Mock<Promise<ProductReviewEntity | null>, [unknown]>;
  create: jest.Mock<Promise<ProductReviewEntity>, [unknown]>;
  findMany: jest.Mock<Promise<PublicProductReviewEntity[]>, [unknown]>;
  count: jest.Mock<Promise<number>, [unknown]>;
};

type ProductDelegateMock = {
  findFirst: jest.Mock<Promise<ProductEntity | null>, [unknown]>;
};

type PrismaMock = {
  orderItem: OrderItemDelegateMock;
  productReview: ProductReviewDelegateMock;
  product: ProductDelegateMock;
};

const customerUser: AuthenticatedUser = {
  id: 9n,
  idString: '9',
  email: 'customer@example.com',
  phoneNumber: null,
  userStatus: 'Active',
  roles: [AppRole.Customer],
  profile: null,
};

function createOrderItemEntity(
  overrides: Partial<ReviewOrderItemEntity> = {},
): ReviewOrderItemEntity {
  return {
    id: 700n,
    orderId: 900n,
    shopOrderId: 501n,
    shopId: 1n,
    productId: 100n,
    productVariantId: 200n,
    quantity: 1,
    order: {
      id: 900n,
      userId: customerUser.id,
      orderStatus: 'Completed',
    },
    shopOrder: {
      id: 501n,
      orderStatus: 'Completed',
    },
    ...overrides,
  };
}

function createProductReviewEntity(
  overrides: Partial<ProductReviewEntity> = {},
): ProductReviewEntity {
  const now = new Date('2026-07-03T00:00:00.000Z');

  return {
    id: 1000n,
    orderItemId: 700n,
    productId: 100n,
    productVariantId: 200n,
    userId: customerUser.id,
    rating: 5,
    reviewTitle: 'Great product',
    reviewContent: 'Works well after delivery',
    reviewStatus: 'Published',
    createdAt: now,
    updatedAt: now,
    product: {
      id: 100n,
      productName: 'Đèn bàn gỗ',
      slug: 'den-ban-go',
    },
    productVariant: {
      id: 200n,
      sku: 'DEN-BAN-GO',
      variantName: 'Màu gỗ',
    },
    ...overrides,
  };
}

function createPublicProductReviewEntity(
  overrides: Partial<PublicProductReviewEntity> = {},
): PublicProductReviewEntity {
  const baseReview = createProductReviewEntity();

  return {
    ...baseReview,
    user: {
      profile: {
        fullName: 'Customer Demo',
      },
    },
    ...overrides,
  };
}

describe('ReviewsService product reviews', () => {
  let prisma: PrismaMock;
  let service: ReviewsService;

  beforeEach(() => {
    prisma = {
      orderItem: {
        findFirst: jest.fn<Promise<ReviewOrderItemEntity | null>, [unknown]>(),
      },
      productReview: {
        findUnique: jest.fn<Promise<ProductReviewEntity | null>, [unknown]>(),
        create: jest.fn<Promise<ProductReviewEntity>, [unknown]>(),
        findMany: jest.fn<Promise<PublicProductReviewEntity[]>, [unknown]>(),
        count: jest.fn<Promise<number>, [unknown]>(),
      },
      product: {
        findFirst: jest.fn<Promise<ProductEntity | null>, [unknown]>(),
      },
    };
    service = new ReviewsService(prisma as unknown as PrismaService);
  });

  it('lists published product reviews with pagination', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 100n });
    prisma.productReview.findMany.mockResolvedValue([
      createPublicProductReviewEntity(),
    ]);
    prisma.productReview.count.mockResolvedValue(1);

    const result = await service.listPublicProductReviews('den-ban-go', {
      page: 2,
      limit: 5,
    });
    const productArgs = prisma.product.findFirst.mock.calls[0][0] as {
      where: {
        slug: string;
        productStatus: string;
        isDeleted: boolean;
        isViolation: boolean;
        shop: { shopStatus: string; isDeleted: boolean };
      };
    };
    const reviewArgs = prisma.productReview.findMany.mock.calls[0][0] as {
      where: { productId: bigint; reviewStatus: string };
      skip: number;
      take: number;
    };

    expect(productArgs.where).toEqual({
      slug: 'den-ban-go',
      productStatus: 'Published',
      isDeleted: false,
      isViolation: false,
      shop: {
        shopStatus: 'Approved',
        isDeleted: false,
      },
    });
    expect(reviewArgs.where).toEqual({
      productId: 100n,
      reviewStatus: 'Published',
    });
    expect(reviewArgs.skip).toBe(5);
    expect(reviewArgs.take).toBe(5);
    expect(result.meta).toEqual({
      page: 2,
      limit: 5,
      total: 1,
      totalPages: 1,
    });
    expect(result.items[0].reviewer.displayName).toBe('Customer Demo');
    expect(result.items[0].productVariant?.sku).toBe('DEN-BAN-GO');
  });

  it('returns not found for public reviews of non-public products', async () => {
    prisma.product.findFirst.mockResolvedValue(null);

    await expect(
      service.listPublicProductReviews('draft-product', {}),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.productReview.findMany).not.toHaveBeenCalled();
  });

  it('creates a product review for a completed owned order item', async () => {
    prisma.orderItem.findFirst.mockResolvedValue(createOrderItemEntity());
    prisma.productReview.findUnique.mockResolvedValue(null);
    prisma.productReview.create.mockResolvedValue(createProductReviewEntity());

    const result = await service.createProductReview(customerUser, {
      orderItemId: '700',
      rating: 5,
      reviewTitle: ' Great product ',
      reviewContent: ' Works well after delivery ',
    });
    const orderItemArgs = prisma.orderItem.findFirst.mock.calls[0][0] as {
      where: { id: bigint; order: { userId: bigint } };
    };
    const createArgs = prisma.productReview.create.mock.calls[0][0] as {
      data: {
        orderItemId: bigint;
        productId: bigint;
        productVariantId: bigint;
        userId: bigint;
        rating: number;
        reviewTitle: string;
        reviewContent: string;
        reviewStatus: string;
      };
    };

    expect(orderItemArgs.where).toEqual({
      id: 700n,
      order: {
        userId: customerUser.id,
      },
    });
    expect(createArgs.data).toMatchObject({
      orderItemId: 700n,
      productId: 100n,
      productVariantId: 200n,
      userId: customerUser.id,
      rating: 5,
      reviewTitle: 'Great product',
      reviewContent: 'Works well after delivery',
      reviewStatus: 'Published',
    });
    expect(result.id).toBe('1000');
    expect(result.product.slug).toBe('den-ban-go');
    expect(result.productVariant?.sku).toBe('DEN-BAN-GO');
  });

  it('rejects review for another user order item', async () => {
    prisma.orderItem.findFirst.mockResolvedValue(null);

    await expect(
      service.createProductReview(customerUser, {
        orderItemId: '700',
        rating: 5,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.productReview.create).not.toHaveBeenCalled();
  });

  it('rejects review before order completion', async () => {
    prisma.orderItem.findFirst.mockResolvedValue(
      createOrderItemEntity({
        order: {
          id: 900n,
          userId: customerUser.id,
          orderStatus: 'Shipping',
        },
        shopOrder: {
          id: 501n,
          orderStatus: 'Shipping',
        },
      }),
    );

    await expect(
      service.createProductReview(customerUser, {
        orderItemId: '700',
        rating: 5,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.productReview.findUnique).not.toHaveBeenCalled();
    expect(prisma.productReview.create).not.toHaveBeenCalled();
  });

  it('rejects duplicate product review for the same order item', async () => {
    prisma.orderItem.findFirst.mockResolvedValue(createOrderItemEntity());
    prisma.productReview.findUnique.mockResolvedValue(
      createProductReviewEntity(),
    );

    await expect(
      service.createProductReview(customerUser, {
        orderItemId: '700',
        rating: 5,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.productReview.create).not.toHaveBeenCalled();
  });

  it('rejects invalid order item id', async () => {
    await expect(
      service.createProductReview(customerUser, {
        orderItemId: 'abc',
        rating: 5,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.orderItem.findFirst).not.toHaveBeenCalled();
  });
});
