import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { createPaginatedResult } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { ProductReviewResponse, PublicProductReviewResponse } from './types';

const REVIEWABLE_ORDER_STATUSES = ['Delivered', 'Completed'] as const;
const PRODUCT_REVIEW_STATUS_PUBLISHED = 'Published';
const PUBLIC_PRODUCT_STATUS = 'Published';
const PUBLIC_SHOP_STATUS = 'Approved';

const reviewOrderItemInclude = {
  order: {
    select: {
      id: true,
      userId: true,
      orderStatus: true,
    },
  },
  shopOrder: {
    select: {
      id: true,
      orderStatus: true,
    },
  },
} satisfies Prisma.OrderItemInclude;

const productReviewInclude = {
  product: {
    select: {
      id: true,
      productName: true,
      slug: true,
    },
  },
  productVariant: {
    select: {
      id: true,
      sku: true,
      variantName: true,
    },
  },
} satisfies Prisma.ProductReviewInclude;

const publicProductReviewInclude = {
  productVariant: {
    select: {
      id: true,
      sku: true,
      variantName: true,
    },
  },
  user: {
    select: {
      profile: {
        select: {
          fullName: true,
        },
      },
    },
  },
} satisfies Prisma.ProductReviewInclude;

type ReviewOrderItemEntity = Prisma.OrderItemGetPayload<{
  include: typeof reviewOrderItemInclude;
}>;

type ProductReviewEntity = Prisma.ProductReviewGetPayload<{
  include: typeof productReviewInclude;
}>;

type PublicProductReviewEntity = Prisma.ProductReviewGetPayload<{
  include: typeof publicProductReviewInclude;
}>;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicProductReviews(
    productSlug: string,
    query: PaginationQueryDto,
  ) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;
    const product = await this.prisma.product.findFirst({
      where: {
        slug: productSlug,
        productStatus: PUBLIC_PRODUCT_STATUS,
        isDeleted: false,
        isViolation: false,
        shop: {
          shopStatus: PUBLIC_SHOP_STATUS,
          isDeleted: false,
        },
      },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found',
        details: [{ field: 'slug' }],
      });
    }

    const where = {
      productId: product.id,
      reviewStatus: PRODUCT_REVIEW_STATUS_PUBLISHED,
    };
    const [reviews, total] = await Promise.all([
      this.prisma.productReview.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
        include: publicProductReviewInclude,
      }),
      this.prisma.productReview.count({ where }),
    ]);

    return createPaginatedResult({
      items: reviews.map((review) =>
        this.toPublicProductReviewResponse(review),
      ),
      page,
      limit,
      total,
      message: 'Product reviews retrieved successfully',
    });
  }

  async createProductReview(
    user: AuthenticatedUser,
    dto: CreateProductReviewDto,
  ): Promise<ProductReviewResponse> {
    const orderItemId = this.parseOrderItemId(dto.orderItemId);
    const orderItem = await this.requireReviewableOrderItem(user, orderItemId);
    await this.ensureProductReviewNotExists(user.id, orderItem.id);

    try {
      const review = await this.prisma.productReview.create({
        data: {
          orderItemId: orderItem.id,
          productId: orderItem.productId,
          productVariantId: orderItem.productVariantId,
          userId: user.id,
          rating: dto.rating,
          reviewTitle: this.normalizeNullableText(dto.reviewTitle),
          reviewContent: this.normalizeNullableText(dto.reviewContent),
          reviewStatus: PRODUCT_REVIEW_STATUS_PUBLISHED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        include: productReviewInclude,
      });

      return this.toProductReviewResponse(review);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException({
          code: 'PRODUCT_REVIEW_ALREADY_EXISTS',
          message: 'Product review already exists for this order item',
          details: [{ field: 'orderItemId' }],
        });
      }

      throw error;
    }
  }

  private async requireReviewableOrderItem(
    user: AuthenticatedUser,
    orderItemId: bigint,
  ): Promise<ReviewOrderItemEntity> {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        order: {
          userId: user.id,
        },
      },
      include: reviewOrderItemInclude,
    });

    if (!orderItem) {
      throw new NotFoundException({
        code: 'ORDER_ITEM_NOT_FOUND',
        message: 'Order item not found',
        details: [{ field: 'orderItemId' }],
      });
    }

    const orderReviewable = REVIEWABLE_ORDER_STATUSES.includes(
      orderItem.order.orderStatus as (typeof REVIEWABLE_ORDER_STATUSES)[number],
    );
    const shopOrderReviewable = REVIEWABLE_ORDER_STATUSES.includes(
      orderItem.shopOrder
        .orderStatus as (typeof REVIEWABLE_ORDER_STATUSES)[number],
    );

    if (!orderReviewable && !shopOrderReviewable) {
      throw new BadRequestException({
        code: 'ORDER_ITEM_NOT_REVIEWABLE',
        message: 'Order item can only be reviewed after delivery completion',
        details: [
          {
            field: 'orderItemId',
            orderStatus: orderItem.order.orderStatus,
            shopOrderStatus: orderItem.shopOrder.orderStatus,
            allowedStatuses: [...REVIEWABLE_ORDER_STATUSES],
          },
        ],
      });
    }

    return orderItem;
  }

  private async ensureProductReviewNotExists(
    userId: bigint,
    orderItemId: bigint,
  ): Promise<void> {
    const existingReview = await this.prisma.productReview.findUnique({
      where: {
        orderItemId_userId: {
          orderItemId,
          userId,
        },
      },
    });

    if (existingReview) {
      throw new ConflictException({
        code: 'PRODUCT_REVIEW_ALREADY_EXISTS',
        message: 'Product review already exists for this order item',
        details: [{ field: 'orderItemId' }],
      });
    }
  }

  private parseOrderItemId(value: string): bigint {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException({
        code: 'INVALID_ORDER_ITEM_ID',
        message: 'Order item id is invalid',
        details: [{ field: 'orderItemId' }],
      });
    }

    return BigInt(value);
  }

  private normalizeNullableText(value: string | undefined): string | null {
    if (value === undefined) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private toProductReviewResponse(
    review: ProductReviewEntity,
  ): ProductReviewResponse {
    return {
      id: review.id.toString(),
      idString: review.id.toString(),
      orderItemId: review.orderItemId.toString(),
      orderItemIdString: review.orderItemId.toString(),
      product: {
        id: review.product.id.toString(),
        idString: review.product.id.toString(),
        productName: review.product.productName,
        slug: review.product.slug,
      },
      productVariant: review.productVariant
        ? {
            id: review.productVariant.id.toString(),
            idString: review.productVariant.id.toString(),
            sku: review.productVariant.sku,
            variantName: review.productVariant.variantName,
          }
        : null,
      userId: review.userId.toString(),
      userIdString: review.userId.toString(),
      rating: review.rating,
      reviewTitle: review.reviewTitle,
      reviewContent: review.reviewContent,
      reviewStatus: review.reviewStatus,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  private toPublicProductReviewResponse(
    review: PublicProductReviewEntity,
  ): PublicProductReviewResponse {
    return {
      id: review.id.toString(),
      idString: review.id.toString(),
      orderItemId: review.orderItemId.toString(),
      orderItemIdString: review.orderItemId.toString(),
      productVariant: review.productVariant
        ? {
            id: review.productVariant.id.toString(),
            idString: review.productVariant.id.toString(),
            sku: review.productVariant.sku,
            variantName: review.productVariant.variantName,
          }
        : null,
      reviewer: {
        displayName: review.user.profile?.fullName ?? 'Customer',
      },
      rating: review.rating,
      reviewTitle: review.reviewTitle,
      reviewContent: review.reviewContent,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}
