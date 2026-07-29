import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import {
  CartItemResponse,
  CartResponse,
  DeleteCartItemResponse,
} from './types';

const ACTIVE_CART_STATUS = 'Active';
const PUBLIC_PRODUCT_STATUS = 'Published';
const PUBLIC_VARIANT_STATUS = 'Active';
const PUBLIC_SHOP_STATUS = 'Approved';

const cartItemInclude = {
  cart: true,
  shop: {
    select: {
      id: true,
      shopName: true,
      slug: true,
      shopStatus: true,
      isDeleted: true,
      operationMode: true,
      pauseStartsAt: true,
      pauseEndsAt: true,
      ownerUser: {
        select: {
          userStatus: true,
          isDeleted: true,
        },
      },
    },
  },
  product: {
    include: {
      images: {
        orderBy: [{ isThumbnail: 'desc' }, { sortOrder: 'asc' }],
      },
    },
  },
  productVariant: {
    include: {
      inventoryRecords: true,
    },
  },
} satisfies Prisma.CartItemInclude;

const cartInclude = {
  items: {
    orderBy: [{ createdAt: 'desc' }],
    include: cartItemInclude,
  },
} satisfies Prisma.CartInclude;

const variantInclude = {
  inventoryRecords: true,
  product: {
    include: {
      shop: {
        select: {
          id: true,
          shopName: true,
          slug: true,
          shopStatus: true,
          isDeleted: true,
          operationMode: true,
          pauseStartsAt: true,
          pauseEndsAt: true,
          ownerUser: {
            select: {
              userStatus: true,
              isDeleted: true,
            },
          },
        },
      },
      category: {
        select: {
          id: true,
          categoryName: true,
          slug: true,
          isActive: true,
        },
      },
      images: {
        orderBy: [{ isThumbnail: 'desc' }, { sortOrder: 'asc' }],
      },
    },
  },
} satisfies Prisma.ProductVariantInclude;

type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;
type CartItemEntity = Prisma.CartItemGetPayload<{
  include: typeof cartItemInclude;
}>;
type PurchasableVariant = Prisma.ProductVariantGetPayload<{
  include: typeof variantInclude;
}>;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyCart(user: AuthenticatedUser): Promise<CartResponse> {
    const cart = await this.getOrCreateActiveCart(user.id);

    return this.toCartResponse(cart);
  }

  async addItem(
    user: AuthenticatedUser,
    dto: AddCartItemDto,
  ): Promise<CartItemResponse> {
    const variantId = this.parseId(dto.productVariantId, 'productVariantId');
    const variant = await this.requirePurchasableVariant(variantId);
    const cart = await this.getOrCreateActiveCart(user.id);
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productVariantId: variant.id,
      },
      include: cartItemInclude,
    });
    const quantity = (existingItem?.quantity ?? 0) + dto.quantity;

    this.ensureStockAvailable(variant, quantity);

    const now = new Date();

    if (existingItem) {
      const updatedItem = await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity,
          unitPriceSnapshot: variant.price,
          updatedAt: now,
        },
        include: cartItemInclude,
      });
      await this.touchCart(cart.id, now);

      return this.toItemResponse(updatedItem);
    }

    const item = await this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        shopId: variant.product.shop.id,
        productId: variant.product.id,
        productVariantId: variant.id,
        quantity,
        unitPriceSnapshot: variant.price,
        isSelected: true,
        createdAt: now,
        updatedAt: now,
      },
      include: cartItemInclude,
    });
    await this.touchCart(cart.id, now);

    return this.toItemResponse(item);
  }

  async updateItem(
    user: AuthenticatedUser,
    cartItemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartItemResponse> {
    const id = this.parseId(cartItemId, 'id');
    const item = await this.requireOwnedCartItem(user.id, id);
    const data: {
      quantity?: number;
      isSelected?: boolean;
      unitPriceSnapshot?: string;
      updatedAt?: Date;
    } = {};

    if (dto.quantity !== undefined) {
      const variant = await this.requirePurchasableVariant(
        item.productVariantId,
      );

      this.ensureStockAvailable(variant, dto.quantity);
      data.quantity = dto.quantity;
      data.unitPriceSnapshot = variant.price.toString();
    }

    if (dto.isSelected !== undefined) {
      if (dto.isSelected) {
        await this.requirePurchasableVariant(item.productVariantId);
      }
      data.isSelected = dto.isSelected;
    }

    if (Object.keys(data).length === 0) {
      return this.toItemResponse(item);
    }

    const now = new Date();
    const updatedItem = await this.prisma.cartItem.update({
      where: { id },
      data: {
        ...data,
        updatedAt: now,
      },
      include: cartItemInclude,
    });
    await this.touchCart(item.cartId, now);

    return this.toItemResponse(updatedItem);
  }

  async selectItem(
    user: AuthenticatedUser,
    cartItemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartItemResponse> {
    if (dto.isSelected === undefined) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'isSelected is required',
        details: [{ field: 'isSelected' }],
      });
    }

    return this.updateItem(user, cartItemId, {
      isSelected: dto.isSelected,
    });
  }

  async deleteItem(
    user: AuthenticatedUser,
    cartItemId: string,
  ): Promise<DeleteCartItemResponse> {
    const id = this.parseId(cartItemId, 'id');
    const item = await this.requireOwnedCartItem(user.id, id);

    await this.prisma.cartItem.delete({
      where: { id },
    });
    await this.touchCart(item.cartId, new Date());

    return {
      id: id.toString(),
      deleted: true,
    };
  }

  private async getOrCreateActiveCart(userId: bigint): Promise<CartWithItems> {
    const existingCart = await this.findActiveCartWithItems(userId);

    if (existingCart) {
      return existingCart;
    }

    try {
      await this.prisma.cart.create({
        data: {
          userId,
          cartStatus: ACTIVE_CART_STATUS,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }
    }

    const cart = await this.findActiveCartWithItems(userId);

    if (!cart) {
      throw new Error('Active cart was not created.');
    }

    return cart;
  }

  private findActiveCartWithItems(userId: bigint) {
    return this.prisma.cart.findFirst({
      where: {
        userId,
        cartStatus: ACTIVE_CART_STATUS,
      },
      orderBy: { createdAt: 'desc' },
      include: cartInclude,
    });
  }

  private async requireOwnedCartItem(
    userId: bigint,
    itemId: bigint,
  ): Promise<CartItemEntity> {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: cartItemInclude,
    });

    if (!item) {
      throw new NotFoundException({
        code: 'CART_ITEM_NOT_FOUND',
        message: 'Cart item not found',
        details: [{ field: 'id' }],
      });
    }

    if (
      item.cart.userId !== userId ||
      item.cart.cartStatus !== ACTIVE_CART_STATUS
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have access to this cart item',
        details: [],
      });
    }

    return item;
  }

  private async requirePurchasableVariant(
    variantId: bigint,
  ): Promise<PurchasableVariant> {
    const variant = await this.findVariantForCart(variantId);

    if (
      !variant ||
      variant.variantStatus !== PUBLIC_VARIANT_STATUS ||
      variant.product.productStatus !== PUBLIC_PRODUCT_STATUS ||
      variant.product.isDeleted ||
      variant.product.isViolation ||
      !variant.product.category.isActive ||
      variant.product.shop.shopStatus !== PUBLIC_SHOP_STATUS ||
      variant.product.shop.isDeleted ||
      variant.product.shop.ownerUser.userStatus !== 'Active' ||
      variant.product.shop.ownerUser.isDeleted ||
      this.isShopPaused(variant.product.shop, new Date())
    ) {
      throw new NotFoundException({
        code: 'PRODUCT_VARIANT_NOT_FOUND',
        message: 'Product variant is not available',
        details: [{ field: 'productVariantId' }],
      });
    }

    return variant;
  }

  private findVariantForCart(variantId: bigint) {
    return this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: variantInclude,
    });
  }

  private ensureStockAvailable(
    variant: PurchasableVariant,
    quantity: number,
  ): void {
    const quantityAvailable = this.getQuantityAvailable(variant);

    if (quantityAvailable < quantity) {
      throw new BadRequestException({
        code: 'OUT_OF_STOCK',
        message: 'Not enough stock for this product variant',
        details: [
          {
            field: 'quantity',
            requestedQuantity: quantity,
            quantityAvailable,
          },
        ],
      });
    }
  }

  private async touchCart(cartId: bigint, updatedAt: Date): Promise<void> {
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { updatedAt },
    });
  }

  private parseId(value: string, field: string): bigint {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException({
        code: 'INVALID_ID',
        message: 'Id is invalid',
        details: [{ field }],
      });
    }

    return BigInt(value);
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private toCartResponse(cart: CartWithItems): CartResponse {
    const items = cart.items.map((item) => this.toItemResponse(item));
    const subtotal = items.reduce(
      (total, item) => total + Number(item.lineTotal),
      0,
    );
    const selectedSubtotal = items
      .filter((item) => item.isSelected)
      .reduce((total, item) => total + Number(item.lineTotal), 0);

    return {
      id: cart.id.toString(),
      idString: cart.id.toString(),
      cartStatus: cart.cartStatus,
      items,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      selectedItemCount: items
        .filter((item) => item.isSelected)
        .reduce((total, item) => total + item.quantity, 0),
      subtotal: String(subtotal),
      selectedSubtotal: String(selectedSubtotal),
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  private toItemResponse(item: CartItemEntity): CartItemResponse {
    const unitPriceSnapshot = item.unitPriceSnapshot.toString();
    const lineTotal = Number(unitPriceSnapshot) * item.quantity;
    const thumbnail = item.product.images[0] ?? null;
    const availability = this.getItemAvailability(item);
    const effectiveSelected = item.isSelected && availability.isAvailable;

    return {
      id: item.id.toString(),
      idString: item.id.toString(),
      quantity: item.quantity,
      isSelected: effectiveSelected,
      availability,
      unitPriceSnapshot,
      lineTotal: String(lineTotal),
      product: {
        id: item.product.id.toString(),
        idString: item.product.id.toString(),
        productName: item.product.productName,
        slug: item.product.slug,
        thumbnailImage: thumbnail
          ? {
              imageUrl: thumbnail.imageUrl,
              altText: thumbnail.altText,
            }
          : null,
      },
      variant: {
        id: item.productVariant.id.toString(),
        idString: item.productVariant.id.toString(),
        sku: item.productVariant.sku,
        variantName: item.productVariant.variantName,
        price: item.productVariant.price.toString(),
        quantityAvailable: this.getQuantityAvailable(item.productVariant),
      },
      shop: {
        id: item.shop.id.toString(),
        idString: item.shop.id.toString(),
        shopName: item.shop.shopName,
        slug: item.shop.slug,
      },
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private getItemAvailability(item: CartItemEntity): CartItemResponse['availability'] {
    if (item.shop.ownerUser.isDeleted || item.shop.ownerUser.userStatus !== 'Active') {
      return { isAvailable: false, code: 'SELLER_SUSPENDED', message: 'Người bán hiện không thể nhận đơn.' };
    }
    if (item.shop.isDeleted || item.shop.shopStatus !== PUBLIC_SHOP_STATUS) {
      return { isAvailable: false, code: 'SHOP_UNAVAILABLE', message: 'Gian hàng hiện không nhận đơn.' };
    }
    if (this.isShopPaused(item.shop, new Date())) {
      const message = item.shop.operationMode === 'PausedUntil' && item.shop.pauseEndsAt
        ? `Gian hàng tạm nghỉ đến ${item.shop.pauseEndsAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}.`
        : 'Gian hàng đang tạm nghỉ và chưa có ngày mở lại.';
      return { isAvailable: false, code: 'SHOP_PAUSED', message };
    }
    if (item.product.isDeleted || item.product.isViolation || item.product.productStatus !== PUBLIC_PRODUCT_STATUS) {
      return { isAvailable: false, code: 'PRODUCT_UNAVAILABLE', message: 'Sản phẩm hiện không còn khả dụng.' };
    }
    if (item.productVariant.variantStatus !== PUBLIC_VARIANT_STATUS) {
      return { isAvailable: false, code: 'VARIANT_UNAVAILABLE', message: 'Phân loại sản phẩm hiện không khả dụng.' };
    }
    const quantityAvailable = this.getQuantityAvailable(item.productVariant);
    if (quantityAvailable < item.quantity) {
      return { isAvailable: false, code: 'INSUFFICIENT_STOCK', message: `Chỉ còn ${quantityAvailable} sản phẩm.` };
    }
    return { isAvailable: true, code: null, message: null };
  }

  private isShopPaused(shop: { operationMode: string; pauseStartsAt: Date | null; pauseEndsAt: Date | null }, now: Date): boolean {
    if (shop.operationMode === 'PausedIndefinitely') return true;
    return shop.operationMode === 'PausedUntil' && shop.pauseStartsAt !== null && shop.pauseEndsAt !== null && now >= shop.pauseStartsAt && now < shop.pauseEndsAt;
  }

  private getQuantityAvailable(item: {
    inventoryRecords: Array<{ quantityAvailable: number }>;
  }): number {
    return item.inventoryRecords.reduce(
      (total, inventory) => total + inventory.quantityAvailable,
      0,
    );
  }
}
