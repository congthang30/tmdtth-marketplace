import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ShopOperationMode } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  createPaginatedResult,
  getPaginationParams,
} from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types';
import { AdjustDamagedInventoryDto } from './dto/adjust-damaged-inventory.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { CreateProductVariantsBatchDto } from './dto/create-product-variants-batch.dto';
import { ProductListQueryDto } from './dto/product-list-query.dto';
import { ReceiveProductInventoryDto } from './dto/set-product-inventory.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import {
  DeleteProductImageResponse,
  ProductListImageResponse,
  ProductListItemResponse,
  ProductListVariantResponse,
  SellerInventoryTransactionResponse,
  SellerProductImageResponse,
  SellerProductInventoryResponse,
  SellerProductListItemResponse,
  SellerProductVariantResponse,
} from './types';

type ProductEntity = Prisma.ProductGetPayload<{
  include: {
    shop: { select: { id: true; shopName: true; slug: true } };
    category: { select: { id: true; categoryName: true; slug: true } };
    images: true;
    variants: { include: { inventoryRecords: true } };
  };
}>;
type ProductImageEntity = ProductEntity['images'][number];
type VariantResponseSource = {
  id: bigint;
  sku: string;
  variantName: string;
  attributes: Prisma.JsonValue;
  price: { toString(): string };
  compareAtPrice: { toString(): string } | null;
  inventoryRecords: Array<{ quantityAvailable: number }>;
  images?: ProductImageEntity[];
};

const PUBLIC_PRODUCT_STATUS = 'Published';
const PUBLIC_VARIANT_STATUS = 'Active';
const PUBLIC_SHOP_STATUS = 'Approved';
const DEFAULT_PRODUCT_STATUS = 'Draft';
const DELETED_PRODUCT_STATUS = 'Deleted';
const INACTIVE_VARIANT_STATUS = 'Inactive';
const INVENTORY_TRANSACTION_SELLER_SET_STOCK = 'SELLER_SET_STOCK';
const INVENTORY_TRANSACTION_RECEIVE_STOCK = 'RECEIVE_STOCK';
const INVENTORY_TRANSACTION_MARK_DAMAGED = 'MARK_DAMAGED';
const INVENTORY_TRANSACTION_DISPOSE_DAMAGED = 'DISPOSE_DAMAGED';
const INVENTORY_REFERENCE_TYPE_PRODUCT_VARIANT = 'PRODUCT_VARIANT';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicProducts(query: ProductListQueryDto) {
    if (query.q?.trim().length) await this.recordSearchTerm(query.q);
    const { page, limit } = getPaginationParams(query);
    const { items, total } = await this.findPublicProducts(query);

    return createPaginatedResult({
      items: items.map((product) => this.toListItem(product)),
      page,
      limit,
      total,
    });
  }

  private async recordSearchTerm(term: string) {
    const displayTerm = term.trim().replace(/\s+/g, ' ').slice(0, 100);
    const normalized = displayTerm
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLocaleLowerCase('vi');
    if (normalized.length < 2) return;
    await this.prisma.searchTermStat.upsert({
      where: { normalized },
      create: { normalized, displayTerm },
      update: {
        displayTerm,
        searchCount: { increment: 1 },
        lastSearchedAt: new Date(),
      },
    });
  }

  async listTopSearchedProducts(limit = 6) {
    const terms = await this.prisma.searchTermStat.findMany({
      orderBy: [{ searchCount: 'desc' }, { lastSearchedAt: 'desc' }],
      take: Math.min(limit * 3, 30),
    });
    const results: Array<{
      product: ProductListItemResponse;
      searchCount: string;
    }> = [];
    const seen = new Set<string>();
    for (const term of terms) {
      if (results.length >= limit) break;
      const { items } = await this.findPublicProducts({
        q: term.displayTerm,
        page: 1,
        limit: 1,
      });
      const product = items[0];
      if (!product || seen.has(product.id.toString())) continue;
      seen.add(product.id.toString());
      results.push({
        product: this.toListItem(product),
        searchCount: term.searchCount.toString(),
      });
    }
    return results;
  }

  async getPublicProductDetail(slug: string) {
    const product = await this.findPublicProductBySlug(slug);

    if (!product) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Không tìm thấy sản phẩm',
        details: [],
      });
    }

    const response = this.toListItem(product);
    return {
      ...response,
      shop: {
        ...response.shop,
        avatarUrl: product.shop.avatarAsset?.url ?? null,
      },
    };
  }

  async checkPublicProductVariant(slug: string, attributesJson: string) {
    const product = await this.findPublicProductBySlug(slug);
    if (!product) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Không tìm thấy sản phẩm',
        details: [],
      });
    }
    let parsedAttributes: unknown;
    try {
      parsedAttributes = JSON.parse(attributesJson);
    } catch {
      throw new BadRequestException({
        code: 'INVALID_VARIANT_ATTRIBUTES',
        message: 'Thuộc tính phân loại không hợp lệ',
        details: [{ field: 'attributes' }],
      });
    }
    const attributes = this.normalizeVariantAttributes(
      parsedAttributes as Record<string, string>,
    );
    const variant = product.variants.find((candidate) =>
      this.variantAttributesEqual(
        this.readVariantAttributes(candidate),
        attributes,
      ),
    );
    return variant ? this.toVariantResponse(variant) : null;
  }

  async listSellerProducts(user: AuthenticatedUser, query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPaginationParams(query);
    const where = {
      isDeleted: false,
      shop: {
        ownerUserId: user.id,
        shopStatus: PUBLIC_SHOP_STATUS,
        isDeleted: false,
      },
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take,
        include: {
          shop: {
            select: {
              id: true,
              shopName: true,
              slug: true,
            },
          },
          category: {
            select: {
              id: true,
              categoryName: true,
              slug: true,
            },
          },
          images: {
            orderBy: [{ isThumbnail: 'desc' }, { sortOrder: 'asc' }],
          },
          variants: {
            orderBy: [{ price: 'asc' }],
            include: {
              inventoryRecords: true,
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return createPaginatedResult({
      items: items.map((product) => this.toSellerListItem(product)),
      page,
      limit,
      total,
    });
  }

  async getSellerProduct(
    user: AuthenticatedUser,
    productId: string,
  ): Promise<SellerProductListItemResponse> {
    const id = this.parseId(productId, 'productId');
    await this.requireSellerProduct(user, id);
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        shop: { select: { id: true, shopName: true, slug: true } },
        category: {
          select: { id: true, categoryName: true, slug: true },
        },
        images: {
          orderBy: [{ isThumbnail: 'desc' }, { sortOrder: 'asc' }],
        },
        variants: {
          orderBy: [{ price: 'asc' }],
          include: { inventoryRecords: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Không tìm thấy sản phẩm',
        details: [{ field: 'productId' }],
      });
    }

    return this.toSellerListItem(product);
  }

  async listAdminProducts(query: PaginationQueryDto & { status?: string }) {
    const { page, limit, skip, take } = getPaginationParams(query);
    const where = {
      isDeleted: false,
      ...(query.status ? { productStatus: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take,
        include: {
          shop: { select: { id: true, shopName: true, slug: true } },
          category: { select: { id: true, categoryName: true, slug: true } },
          images: { orderBy: [{ isThumbnail: 'desc' }, { sortOrder: 'asc' }] },
          variants: {
            orderBy: [{ price: 'asc' }],
            include: { inventoryRecords: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);
    return createPaginatedResult({
      items: items.map((product) => this.toSellerListItem(product)),
      page,
      limit,
      total,
    });
  }

  async moderateProduct(
    user: AuthenticatedUser,
    productId: string,
    approved: boolean,
  ) {
    const id = this.parseId(productId, 'productId');
    const product = await this.prisma.product.findFirst({
      where: { id, isDeleted: false },
    });
    if (!product)
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Không tìm thấy sản phẩm',
        details: [],
      });
    if (product.productStatus !== 'PendingApproval')
      throw new BadRequestException({
        code: 'PRODUCT_NOT_PENDING',
        message: 'Sản phẩm không ở trạng thái chờ duyệt',
        details: [],
      });
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        productStatus: approved ? 'Published' : 'Rejected',
        updatedByUserId: user.id,
        updatedAt: new Date(),
      },
      include: {
        shop: { select: { id: true, shopName: true, slug: true } },
        category: { select: { id: true, categoryName: true, slug: true } },
        images: { orderBy: [{ isThumbnail: 'desc' }, { sortOrder: 'asc' }] },
        variants: {
          orderBy: [{ price: 'asc' }],
          include: { inventoryRecords: true },
        },
      },
    });
    return this.toSellerListItem(updated);
  }

  async createSellerProduct(
    user: AuthenticatedUser,
    dto: CreateProductDto,
  ): Promise<SellerProductListItemResponse> {
    const shopId = this.parseId(dto.shopId, 'shopId');
    const categoryId = this.parseId(dto.categoryId, 'categoryId');
    const slug = this.slugify(dto.productName);

    if (!slug) {
      throw new BadRequestException({
        code: 'INVALID_PRODUCT_NAME',
        message: 'Product name is invalid',
        details: [{ field: 'productName' }],
      });
    }

    const [shop, category, existingProduct] = await Promise.all([
      this.prisma.shop.findFirst({
        where: {
          id: shopId,
          ownerUserId: user.id,
          shopStatus: PUBLIC_SHOP_STATUS,
          isDeleted: false,
        },
        select: { id: true },
      }),
      this.prisma.category.findFirst({
        where: {
          id: categoryId,
          isActive: true,
        },
        select: { id: true },
      }),
      this.prisma.product.findFirst({
        where: {
          shopId,
          slug,
        },
        select: { id: true },
      }),
    ]);

    if (!shop) {
      throw new NotFoundException({
        code: 'SHOP_NOT_FOUND',
        message: 'Shop not found',
        details: [{ field: 'shopId' }],
      });
    }

    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Category not found',
        details: [{ field: 'categoryId' }],
      });
    }

    if (existingProduct) {
      throw new ConflictException({
        code: 'PRODUCT_SLUG_EXISTS',
        message: 'Product slug already exists in this shop',
        details: [{ field: 'productName', slug }],
      });
    }

    const basePrice = this.parseMoney(dto.basePrice, 'basePrice');
    const compareAtPrice =
      dto.compareAtPrice === undefined
        ? null
        : this.parseMoney(dto.compareAtPrice, 'compareAtPrice');

    if (!basePrice.gt(0)) {
      throw new BadRequestException({
        code: 'INVALID_PRICE',
        message: 'Base price must be greater than zero',
        details: [{ field: 'basePrice' }],
      });
    }

    if (compareAtPrice && compareAtPrice.lt(basePrice)) {
      throw new BadRequestException({
        code: 'INVALID_COMPARE_AT_PRICE',
        message: 'Compare at price must be greater than or equal to base price',
        details: [{ field: 'compareAtPrice' }],
      });
    }

    const shopCategoryIds = this.parseUniqueIds(
      dto.shopCategoryIds ?? [],
      'shopCategoryIds',
    );
    await this.requireShopCategories(shopId, shopCategoryIds);

    const now = new Date();
    const product = await this.prisma.$transaction((tx) =>
      tx.product.create({
        data: {
          shopId,
          categoryId,
          productName: dto.productName,
          slug,
          description: this.normalizeNullableText(dto.description),
          brand: this.normalizeNullableText(dto.brand),
          basePrice,
          compareAtPrice,
          warrantyMonths: dto.warrantyMonths ?? 0,
          productStatus: DEFAULT_PRODUCT_STATUS,
          isViolation: false,
          isDeleted: false,
          createdByUserId: user.id,
          updatedByUserId: user.id,
          createdAt: now,
          updatedAt: now,
          ...(shopCategoryIds.length > 0
            ? {
                shopCategoryProducts: {
                  create: shopCategoryIds.map((shopCategoryId) => ({
                    shopCategoryId,
                  })),
                },
              }
            : {}),
        },
        include: {
          shop: {
            select: {
              id: true,
              shopName: true,
              slug: true,
            },
          },
          category: {
            select: {
              id: true,
              categoryName: true,
              slug: true,
            },
          },
          images: {
            orderBy: [{ isThumbnail: 'desc' }, { sortOrder: 'asc' }],
          },
          variants: {
            orderBy: [{ price: 'asc' }],
            include: {
              inventoryRecords: true,
            },
          },
        },
      }),
    );

    return this.toSellerListItem(product);
  }

  async updateSellerProduct(
    user: AuthenticatedUser,
    productId: string,
    dto: UpdateProductDto,
  ): Promise<SellerProductListItemResponse> {
    const id = this.parseId(productId, 'productId');
    const product = await this.requireSellerProduct(user, id);
    if (product.productStatus === 'PendingApproval') {
      throw new BadRequestException({
        code: 'PRODUCT_PENDING_LOCKED',
        message: 'Sản phẩm đang chờ duyệt và chưa thể chỉnh sửa',
        details: [],
      });
    }
    const requestedCategoryId =
      dto.categoryId === undefined
        ? undefined
        : this.parseId(dto.categoryId, 'categoryId');
    const moderatedFieldChanged =
      (requestedCategoryId !== undefined &&
        requestedCategoryId !== product.categoryId) ||
      (dto.productName !== undefined &&
        dto.productName !== product.productName) ||
      (dto.description !== undefined &&
        this.normalizeNullableText(dto.description) !== product.description) ||
      (dto.brand !== undefined &&
        this.normalizeNullableText(dto.brand) !== product.brand) ||
      (dto.warrantyMonths !== undefined &&
        dto.warrantyMonths !== product.warrantyMonths);
    const shopCategoryIds =
      dto.shopCategoryIds === undefined
        ? undefined
        : this.parseUniqueIds(dto.shopCategoryIds, 'shopCategoryIds');
    if (shopCategoryIds !== undefined) {
      await this.requireShopCategories(product.shopId, shopCategoryIds);
    }
    const data: Prisma.ProductUpdateInput = {
      updatedByUser: { connect: { id: user.id } },
      updatedAt: new Date(),
      ...(shopCategoryIds === undefined
        ? {}
        : {
            shopCategoryProducts: {
              deleteMany: {},
              create: shopCategoryIds.map((shopCategoryId) => ({
                shopCategoryId,
              })),
            },
          }),
    };

    if (dto.categoryId !== undefined) {
      const categoryId = this.parseId(dto.categoryId, 'categoryId');
      const category = await this.prisma.category.findFirst({
        where: {
          id: categoryId,
          isActive: true,
        },
        select: { id: true },
      });

      if (!category) {
        throw new NotFoundException({
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found',
          details: [{ field: 'categoryId' }],
        });
      }

      data.category = { connect: { id: categoryId } };
    }

    if (dto.productName !== undefined) {
      const slug = this.slugify(dto.productName);

      if (!slug) {
        throw new BadRequestException({
          code: 'INVALID_PRODUCT_NAME',
          message: 'Product name is invalid',
          details: [{ field: 'productName' }],
        });
      }

      const duplicateProduct = await this.prisma.product.findFirst({
        where: {
          shopId: product.shopId,
          slug,
          NOT: { id },
        },
        select: { id: true },
      });

      if (duplicateProduct) {
        throw new ConflictException({
          code: 'PRODUCT_SLUG_EXISTS',
          message: 'Product slug already exists in this shop',
          details: [{ field: 'productName', slug }],
        });
      }

      data.productName = dto.productName;
      data.slug = slug;
    }

    const basePrice =
      dto.basePrice === undefined
        ? this.toDecimal(product.basePrice)
        : this.parseMoney(dto.basePrice, 'basePrice');
    const compareAtPrice =
      dto.compareAtPrice === undefined
        ? product.compareAtPrice
          ? this.toDecimal(product.compareAtPrice)
          : null
        : this.parseMoney(dto.compareAtPrice, 'compareAtPrice');

    if (dto.basePrice !== undefined) {
      if (!basePrice.gt(0)) {
        throw new BadRequestException({
          code: 'INVALID_PRICE',
          message: 'Base price must be greater than zero',
          details: [{ field: 'basePrice' }],
        });
      }

      data.basePrice = basePrice;
    }

    if (dto.compareAtPrice !== undefined) {
      data.compareAtPrice = compareAtPrice;
    }

    if (compareAtPrice && compareAtPrice.lt(basePrice)) {
      throw new BadRequestException({
        code: 'INVALID_COMPARE_AT_PRICE',
        message: 'Compare at price must be greater than or equal to base price',
        details: [{ field: 'compareAtPrice' }],
      });
    }

    if (dto.description !== undefined) {
      data.description = this.normalizeNullableText(dto.description);
    }

    if (dto.brand !== undefined) {
      data.brand = this.normalizeNullableText(dto.brand);
    }

    if (dto.warrantyMonths !== undefined) {
      data.warrantyMonths = dto.warrantyMonths;
    }

    if (
      moderatedFieldChanged &&
      (product.productStatus === 'Published' ||
        product.productStatus === 'Inactive')
    ) {
      data.productStatus = 'PendingApproval';
    }

    const updatedProduct = await this.prisma.$transaction((tx) =>
      tx.product.update({
        where: { id },
        data,
        include: {
          shop: {
            select: {
              id: true,
              shopName: true,
              slug: true,
            },
          },
          category: {
            select: {
              id: true,
              categoryName: true,
              slug: true,
            },
          },
          images: {
            orderBy: [{ isThumbnail: 'desc' }, { sortOrder: 'asc' }],
          },
          variants: {
            orderBy: [{ price: 'asc' }],
            include: {
              inventoryRecords: true,
            },
          },
        },
      }),
    );

    return this.toSellerListItem(updatedProduct);
  }

  async submitSellerProduct(
    user: AuthenticatedUser,
    productId: string,
  ): Promise<SellerProductListItemResponse> {
    const id = this.parseId(productId, 'productId');
    await this.requireSellerProduct(user, id);

    await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: {
          id,
          isDeleted: false,
          productStatus: { in: ['Draft', 'Rejected'] },
          shop: { ownerUserId: user.id, isDeleted: false },
        },
        include: {
          category: { select: { isActive: true } },
          variants: {
            where: { variantStatus: 'Active' },
            select: { id: true, price: true, weightGram: true },
          },
          images: {
            select: { id: true, isThumbnail: true },
            orderBy: [
              { sortOrder: 'asc' },
              { createdAt: 'asc' },
              { id: 'asc' },
            ],
          },
        },
      });
      if (!product) {
        throw new BadRequestException({
          code: 'INVALID_PRODUCT_STATUS_TRANSITION',
          message: 'Chỉ sản phẩm nháp hoặc bị từ chối mới có thể gửi phê duyệt',
          details: [],
        });
      }

      const missing: string[] = [];
      if (!product.productName.trim()) missing.push('Tên sản phẩm');
      if (!product.description?.trim()) missing.push('Mô tả sản phẩm');
      if (!this.toDecimal(product.basePrice).gt(0))
        missing.push('Giá sản phẩm');
      if (!product.category.isActive) missing.push('Danh mục đang hoạt động');
      if (product.variants.length === 0)
        missing.push('Ít nhất một phân loại đang hoạt động');
      if (
        product.variants.some((variant) => !this.toDecimal(variant.price).gt(0))
      )
        missing.push('Giá của mọi phân loại đang hoạt động');
      if (product.variants.some((variant) => variant.weightGram <= 0))
        missing.push('Khối lượng của mọi phân loại đang hoạt động');
      if (product.images.length === 0) missing.push('Ít nhất một hình ảnh');
      if (product.images.filter((image) => image.isThumbnail).length > 1)
        missing.push('Chỉ một ảnh đại diện');

      if (missing.length > 0) {
        throw new BadRequestException({
          code: 'PRODUCT_NOT_READY_FOR_REVIEW',
          message: `Sản phẩm chưa đủ điều kiện gửi phê duyệt: ${missing.join(', ')}`,
          details: missing.map((label) => ({ label })),
        });
      }

      if (!product.images.some((image) => image.isThumbnail)) {
        await tx.productImage.update({
          where: { id: product.images[0].id },
          data: { isThumbnail: true },
        });
      }
      const updated = await tx.product.updateMany({
        where: { id, productStatus: product.productStatus, isDeleted: false },
        data: {
          productStatus: 'PendingApproval',
          updatedByUserId: user.id,
          updatedAt: new Date(),
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException({
          code: 'PRODUCT_STATUS_CHANGED',
          message: 'Trạng thái sản phẩm vừa thay đổi. Vui lòng tải lại trang.',
          details: [],
        });
      }
    });

    return this.getSellerProduct(user, productId);
  }

  async stopSellingProduct(user: AuthenticatedUser, productId: string) {
    return this.transitionSellerProduct(
      user,
      productId,
      ['Published'],
      'Inactive',
    );
  }

  async resumeSellingProduct(user: AuthenticatedUser, productId: string) {
    return this.transitionSellerProduct(
      user,
      productId,
      ['Inactive'],
      'Published',
    );
  }

  private async transitionSellerProduct(
    user: AuthenticatedUser,
    productId: string,
    allowedStatuses: string[],
    nextStatus: string,
  ): Promise<SellerProductListItemResponse> {
    const id = this.parseId(productId, 'productId');
    const product = await this.requireSellerProduct(user, id);
    if (!allowedStatuses.includes(product.productStatus)) {
      throw new BadRequestException({
        code: 'INVALID_PRODUCT_STATUS_TRANSITION',
        message: 'Không thể chuyển sản phẩm từ trạng thái hiện tại',
        details: [{ field: 'productStatus', current: product.productStatus }],
      });
    }

    const result = await this.prisma.product.updateMany({
      where: { id, productStatus: product.productStatus, isDeleted: false },
      data: {
        productStatus: nextStatus,
        updatedByUserId: user.id,
        updatedAt: new Date(),
      },
    });
    if (result.count !== 1) {
      throw new ConflictException({
        code: 'PRODUCT_STATUS_CHANGED',
        message: 'Trạng thái sản phẩm vừa thay đổi. Vui lòng tải lại trang.',
        details: [],
      });
    }

    return this.getSellerProduct(user, productId);
  }

  async deleteSellerProduct(
    user: AuthenticatedUser,
    productId: string,
  ): Promise<SellerProductListItemResponse> {
    const id = this.parseId(productId, 'productId');

    await this.requireSellerProduct(user, id);

    const deletedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        productStatus: DELETED_PRODUCT_STATUS,
        isDeleted: true,
        deletedAt: new Date(),
        updatedByUserId: user.id,
        updatedAt: new Date(),
      },
      include: {
        shop: {
          select: {
            id: true,
            shopName: true,
            slug: true,
          },
        },
        category: {
          select: {
            id: true,
            categoryName: true,
            slug: true,
          },
        },
        images: {
          orderBy: [{ isThumbnail: 'desc' }, { sortOrder: 'asc' }],
        },
        variants: {
          orderBy: [{ price: 'asc' }],
          include: {
            inventoryRecords: true,
          },
        },
      },
    });

    return this.toSellerListItem(deletedProduct);
  }

  async listSellerProductVariants(
    user: AuthenticatedUser,
    productId: string,
  ): Promise<SellerProductVariantResponse[]> {
    const parsedProductId = this.parseId(productId, 'productId');

    await this.requireSellerProduct(user, parsedProductId);

    const variants = await this.prisma.productVariant.findMany({
      where: { productId: parsedProductId },
      orderBy: [{ createdAt: 'desc' }],
      include: { inventoryRecords: true },
    });

    return variants.map((variant) => this.toSellerVariantResponse(variant));
  }

  async createSellerProductVariant(
    user: AuthenticatedUser,
    productId: string,
    dto: CreateProductVariantDto,
  ): Promise<SellerProductVariantResponse> {
    const parsedProductId = this.parseId(productId, 'productId');
    const product = await this.requireSellerProduct(user, parsedProductId);
    const price = this.parsePositiveMoney(dto.price, 'price');
    const compareAtPrice = this.parseOptionalCompareAtPrice(
      dto.compareAtPrice,
      price,
    );
    const now = new Date();

    const attributes = this.normalizeVariantAttributes(dto.attributes);
    const variantName = Object.values(attributes).join(' / ');

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${parsedProductId})`;
      const sku = await this.generateVariantSku(
        parsedProductId,
        product.slug,
        tx,
      );
      const existingVariants = await tx.productVariant.findMany({
        where: { productId: parsedProductId },
        select: { attributes: true },
      });
      const existingAttributes = existingVariants.map((variant) =>
        this.readVariantAttributes(variant),
      );
      this.assertVariantAttributeSchema(attributes, existingAttributes);
      if (
        existingAttributes.some((candidate) =>
          this.variantAttributesEqual(candidate, attributes),
        )
      ) {
        throw new ConflictException({
          code: 'DUPLICATE_VARIANT_ATTRIBUTES',
          message: 'Tổ hợp phân loại này đã tồn tại',
          details: [{ field: 'attributes' }],
        });
      }

      const variant = await tx.productVariant.create({
        data: {
          productId: parsedProductId,
          sku,
          variantName,
          attributes,
          price,
          compareAtPrice,
          weightGram: dto.weightGram ?? 0,
          variantStatus: dto.variantStatus ?? PUBLIC_VARIANT_STATUS,
          createdAt: now,
          updatedAt: now,
        },
        include: { inventoryRecords: true },
      });
      const inventory = await tx.productInventory.create({
        data: {
          productId: parsedProductId,
          productVariantId: variant.id,
          quantityOnHand: dto.quantityOnHand,
          quantityReserved: 0,
          quantityAvailable: dto.quantityOnHand,
          quantityDamaged: 0,
          quantityIncoming: 0,
          lowStockThreshold: 5,
          updatedAt: now,
        },
      });

      if (dto.quantityOnHand > 0) {
        await tx.inventoryTransaction.create({
          data: {
            productInventoryId: inventory.id,
            transactionType: INVENTORY_TRANSACTION_SELLER_SET_STOCK,
            quantityChange: dto.quantityOnHand,
            quantityAfter: dto.quantityOnHand,
            referenceType: INVENTORY_REFERENCE_TYPE_PRODUCT_VARIANT,
            referenceId: variant.id,
            note: 'Seller set initial inventory quantity',
            createdByUserId: user.id,
            createdAt: now,
          },
        });
      }

      return this.toSellerVariantResponse({
        ...variant,
        inventoryRecords: [{ quantityAvailable: inventory.quantityAvailable }],
      });
    });
  }

  async createSellerProductVariantsBatch(
    user: AuthenticatedUser,
    productId: string,
    dto: CreateProductVariantsBatchDto,
  ): Promise<SellerProductVariantResponse[]> {
    const parsedProductId = this.parseId(productId, 'productId');
    const product = await this.requireSellerProduct(user, parsedProductId);
    const inputs = dto.variants.map((variant) => {
      const price = this.parsePositiveMoney(variant.price, 'price');
      return {
        attributes: this.normalizeVariantAttributes(variant.attributes),
        price,
        compareAtPrice: this.parseOptionalCompareAtPrice(
          variant.compareAtPrice,
          price,
        ),
        weightGram: variant.weightGram ?? 0,
        quantityOnHand: variant.quantityOnHand,
        variantStatus: variant.variantStatus ?? PUBLIC_VARIANT_STATUS,
      };
    });
    const canonicalAttributes = inputs.map((input) =>
      JSON.stringify(
        Object.entries(input.attributes).sort(([left], [right]) =>
          left.localeCompare(right, 'vi'),
        ),
      ),
    );
    if (new Set(canonicalAttributes).size !== canonicalAttributes.length) {
      throw new BadRequestException({
        code: 'DUPLICATE_VARIANT_ATTRIBUTES',
        message: 'Danh sách có tổ hợp phân loại bị trùng',
        details: [{ field: 'variants' }],
      });
    }
    this.assertVariantAttributeSchema(
      inputs[0].attributes,
      inputs.slice(1).map((input) => input.attributes),
    );

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${parsedProductId})`;
      const skus: string[] = [];
      const generatedSkus = new Set<string>();
      while (skus.length < inputs.length) {
        const sku = await this.generateVariantSku(
          parsedProductId,
          product.slug,
          tx,
        );
        if (!generatedSkus.has(sku)) {
          generatedSkus.add(sku);
          skus.push(sku);
        }
      }
      const existingVariants = await tx.productVariant.findMany({
        where: { productId: parsedProductId },
        select: { attributes: true },
      });
      const existingAttributes = existingVariants.map((variant) =>
        this.readVariantAttributes(variant),
      );
      this.assertVariantAttributeSchema(
        inputs[0].attributes,
        existingAttributes,
      );
      const hasDuplicate = inputs.some(({ attributes }) =>
        existingAttributes.some((candidate) =>
          this.variantAttributesEqual(candidate, attributes),
        ),
      );
      if (hasDuplicate) {
        throw new ConflictException({
          code: 'DUPLICATE_VARIANT_ATTRIBUTES',
          message: 'Một hoặc nhiều tổ hợp phân loại đã tồn tại',
          details: [{ field: 'variants' }],
        });
      }

      const createdVariants: SellerProductVariantResponse[] = [];
      for (const [index, input] of inputs.entries()) {
        const variant = await tx.productVariant.create({
          data: {
            productId: parsedProductId,
            sku: skus[index],
            variantName: Object.values(input.attributes).join(' / '),
            attributes: input.attributes,
            price: input.price,
            compareAtPrice: input.compareAtPrice,
            weightGram: input.weightGram,
            variantStatus: input.variantStatus,
            createdAt: now,
            updatedAt: now,
          },
          include: { inventoryRecords: true },
        });
        const inventory = await tx.productInventory.create({
          data: {
            productId: parsedProductId,
            productVariantId: variant.id,
            quantityOnHand: input.quantityOnHand,
            quantityReserved: 0,
            quantityAvailable: input.quantityOnHand,
            quantityDamaged: 0,
            quantityIncoming: 0,
            lowStockThreshold: 5,
            updatedAt: now,
          },
        });

        if (input.quantityOnHand > 0) {
          await tx.inventoryTransaction.create({
            data: {
              productInventoryId: inventory.id,
              transactionType: INVENTORY_TRANSACTION_SELLER_SET_STOCK,
              quantityChange: input.quantityOnHand,
              quantityAfter: input.quantityOnHand,
              referenceType: INVENTORY_REFERENCE_TYPE_PRODUCT_VARIANT,
              referenceId: variant.id,
              note: 'Seller set initial inventory quantity',
              createdByUserId: user.id,
              createdAt: now,
            },
          });
        }

        createdVariants.push(
          this.toSellerVariantResponse({
            ...variant,
            inventoryRecords: [
              { quantityAvailable: inventory.quantityAvailable },
            ],
          }),
        );
      }
      return createdVariants;
    });
  }

  async updateSellerProductVariant(
    user: AuthenticatedUser,
    productId: string,
    variantId: string,
    dto: UpdateProductVariantDto,
  ): Promise<SellerProductVariantResponse> {
    const parsedProductId = this.parseId(productId, 'productId');
    const parsedVariantId = this.parseId(variantId, 'variantId');
    const { variant } = await this.requireSellerVariant(
      user,
      parsedProductId,
      parsedVariantId,
    );
    const data: Prisma.ProductVariantUpdateInput = {
      updatedAt: new Date(),
    };

    if (dto.attributes !== undefined) {
      const attributes = this.normalizeVariantAttributes(dto.attributes);
      this.assertVariantAttributeSchema(attributes, [
        this.readVariantAttributes(variant),
      ]);
      data.attributes = attributes;
      data.variantName = Object.values(attributes).join(' / ');
    }

    const price =
      dto.price === undefined
        ? this.toDecimal(variant.price)
        : this.parsePositiveMoney(dto.price, 'price');
    const compareAtPrice =
      dto.compareAtPrice === undefined
        ? variant.compareAtPrice
          ? this.toDecimal(variant.compareAtPrice)
          : null
        : this.parseOptionalCompareAtPrice(dto.compareAtPrice, price);

    if (dto.price !== undefined) {
      data.price = price;
    }

    if (dto.compareAtPrice !== undefined) {
      data.compareAtPrice = compareAtPrice;
    }

    if (compareAtPrice && compareAtPrice.lt(price)) {
      throw new BadRequestException({
        code: 'INVALID_COMPARE_AT_PRICE',
        message: 'Compare at price must be greater than or equal to price',
        details: [{ field: 'compareAtPrice' }],
      });
    }

    if (dto.weightGram !== undefined) {
      data.weightGram = dto.weightGram;
    }

    if (dto.variantStatus !== undefined) {
      data.variantStatus = dto.variantStatus;
    }

    const updatedVariant = await this.prisma.$transaction(async (tx) => {
      if (dto.attributes !== undefined) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${parsedProductId})`;
        const attributes = this.normalizeVariantAttributes(dto.attributes);
        const duplicates = await tx.productVariant.findMany({
          where: { productId: parsedProductId, id: { not: parsedVariantId } },
          select: { attributes: true },
        });
        if (
          duplicates.some((candidate) =>
            this.variantAttributesEqual(
              this.readVariantAttributes(candidate),
              attributes,
            ),
          )
        ) {
          throw new ConflictException({
            code: 'DUPLICATE_VARIANT_ATTRIBUTES',
            message: 'Tổ hợp phân loại này đã tồn tại',
            details: [{ field: 'attributes' }],
          });
        }
      }

      return tx.productVariant.update({
        where: { id: parsedVariantId },
        data,
        include: { inventoryRecords: true },
      });
    });

    return this.toSellerVariantResponse(updatedVariant);
  }

  async deleteSellerProductVariant(
    user: AuthenticatedUser,
    productId: string,
    variantId: string,
  ): Promise<SellerProductVariantResponse> {
    const parsedProductId = this.parseId(productId, 'productId');
    const parsedVariantId = this.parseId(variantId, 'variantId');

    await this.requireSellerVariant(user, parsedProductId, parsedVariantId);

    const deletedVariant = await this.prisma.productVariant.update({
      where: { id: parsedVariantId },
      data: {
        variantStatus: INACTIVE_VARIANT_STATUS,
        updatedAt: new Date(),
      },
      include: { inventoryRecords: true },
    });

    return this.toSellerVariantResponse(deletedVariant);
  }

  async listSellerProductImages(
    user: AuthenticatedUser,
    productId: string,
  ): Promise<SellerProductImageResponse[]> {
    const parsedProductId = this.parseId(productId, 'productId');

    await this.requireSellerProduct(user, parsedProductId);

    const images = await this.prisma.productImage.findMany({
      where: { productId: parsedProductId },
      orderBy: [{ isThumbnail: 'desc' }, { sortOrder: 'asc' }],
    });

    return images.map((image) => this.toSellerImageResponse(image));
  }

  async createSellerProductImage(
    user: AuthenticatedUser,
    productId: string,
    dto: CreateProductImageDto,
  ): Promise<SellerProductImageResponse> {
    const parsedProductId = this.parseId(productId, 'productId');
    const productVariantId = await this.parseAndRequireVariantForImage(
      user,
      parsedProductId,
      dto.productVariantId,
    );

    await this.requireSellerProduct(user, parsedProductId);

    const assetId = this.parseId(dto.assetId, 'assetId');
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.uploadAsset.findFirst({
        where: {
          id: assetId,
          ownerUserId: user.id,
          status: 'Pending',
          productImage: null,
        },
      });
      if (!asset) {
        throw new BadRequestException({
          code: 'UPLOAD_ASSET_NOT_ATTACHABLE',
          message:
            'Hình ảnh không tồn tại, không thuộc tài khoản hoặc đã được sử dụng',
          details: [{ field: 'assetId' }],
        });
      }
      const imageCount = await tx.productImage.count({
        where: { productId: parsedProductId },
      });
      const isThumbnail = imageCount === 0 || dto.isThumbnail === true;
      if (isThumbnail) {
        await tx.productImage.updateMany({
          where: { productId: parsedProductId, isThumbnail: true },
          data: { isThumbnail: false },
        });
      }

      const image = await tx.productImage.create({
        data: {
          assetId,
          productId: parsedProductId,
          productVariantId,
          imageUrl: asset.url,
          altText: this.normalizeNullableText(dto.altText),
          sortOrder: dto.sortOrder ?? 0,
          isThumbnail,
          createdAt: now,
        },
      });
      const attached = await tx.uploadAsset.updateMany({
        where: { id: assetId, ownerUserId: user.id, status: 'Pending' },
        data: { status: 'Attached', attachedAt: now },
      });
      if (attached.count !== 1) {
        throw new ConflictException({
          code: 'UPLOAD_ASSET_ALREADY_ATTACHED',
          message: 'Hình ảnh vừa được sử dụng. Vui lòng chọn hình khác.',
          details: [],
        });
      }

      return this.toSellerImageResponse(image);
    });
  }

  async updateSellerProductImage(
    user: AuthenticatedUser,
    productId: string,
    imageId: string,
    dto: UpdateProductImageDto,
  ): Promise<SellerProductImageResponse> {
    const parsedProductId = this.parseId(productId, 'productId');
    const parsedImageId = this.parseId(imageId, 'imageId');

    await this.requireSellerImage(user, parsedProductId, parsedImageId);

    const data: Prisma.ProductImageUpdateInput = {};

    if (dto.productVariantId !== undefined) {
      const productVariantId = await this.parseAndRequireVariantForImage(
        user,
        parsedProductId,
        dto.productVariantId,
      );

      data.productVariant = productVariantId
        ? { connect: { id: productVariantId } }
        : { disconnect: true };
    }

    if (dto.altText !== undefined) {
      data.altText = this.normalizeNullableText(dto.altText);
    }

    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }

    if (dto.isThumbnail !== undefined) {
      data.isThumbnail = dto.isThumbnail;
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isThumbnail) {
        await tx.productImage.updateMany({
          where: {
            productId: parsedProductId,
            isThumbnail: true,
            NOT: { id: parsedImageId },
          },
          data: { isThumbnail: false },
        });
      }

      const image = await tx.productImage.update({
        where: { id: parsedImageId },
        data,
      });

      return this.toSellerImageResponse(image);
    });
  }

  async deleteSellerProductImage(
    user: AuthenticatedUser,
    productId: string,
    imageId: string,
  ): Promise<DeleteProductImageResponse> {
    const parsedProductId = this.parseId(productId, 'productId');
    const parsedImageId = this.parseId(imageId, 'imageId');

    const current = await this.requireSellerImage(
      user,
      parsedProductId,
      parsedImageId,
    );
    await this.prisma.$transaction(async (tx) => {
      await tx.productImage.delete({ where: { id: parsedImageId } });
      if (current.isThumbnail) {
        const next = await tx.productImage.findFirst({
          where: { productId: parsedProductId },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
          select: { id: true },
        });
        if (next) {
          await tx.productImage.update({
            where: { id: next.id },
            data: { isThumbnail: true },
          });
        }
      }
    });

    return {
      id: parsedImageId.toString(),
      deleted: true,
    };
  }

  async getSellerVariantInventory(
    user: AuthenticatedUser,
    productId: string,
    variantId: string,
  ): Promise<SellerProductInventoryResponse> {
    const parsedProductId = this.parseId(productId, 'productId');
    const parsedVariantId = this.parseId(variantId, 'variantId');

    await this.requireSellerVariant(user, parsedProductId, parsedVariantId);

    const inventory = await this.prisma.productInventory.findUnique({
      where: { productVariantId: parsedVariantId },
    });

    return this.toInventoryResponse(
      inventory,
      parsedProductId,
      parsedVariantId,
    );
  }

  async listSellerVariantInventoryTransactions(
    user: AuthenticatedUser,
    productId: string,
    variantId: string,
    query: PaginationQueryDto,
  ) {
    const parsedProductId = this.parseId(productId, 'productId');
    const parsedVariantId = this.parseId(variantId, 'variantId');
    await this.requireSellerVariant(user, parsedProductId, parsedVariantId);
    const { page, limit, skip, take } = getPaginationParams(query);
    const inventory = await this.prisma.productInventory.findUnique({
      where: { productVariantId: parsedVariantId },
      select: { id: true },
    });
    if (!inventory) {
      return createPaginatedResult<SellerInventoryTransactionResponse>({
        items: [],
        page,
        limit,
        total: 0,
      });
    }

    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.inventoryTransaction.findMany({
        where: { productInventoryId: inventory.id },
        include: { createdByUser: { select: { id: true, email: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.inventoryTransaction.count({
        where: { productInventoryId: inventory.id },
      }),
    ]);

    return createPaginatedResult<SellerInventoryTransactionResponse>({
      items: transactions.map((transaction) => ({
        id: transaction.id.toString(),
        idString: transaction.id.toString(),
        transactionType: transaction.transactionType,
        affectedBucket: this.getInventoryTransactionAffectedBucket(
          transaction.transactionType,
        ),
        quantityChange: transaction.quantityChange,
        quantityAfter: transaction.quantityAfter,
        referenceType: transaction.referenceType,
        referenceId: transaction.referenceId?.toString() ?? null,
        note: transaction.note,
        createdBy: transaction.createdByUser
          ? {
              id: transaction.createdByUser.id.toString(),
              email: transaction.createdByUser.email,
            }
          : null,
        createdAt: transaction.createdAt,
      })),
      page,
      limit,
      total,
    });
  }

  async receiveSellerVariantInventory(
    user: AuthenticatedUser,
    productId: string,
    variantId: string,
    dto: ReceiveProductInventoryDto,
  ): Promise<SellerProductInventoryResponse> {
    const parsedProductId = this.parseId(productId, 'productId');
    const parsedVariantId = this.parseId(variantId, 'variantId');

    await this.requireSellerVariant(user, parsedProductId, parsedVariantId);

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const existingInventory = await tx.productInventory.findUnique({
        where: { productVariantId: parsedVariantId },
      });
      const inventory = existingInventory
        ? await tx.productInventory.update({
            where: { id: existingInventory.id },
            data: {
              quantityOnHand: { increment: dto.quantityReceived },
              quantityAvailable: { increment: dto.quantityReceived },
              updatedAt: now,
            },
          })
        : await tx.productInventory.create({
            data: {
              productId: parsedProductId,
              productVariantId: parsedVariantId,
              quantityOnHand: dto.quantityReceived,
              quantityReserved: 0,
              quantityAvailable: dto.quantityReceived,
              quantityDamaged: 0,
              quantityIncoming: 0,
              lowStockThreshold: 5,
              updatedAt: now,
            },
          });

      await tx.inventoryTransaction.create({
        data: {
          productInventoryId: inventory.id,
          transactionType: INVENTORY_TRANSACTION_RECEIVE_STOCK,
          quantityChange: dto.quantityReceived,
          quantityAfter: inventory.quantityAvailable,
          referenceType: INVENTORY_REFERENCE_TYPE_PRODUCT_VARIANT,
          referenceId: parsedVariantId,
          note: `Seller received ${dto.quantityReceived} unit(s) into stock`,
          createdByUserId: user.id,
          createdAt: now,
        },
      });

      return this.toInventoryResponse(
        inventory,
        parsedProductId,
        parsedVariantId,
      );
    });
  }

  private async requireSellerProduct(
    user: AuthenticatedUser,
    productId: bigint,
  ) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        isDeleted: false,
        shop: {
          ownerUserId: user.id,
          shopStatus: PUBLIC_SHOP_STATUS,
          isDeleted: false,
        },
      },
      select: {
        id: true,
        shopId: true,
        basePrice: true,
        compareAtPrice: true,
        productStatus: true,
        categoryId: true,
        productName: true,
        description: true,
        brand: true,
        warrantyMonths: true,
        slug: true,
      },
    });

    if (!product) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found',
        details: [{ field: 'productId' }],
      });
    }

    return product;
  }

  private async requireSellerVariant(
    user: AuthenticatedUser,
    productId: bigint,
    variantId: bigint,
  ) {
    const product = await this.requireSellerProduct(user, productId);
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: variantId,
        productId,
      },
      include: { inventoryRecords: true },
    });

    if (!variant) {
      throw new NotFoundException({
        code: 'PRODUCT_VARIANT_NOT_FOUND',
        message: 'Product variant not found',
        details: [{ field: 'variantId' }],
      });
    }

    return { product, variant };
  }

  private async requireSellerImage(
    user: AuthenticatedUser,
    productId: bigint,
    imageId: bigint,
  ) {
    await this.requireSellerProduct(user, productId);

    const image = await this.prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId,
      },
    });

    if (!image) {
      throw new NotFoundException({
        code: 'PRODUCT_IMAGE_NOT_FOUND',
        message: 'Product image not found',
        details: [{ field: 'imageId' }],
      });
    }

    return image;
  }

  private async parseAndRequireVariantForImage(
    user: AuthenticatedUser,
    productId: bigint,
    productVariantId: string | undefined,
  ): Promise<bigint | null> {
    if (productVariantId === undefined) {
      return null;
    }

    const parsedVariantId = this.parseId(productVariantId, 'productVariantId');

    await this.requireSellerVariant(user, productId, parsedVariantId);

    return parsedVariantId;
  }

  private async generateVariantSku(
    productId: bigint,
    productSlug: string,
    client: Pick<PrismaService, 'productVariant'> = this.prisma,
  ) {
    const prefix =
      productSlug
        .replace(/[^a-z0-9]/gi, '')
        .slice(0, 12)
        .toUpperCase() || 'SP';

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const sku = `${prefix}-${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
      const existing = await client.productVariant.findFirst({
        where: { productId, sku },
        select: { id: true },
      });
      if (!existing) return sku;
    }

    throw new ConflictException({
      code: 'PRODUCT_VARIANT_SKU_GENERATION_FAILED',
      message: 'Không thể tạo mã SKU. Vui lòng thử lại.',
      details: [],
    });
  }

  private async ensureSkuAvailable(
    productId: bigint,
    sku: string,
    excludeVariantId?: bigint,
  ): Promise<void> {
    const existingVariant = await this.prisma.productVariant.findFirst({
      where: {
        productId,
        sku,
        ...(excludeVariantId ? { NOT: { id: excludeVariantId } } : {}),
      },
      select: { id: true },
    });

    if (existingVariant) {
      throw new ConflictException({
        code: 'PRODUCT_VARIANT_SKU_EXISTS',
        message: 'Variant SKU already exists in this product',
        details: [{ field: 'sku', sku }],
      });
    }
  }

  private async findPublicProducts(query: ProductListQueryDto) {
    const { page, limit, skip, take } = getPaginationParams(query);
    const where = this.buildPublicWhere(query);
    const orderBy = this.buildOrderBy(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          shop: {
            select: {
              id: true,
              shopName: true,
              slug: true,
            },
          },
          category: {
            select: {
              id: true,
              categoryName: true,
              slug: true,
            },
          },
          images: {
            orderBy: [{ isThumbnail: 'desc' }, { sortOrder: 'asc' }],
          },
          variants: {
            where: {
              variantStatus: PUBLIC_VARIANT_STATUS,
              inventoryRecords: {
                some: {
                  quantityAvailable: { gt: 0 },
                },
              },
            },
            orderBy: [{ price: 'asc' }],
            include: {
              inventoryRecords: true,
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  private async findPublicProductBySlug(slug: string) {
    return this.prisma.product.findFirst({
      where: {
        slug,
        productStatus: PUBLIC_PRODUCT_STATUS,
        isDeleted: false,
        isViolation: false,
        shop: {
          shopStatus: PUBLIC_SHOP_STATUS,
          isDeleted: false,
          ownerUser: {
            userStatus: 'Active',
            isDeleted: false,
          },
          OR: [
            { operationMode: ShopOperationMode.Open },
            {
              operationMode: ShopOperationMode.PausedUntil,
              pauseStartsAt: { gt: new Date() },
            },
            {
              operationMode: ShopOperationMode.PausedUntil,
              pauseEndsAt: { lte: new Date() },
            },
          ],
        },
        category: {
          isActive: true,
        },
        variants: {
          some: {
            variantStatus: PUBLIC_VARIANT_STATUS,
            inventoryRecords: {
              some: {
                quantityAvailable: { gt: 0 },
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        shop: {
          select: {
            id: true,
            shopName: true,
            slug: true,
            avatarAsset: { select: { url: true } },
          },
        },
        category: {
          select: {
            id: true,
            categoryName: true,
            slug: true,
          },
        },
        images: {
          orderBy: [{ isThumbnail: 'desc' }, { sortOrder: 'asc' }],
        },
        variants: {
          where: {
            variantStatus: PUBLIC_VARIANT_STATUS,
          },
          orderBy: [{ price: 'asc' }],
          include: {
            inventoryRecords: true,
            images: {
              orderBy: [{ isThumbnail: 'desc' }, { sortOrder: 'asc' }],
            },
          },
        },
      },
    });
  }

  private buildPublicWhere(query: ProductListQueryDto) {
    const categoryId = this.parseOptionalId(query.categoryId, 'categoryId');
    const q = query.q?.trim();
    const priceFilter: { gte?: number; lte?: number } = {};

    if (query.minPrice !== undefined) {
      priceFilter.gte = query.minPrice;
    }

    if (query.maxPrice !== undefined) {
      priceFilter.lte = query.maxPrice;
    }

    if (
      priceFilter.gte !== undefined &&
      priceFilter.lte !== undefined &&
      priceFilter.gte > priceFilter.lte
    ) {
      throw new BadRequestException({
        code: 'INVALID_PRICE_RANGE',
        message: 'minPrice không được lớn hơn maxPrice',
        details: [{ field: 'minPrice' }, { field: 'maxPrice' }],
      });
    }

    return {
      productStatus: PUBLIC_PRODUCT_STATUS,
      isDeleted: false,
      isViolation: false,
      ...(categoryId ? { categoryId } : {}),
      ...(Object.keys(priceFilter).length > 0
        ? { basePrice: priceFilter }
        : {}),
      ...(q
        ? {
            AND: q
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 8)
              .map((token) => ({
                OR: [
                  {
                    productName: {
                      contains: token,
                      mode: 'insensitive' as const,
                    },
                  },
                  { brand: { contains: token, mode: 'insensitive' as const } },
                  {
                    description: {
                      contains: token,
                      mode: 'insensitive' as const,
                    },
                  },
                  {
                    category: {
                      categoryName: {
                        contains: token,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                  {
                    shop: {
                      shopName: {
                        contains: token,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                  {
                    variants: {
                      some: {
                        OR: [
                          {
                            sku: {
                              contains: token,
                              mode: 'insensitive' as const,
                            },
                          },
                          {
                            variantName: {
                              contains: token,
                              mode: 'insensitive' as const,
                            },
                          },
                        ],
                      },
                    },
                  },
                ],
              })),
          }
        : {}),
      shop: {
        shopStatus: PUBLIC_SHOP_STATUS,
        isDeleted: false,
        ownerUser: {
          userStatus: 'Active',
          isDeleted: false,
        },
        OR: [
          { operationMode: ShopOperationMode.Open },
          {
            operationMode: ShopOperationMode.PausedUntil,
            pauseStartsAt: { gt: new Date() },
          },
          {
            operationMode: ShopOperationMode.PausedUntil,
            pauseEndsAt: { lte: new Date() },
          },
        ],
      },
      category: {
        isActive: true,
      },
      variants: {
        some: {
          variantStatus: PUBLIC_VARIANT_STATUS,
          inventoryRecords: {
            some: {
              quantityAvailable: { gt: 0 },
            },
          },
        },
      },
    };
  }

  private buildOrderBy(query: ProductListQueryDto) {
    const sortOrder = query.sortOrder ?? 'desc';

    switch (query.sortBy) {
      case 'basePrice':
        return [{ basePrice: sortOrder }, { createdAt: 'desc' as const }];
      case 'soldCount':
        return [{ soldCount: sortOrder }, { createdAt: 'desc' as const }];
      case 'viewCount':
        return [{ viewCount: sortOrder }, { createdAt: 'desc' as const }];
      case 'productName':
        return [{ productName: sortOrder }, { createdAt: 'desc' as const }];
      case 'createdAt':
      default:
        return [{ createdAt: sortOrder }];
    }
  }

  private parseOptionalId(
    value: string | undefined,
    field: string,
  ): bigint | null {
    if (value === undefined) {
      return null;
    }

    if (!/^\d+$/.test(value)) {
      throw new BadRequestException({
        code: 'INVALID_ID',
        message: 'Id không hợp lệ',
        details: [{ field }],
      });
    }

    return BigInt(value);
  }

  private toListItem(product: ProductEntity): ProductListItemResponse {
    const variants = product.variants.map((variant) =>
      this.toVariantResponse(variant),
    );
    const images = product.images.map((image) => this.toImageResponse(image));
    const thumbnailImage =
      images.find((image) => image.isThumbnail) ?? images[0] ?? null;
    const prices = variants.map((variant) => Number(variant.price));
    const fallbackPrice = this.decimalToRequiredString(product.basePrice);
    const quantityAvailable = variants.reduce(
      (total, variant) => total + variant.quantityAvailable,
      0,
    );

    return {
      id: product.id.toString(),
      idString: product.id.toString(),
      productName: product.productName,
      slug: product.slug,
      description: product.description,
      brand: product.brand,
      basePrice: this.decimalToRequiredString(product.basePrice),
      compareAtPrice: this.decimalToString(product.compareAtPrice),
      priceMin: prices.length > 0 ? String(Math.min(...prices)) : fallbackPrice,
      priceMax: prices.length > 0 ? String(Math.max(...prices)) : fallbackPrice,
      thumbnailImage,
      images,
      variants,
      quantityAvailable,
      soldCount: product.soldCount.toString(),
      viewCount: product.viewCount.toString(),
      shop: {
        id: product.shop.id.toString(),
        idString: product.shop.id.toString(),
        shopName: product.shop.shopName,
        slug: product.shop.slug,
      },
      category: {
        id: product.category.id.toString(),
        idString: product.category.id.toString(),
        categoryName: product.category.categoryName,
        slug: product.category.slug,
      },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private toSellerListItem(
    product: ProductEntity,
  ): SellerProductListItemResponse {
    return {
      ...this.toListItem(product),
      productStatus: product.productStatus,
      warrantyMonths: product.warrantyMonths,
      isViolation: product.isViolation,
      isDeleted: product.isDeleted,
    };
  }

  private toVariantResponse(
    variant: VariantResponseSource,
  ): ProductListVariantResponse {
    const attributes = this.readVariantAttributes(variant);
    const image = variant.images?.[0];
    return {
      id: variant.id.toString(),
      idString: variant.id.toString(),
      sku: variant.sku,
      variantName: variant.variantName,
      attributes,
      price: this.decimalToRequiredString(variant.price),
      compareAtPrice: this.decimalToString(variant.compareAtPrice),
      quantityAvailable: variant.inventoryRecords.reduce(
        (total, inventory) => total + inventory.quantityAvailable,
        0,
      ),
      image: image ? this.toImageResponse(image) : null,
    };
  }

  private toSellerVariantResponse(variant: {
    id: bigint;
    productId: bigint;
    sku: string;
    variantName: string;
    attributes: Prisma.JsonValue;
    price: { toString(): string };
    compareAtPrice: { toString(): string } | null;
    weightGram: number;
    variantStatus: string;
    createdAt: Date;
    updatedAt: Date | null;
    inventoryRecords: Array<{ quantityAvailable: number }>;
    images?: ProductImageEntity[];
  }): SellerProductVariantResponse {
    return {
      ...this.toVariantResponse(variant),
      productId: variant.productId.toString(),
      productIdString: variant.productId.toString(),
      weightGram: variant.weightGram,
      variantStatus: variant.variantStatus,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
    };
  }

  private toImageResponse(image: ProductImageEntity): ProductListImageResponse {
    return {
      id: image.id.toString(),
      idString: image.id.toString(),
      imageUrl: image.imageUrl,
      altText: image.altText,
      sortOrder: image.sortOrder,
      isThumbnail: image.isThumbnail,
    };
  }

  private toSellerImageResponse(image: {
    id: bigint;
    assetId: bigint | null;
    productId: bigint;
    productVariantId: bigint | null;
    imageUrl: string;
    altText: string | null;
    sortOrder: number;
    isThumbnail: boolean;
    createdAt: Date;
  }): SellerProductImageResponse {
    return {
      ...this.toImageResponse(image),
      productId: image.productId.toString(),
      productIdString: image.productId.toString(),
      productVariantId: image.productVariantId?.toString() ?? null,
      productVariantIdString: image.productVariantId?.toString() ?? null,
      createdAt: image.createdAt,
    };
  }

  async markSellerVariantInventoryDamaged(
    user: AuthenticatedUser,
    productId: string,
    variantId: string,
    dto: AdjustDamagedInventoryDto,
  ): Promise<SellerProductInventoryResponse> {
    const parsedProductId = this.parseId(productId, 'productId');
    const parsedVariantId = this.parseId(variantId, 'variantId');
    await this.requireSellerVariant(user, parsedProductId, parsedVariantId);

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const update = await tx.productInventory.updateMany({
        where: {
          productVariantId: parsedVariantId,
          quantityAvailable: { gte: dto.quantity },
        },
        data: {
          quantityAvailable: { decrement: dto.quantity },
          quantityDamaged: { increment: dto.quantity },
          updatedAt: now,
        },
      });
      if (update.count !== 1) {
        const current = await tx.productInventory.findUnique({
          where: { productVariantId: parsedVariantId },
        });
        throw new BadRequestException({
          code: 'INSUFFICIENT_AVAILABLE_INVENTORY',
          message: 'Available inventory is not enough to mark as damaged',
          details: [{ quantityAvailable: current?.quantityAvailable ?? 0 }],
        });
      }
      const inventory = await tx.productInventory.findUniqueOrThrow({
        where: { productVariantId: parsedVariantId },
      });
      await tx.inventoryTransaction.create({
        data: {
          productInventoryId: inventory.id,
          transactionType: INVENTORY_TRANSACTION_MARK_DAMAGED,
          quantityChange: -dto.quantity,
          quantityAfter: inventory.quantityAvailable,
          referenceType: INVENTORY_REFERENCE_TYPE_PRODUCT_VARIANT,
          referenceId: parsedVariantId,
          note: `Marked ${dto.quantity} unit(s) as damaged: ${dto.reason}`,
          createdByUserId: user.id,
          createdAt: now,
        },
      });
      return this.toInventoryResponse(
        inventory,
        parsedProductId,
        parsedVariantId,
      );
    });
  }

  async disposeSellerVariantDamagedInventory(
    user: AuthenticatedUser,
    productId: string,
    variantId: string,
    dto: AdjustDamagedInventoryDto,
  ): Promise<SellerProductInventoryResponse> {
    const parsedProductId = this.parseId(productId, 'productId');
    const parsedVariantId = this.parseId(variantId, 'variantId');
    await this.requireSellerVariant(user, parsedProductId, parsedVariantId);

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const update = await tx.productInventory.updateMany({
        where: {
          productVariantId: parsedVariantId,
          quantityDamaged: { gte: dto.quantity },
          quantityOnHand: { gte: dto.quantity },
        },
        data: {
          quantityDamaged: { decrement: dto.quantity },
          quantityOnHand: { decrement: dto.quantity },
          updatedAt: now,
        },
      });
      if (update.count !== 1) {
        const current = await tx.productInventory.findUnique({
          where: { productVariantId: parsedVariantId },
        });
        throw new BadRequestException({
          code: 'INSUFFICIENT_DAMAGED_INVENTORY',
          message: 'Damaged inventory is not enough to dispose',
          details: [{ quantityDamaged: current?.quantityDamaged ?? 0 }],
        });
      }
      const inventory = await tx.productInventory.findUniqueOrThrow({
        where: { productVariantId: parsedVariantId },
      });
      await tx.inventoryTransaction.create({
        data: {
          productInventoryId: inventory.id,
          transactionType: INVENTORY_TRANSACTION_DISPOSE_DAMAGED,
          quantityChange: -dto.quantity,
          quantityAfter: inventory.quantityOnHand,
          referenceType: INVENTORY_REFERENCE_TYPE_PRODUCT_VARIANT,
          referenceId: parsedVariantId,
          note: `Disposed ${dto.quantity} damaged unit(s): ${dto.reason}`,
          createdByUserId: user.id,
          createdAt: now,
        },
      });
      return this.toInventoryResponse(
        inventory,
        parsedProductId,
        parsedVariantId,
      );
    });
  }

  private getInventoryTransactionAffectedBucket(
    transactionType: string,
  ): 'AVAILABLE' | 'ON_HAND' | 'RESERVED' | 'UNKNOWN' {
    if (transactionType === INVENTORY_TRANSACTION_DISPOSE_DAMAGED) {
      return 'ON_HAND';
    }
    if (
      transactionType === INVENTORY_TRANSACTION_RECEIVE_STOCK ||
      transactionType === INVENTORY_TRANSACTION_MARK_DAMAGED ||
      transactionType === INVENTORY_TRANSACTION_SELLER_SET_STOCK
    ) {
      return 'AVAILABLE';
    }
    if (transactionType.includes('RESERV')) {
      return 'RESERVED';
    }
    return 'UNKNOWN';
  }

  private toInventoryResponse(
    inventory: {
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
    } | null,
    productId: bigint,
    productVariantId: bigint,
  ): SellerProductInventoryResponse {
    if (!inventory) {
      return {
        id: null,
        idString: null,
        productId: productId.toString(),
        productIdString: productId.toString(),
        productVariantId: productVariantId.toString(),
        productVariantIdString: productVariantId.toString(),
        quantityOnHand: 0,
        quantityReserved: 0,
        quantityAvailable: 0,
        quantityDamaged: 0,
        quantityIncoming: 0,
        lowStockThreshold: 5,
        updatedAt: null,
      };
    }

    return {
      id: inventory.id.toString(),
      idString: inventory.id.toString(),
      productId: inventory.productId.toString(),
      productIdString: inventory.productId.toString(),
      productVariantId: inventory.productVariantId.toString(),
      productVariantIdString: inventory.productVariantId.toString(),
      quantityOnHand: inventory.quantityOnHand,
      quantityReserved: inventory.quantityReserved,
      quantityAvailable: inventory.quantityAvailable,
      quantityDamaged: inventory.quantityDamaged,
      quantityIncoming: inventory.quantityIncoming,
      lowStockThreshold: inventory.lowStockThreshold,
      updatedAt: inventory.updatedAt,
    };
  }

  private decimalToString(
    value: { toString: () => string } | null,
  ): string | null {
    return value?.toString() ?? null;
  }

  private decimalToRequiredString(value: { toString: () => string }): string {
    return value.toString();
  }

  private parseUniqueIds(values: string[], field: string): bigint[] {
    return [...new Set(values)].map((value) => this.parseId(value, field));
  }

  private async requireShopCategories(
    shopId: bigint,
    shopCategoryIds: bigint[],
  ): Promise<void> {
    if (shopCategoryIds.length === 0) return;
    const count = await this.prisma.shopCategory.count({
      where: {
        id: { in: shopCategoryIds },
        shopId,
        isActive: true,
      },
    });
    if (count !== shopCategoryIds.length) {
      throw new BadRequestException({
        code: 'INVALID_SHOP_CATEGORIES',
        message: 'Danh mục gian hàng không hợp lệ',
        details: [{ field: 'shopCategoryIds' }],
      });
    }
  }

  private parseId(value: string, field: string): bigint {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException({
        code: 'INVALID_ID',
        message: 'Id không hợp lệ',
        details: [{ field }],
      });
    }

    return BigInt(value);
  }

  private parseMoney(value: string, field: string): Prisma.Decimal {
    try {
      return new Prisma.Decimal(value);
    } catch {
      throw new BadRequestException({
        code: 'INVALID_MONEY',
        message: 'Giá trị tiền không hợp lệ',
        details: [{ field }],
      });
    }
  }

  private parsePositiveMoney(value: string, field: string): Prisma.Decimal {
    const decimal = this.parseMoney(value, field);

    if (!decimal.gt(0)) {
      throw new BadRequestException({
        code: 'INVALID_PRICE',
        message: 'Price must be greater than zero',
        details: [{ field }],
      });
    }

    return decimal;
  }

  private parseOptionalCompareAtPrice(
    value: string | undefined,
    price: Prisma.Decimal,
  ): Prisma.Decimal | null {
    if (value === undefined) {
      return null;
    }

    const compareAtPrice = this.parseMoney(value, 'compareAtPrice');

    if (compareAtPrice.lt(price)) {
      throw new BadRequestException({
        code: 'INVALID_COMPARE_AT_PRICE',
        message: 'Compare at price must be greater than or equal to price',
        details: [{ field: 'compareAtPrice' }],
      });
    }

    return compareAtPrice;
  }

  private toDecimal(value: { toString(): string }): Prisma.Decimal {
    return new Prisma.Decimal(value.toString());
  }

  private slugify(value: string): string {
    return value
      .replace(/[đĐ]/g, 'd')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 280);
  }

  private normalizeNullableText(value: string | undefined): string | null {
    if (value === undefined) {
      return null;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeVariantAttributes(
    attributes: Record<string, string> | undefined,
  ): Record<string, string> {
    if (
      !attributes ||
      Array.isArray(attributes) ||
      typeof attributes !== 'object'
    ) {
      throw new BadRequestException({
        code: 'INVALID_VARIANT_ATTRIBUTES',
        message: 'Thuộc tính phân loại phải là một đối tượng',
        details: [{ field: 'attributes' }],
      });
    }
    const entries = Object.entries(attributes);
    if (entries.length < 1 || entries.length > 2) {
      throw new BadRequestException({
        code: 'INVALID_VARIANT_ATTRIBUTE_LEVELS',
        message: 'Mỗi sản phẩm chỉ được có từ 1 đến 2 cấp phân loại',
        details: [{ field: 'attributes' }],
      });
    }
    const normalized: Record<string, string> = {};
    const seen = new Set<string>();
    for (const [rawName, rawValue] of entries) {
      if (typeof rawValue !== 'string') {
        throw new BadRequestException({
          code: 'INVALID_VARIANT_ATTRIBUTES',
          message: 'Tên và giá trị thuộc tính phải là chuỗi',
          details: [{ field: 'attributes' }],
        });
      }
      const name = rawName.trim();
      const value = rawValue.trim();
      const key = name.toLocaleLowerCase('vi');
      if (
        !name ||
        !value ||
        name.length > 100 ||
        value.length > 255 ||
        seen.has(key)
      ) {
        throw new BadRequestException({
          code: 'INVALID_VARIANT_ATTRIBUTES',
          message: 'Tên và giá trị thuộc tính không hợp lệ hoặc bị trùng',
          details: [{ field: 'attributes' }],
        });
      }
      seen.add(key);
      normalized[name] = value;
    }
    return normalized;
  }

  private assertVariantAttributeSchema(
    attributes: Record<string, string>,
    existingAttributes: Record<string, string>[],
  ): void {
    const names = Object.keys(attributes).sort((left, right) =>
      left.localeCompare(right, 'vi'),
    );
    const hasMismatch = existingAttributes.some((candidate) => {
      const candidateNames = Object.keys(candidate).sort((left, right) =>
        left.localeCompare(right, 'vi'),
      );
      return (
        names.length !== candidateNames.length ||
        names.some((name, index) => name !== candidateNames[index])
      );
    });

    if (hasMismatch) {
      throw new BadRequestException({
        code: 'VARIANT_ATTRIBUTE_SCHEMA_MISMATCH',
        message:
          'Tên các cấp phân loại phải giống nhau trên mọi SKU của sản phẩm',
        details: [{ field: 'attributes' }],
      });
    }
  }

  private variantAttributesEqual(
    left: Record<string, string>,
    right: Prisma.InputJsonObject,
  ): boolean {
    const rightEntries = Object.entries(right);
    return (
      Object.keys(left).length === rightEntries.length &&
      rightEntries.every(([name, value]) => left[name] === value)
    );
  }

  private readVariantAttributes(
    variant: Pick<VariantResponseSource, 'attributes'>,
  ): Record<string, string> {
    const source = variant.attributes;
    if (!source || Array.isArray(source) || typeof source !== 'object')
      return {};
    return Object.fromEntries(
      Object.entries(source).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  }
}
