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
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { ProductListQueryDto } from './dto/product-list-query.dto';
import { SetProductInventoryDto } from './dto/set-product-inventory.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import {
  DeleteProductImageResponse,
  ProductListImageResponse,
  ProductListItemResponse,
  ProductListVariantResponse,
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
  price: { toString(): string };
  compareAtPrice: { toString(): string } | null;
  inventoryRecords: Array<{ quantityAvailable: number }>;
};

const PUBLIC_PRODUCT_STATUS = 'Published';
const PUBLIC_VARIANT_STATUS = 'Active';
const PUBLIC_SHOP_STATUS = 'Approved';
const DEFAULT_PRODUCT_STATUS = 'Draft';
const DELETED_PRODUCT_STATUS = 'Deleted';
const INACTIVE_VARIANT_STATUS = 'Inactive';
const INVENTORY_TRANSACTION_SELLER_SET_STOCK = 'SELLER_SET_STOCK';
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
    const normalized = displayTerm.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi');
    if (normalized.length < 2) return;
    await this.prisma.searchTermStat.upsert({ where: { normalized }, create: { normalized, displayTerm }, update: { displayTerm, searchCount: { increment: 1 }, lastSearchedAt: new Date() } });
  }

  async listTopSearchedProducts(limit = 6) {
    const terms = await this.prisma.searchTermStat.findMany({ orderBy: [{ searchCount: 'desc' }, { lastSearchedAt: 'desc' }], take: Math.min(limit * 3, 30) });
    const results: Array<{ product: ProductListItemResponse; searchCount: string }> = [];
    const seen = new Set<string>();
    for (const term of terms) {
      if (results.length >= limit) break;
      const { items } = await this.findPublicProducts({ q: term.displayTerm, page: 1, limit: 1 } as ProductListQueryDto);
      const product = items[0];
      if (!product || seen.has(product.id.toString())) continue;
      seen.add(product.id.toString());
      results.push({ product: this.toListItem(product), searchCount: term.searchCount.toString() });
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

    return this.toListItem(product);
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

  async listAdminProducts(query: PaginationQueryDto & { status?: string }) {
    const { page, limit, skip, take } = getPaginationParams(query);
    const where = { isDeleted: false, ...(query.status ? { productStatus: query.status } : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, orderBy: [{ createdAt: 'desc' }], skip, take, include: { shop: { select: { id: true, shopName: true, slug: true } }, category: { select: { id: true, categoryName: true, slug: true } }, images: { orderBy: [{ isThumbnail: 'desc' }, { sortOrder: 'asc' }] }, variants: { orderBy: [{ price: 'asc' }], include: { inventoryRecords: true } } } }),
      this.prisma.product.count({ where }),
    ]);
    return createPaginatedResult({ items: items.map((product) => this.toSellerListItem(product)), page, limit, total });
  }

  async moderateProduct(user: AuthenticatedUser, productId: string, approved: boolean) {
    const id = this.parseId(productId, 'productId');
    const product = await this.prisma.product.findFirst({ where: { id, isDeleted: false } });
    if (!product) throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Không tìm thấy sản phẩm', details: [] });
    if (product.productStatus !== 'PendingApproval') throw new BadRequestException({ code: 'PRODUCT_NOT_PENDING', message: 'Sản phẩm không ở trạng thái chờ duyệt', details: [] });
    const updated = await this.prisma.product.update({ where: { id }, data: { productStatus: approved ? 'Published' : 'Rejected', updatedByUserId: user.id, updatedAt: new Date() }, include: { shop: { select: { id: true, shopName: true, slug: true } }, category: { select: { id: true, categoryName: true, slug: true } }, images: { orderBy: [{ isThumbnail: 'desc' }, { sortOrder: 'asc' }] }, variants: { orderBy: [{ price: 'asc' }], include: { inventoryRecords: true } } } });
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

    const now = new Date();
    const product = await this.prisma.product.create({
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
        weightGram: dto.weightGram ?? 0,
        productStatus: dto.productStatus === 'Published' ? 'PendingApproval' : DEFAULT_PRODUCT_STATUS,
        isViolation: false,
        isDeleted: false,
        createdByUserId: user.id,
        updatedByUserId: user.id,
        createdAt: now,
        updatedAt: now,
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

    return this.toSellerListItem(product);
  }

  async updateSellerProduct(
    user: AuthenticatedUser,
    productId: string,
    dto: UpdateProductDto,
  ): Promise<SellerProductListItemResponse> {
    const id = this.parseId(productId, 'productId');
    const product = await this.requireSellerProduct(user, id);
    const data: Prisma.ProductUpdateInput = {
      updatedByUser: { connect: { id: user.id } },
      updatedAt: new Date(),
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

    if (dto.weightGram !== undefined) {
      data.weightGram = dto.weightGram;
    }

    if (dto.productStatus !== undefined) {
      data.productStatus = dto.productStatus === 'Published' ? 'PendingApproval' : 'Draft';
    } else if (product.productStatus === 'Published' || product.productStatus === 'Rejected') {
      data.productStatus = 'PendingApproval';
    }

    const updatedProduct = await this.prisma.product.update({
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
    });

    return this.toSellerListItem(updatedProduct);
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

    await this.requireSellerProduct(user, parsedProductId);
    await this.ensureSkuAvailable(parsedProductId, dto.sku);

    const price = this.parsePositiveMoney(dto.price, 'price');
    const compareAtPrice = this.parseOptionalCompareAtPrice(
      dto.compareAtPrice,
      price,
    );
    const now = new Date();
    const variant = await this.prisma.productVariant.create({
      data: {
        productId: parsedProductId,
        sku: dto.sku,
        variantName: dto.variantName,
        variantOptionJson: this.normalizeVariantOptionJson(
          dto.variantOptionJson,
        ),
        price,
        compareAtPrice,
        weightGram: dto.weightGram ?? 0,
        variantStatus: dto.variantStatus ?? PUBLIC_VARIANT_STATUS,
        createdAt: now,
        updatedAt: now,
      },
      include: { inventoryRecords: true },
    });

    return this.toSellerVariantResponse(variant);
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

    if (dto.sku !== undefined && dto.sku !== variant.sku) {
      await this.ensureSkuAvailable(parsedProductId, dto.sku, parsedVariantId);
      data.sku = dto.sku;
    }

    if (dto.variantName !== undefined) {
      data.variantName = dto.variantName;
    }

    if (dto.variantOptionJson !== undefined) {
      data.variantOptionJson = this.normalizeVariantOptionJson(
        dto.variantOptionJson,
      );
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

    const updatedVariant = await this.prisma.productVariant.update({
      where: { id: parsedVariantId },
      data,
      include: { inventoryRecords: true },
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

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      if (dto.isThumbnail) {
        await tx.productImage.updateMany({
          where: { productId: parsedProductId, isThumbnail: true },
          data: { isThumbnail: false },
        });
      }

      const image = await tx.productImage.create({
        data: {
          productId: parsedProductId,
          productVariantId,
          imageUrl: dto.imageUrl,
          altText: this.normalizeNullableText(dto.altText),
          sortOrder: dto.sortOrder ?? 0,
          isThumbnail: dto.isThumbnail ?? false,
          createdAt: now,
        },
      });

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

    if (dto.imageUrl !== undefined) {
      data.imageUrl = dto.imageUrl;
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

    await this.requireSellerImage(user, parsedProductId, parsedImageId);
    await this.prisma.productImage.delete({
      where: { id: parsedImageId },
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

  async setSellerVariantInventory(
    user: AuthenticatedUser,
    productId: string,
    variantId: string,
    dto: SetProductInventoryDto,
  ): Promise<SellerProductInventoryResponse> {
    const parsedProductId = this.parseId(productId, 'productId');
    const parsedVariantId = this.parseId(variantId, 'variantId');

    await this.requireSellerVariant(user, parsedProductId, parsedVariantId);

    return this.prisma.$transaction(async (tx) => {
      const existingInventory = await tx.productInventory.findUnique({
        where: { productVariantId: parsedVariantId },
      });
      const quantityReserved = existingInventory?.quantityReserved ?? 0;

      if (dto.quantityOnHand < quantityReserved) {
        throw new BadRequestException({
          code: 'INVALID_INVENTORY_QUANTITY',
          message: 'Quantity on hand cannot be lower than reserved quantity',
          details: [
            {
              field: 'quantityOnHand',
              quantityReserved,
            },
          ],
        });
      }

      const now = new Date();
      const previousQuantityAvailable =
        existingInventory?.quantityAvailable ?? 0;
      const quantityAvailable = dto.quantityOnHand - quantityReserved;
      const lowStockThreshold =
        dto.lowStockThreshold ?? existingInventory?.lowStockThreshold ?? 5;
      const inventory = existingInventory
        ? await tx.productInventory.update({
            where: { id: existingInventory.id },
            data: {
              quantityOnHand: dto.quantityOnHand,
              quantityAvailable,
              lowStockThreshold,
              updatedAt: now,
            },
          })
        : await tx.productInventory.create({
            data: {
              productId: parsedProductId,
              productVariantId: parsedVariantId,
              quantityOnHand: dto.quantityOnHand,
              quantityReserved,
              quantityAvailable,
              lowStockThreshold,
              updatedAt: now,
            },
          });

      await tx.inventoryTransaction.create({
        data: {
          productInventoryId: inventory.id,
          transactionType: INVENTORY_TRANSACTION_SELLER_SET_STOCK,
          quantityChange: quantityAvailable - previousQuantityAvailable,
          quantityAfter: quantityAvailable,
          referenceType: INVENTORY_REFERENCE_TYPE_PRODUCT_VARIANT,
          referenceId: parsedVariantId,
          note: 'Seller updated inventory quantity',
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
            { operationMode: ShopOperationMode.PausedUntil, pauseStartsAt: { gt: new Date() } },
            { operationMode: ShopOperationMode.PausedUntil, pauseEndsAt: { lte: new Date() } },
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
                  { productName: { contains: token, mode: 'insensitive' as const } },
                  { brand: { contains: token, mode: 'insensitive' as const } },
                  { description: { contains: token, mode: 'insensitive' as const } },
                  { category: { categoryName: { contains: token, mode: 'insensitive' as const } } },
                  { shop: { shopName: { contains: token, mode: 'insensitive' as const } } },
                  { variants: { some: { OR: [
                    { sku: { contains: token, mode: 'insensitive' as const } },
                    { variantName: { contains: token, mode: 'insensitive' as const } },
                  ] } } },
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
          { operationMode: ShopOperationMode.PausedUntil, pauseStartsAt: { gt: new Date() } },
          { operationMode: ShopOperationMode.PausedUntil, pauseEndsAt: { lte: new Date() } },
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
      isViolation: product.isViolation,
      isDeleted: product.isDeleted,
    };
  }

  private toVariantResponse(
    variant: VariantResponseSource,
  ): ProductListVariantResponse {
    return {
      id: variant.id.toString(),
      idString: variant.id.toString(),
      sku: variant.sku,
      variantName: variant.variantName,
      price: this.decimalToRequiredString(variant.price),
      compareAtPrice: this.decimalToString(variant.compareAtPrice),
      quantityAvailable: variant.inventoryRecords.reduce(
        (total, inventory) => total + inventory.quantityAvailable,
        0,
      ),
    };
  }

  private toSellerVariantResponse(variant: {
    id: bigint;
    productId: bigint;
    sku: string;
    variantName: string;
    variantOptionJson: string | null;
    price: { toString(): string };
    compareAtPrice: { toString(): string } | null;
    weightGram: number;
    variantStatus: string;
    createdAt: Date;
    updatedAt: Date | null;
    inventoryRecords: Array<{ quantityAvailable: number }>;
  }): SellerProductVariantResponse {
    return {
      ...this.toVariantResponse(variant),
      productId: variant.productId.toString(),
      productIdString: variant.productId.toString(),
      variantOptionJson: variant.variantOptionJson,
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

  private toInventoryResponse(
    inventory: {
      id: bigint;
      productId: bigint;
      productVariantId: bigint;
      quantityOnHand: number;
      quantityReserved: number;
      quantityAvailable: number;
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

  private normalizeVariantOptionJson(value: string | undefined): string | null {
    const trimmed = this.normalizeNullableText(value);

    if (!trimmed) {
      return null;
    }

    try {
      JSON.parse(trimmed);
    } catch {
      throw new BadRequestException({
        code: 'INVALID_VARIANT_OPTION_JSON',
        message: 'Variant option JSON is invalid',
        details: [{ field: 'variantOptionJson' }],
      });
    }

    return trimmed;
  }
}
