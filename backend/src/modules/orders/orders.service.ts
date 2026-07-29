import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { createPaginatedResult } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types';
import {
  CheckoutPreviewDto,
  CheckoutShippingSelectionDto,
} from './dto/checkout-preview.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { ConfirmShopOrderDto } from './dto/confirm-shop-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrepareShopOrderDto } from './dto/prepare-shop-order.dto';
import {
  CheckoutAddressSummary,
  CancelOrderResponse,
  CheckoutPaymentMethodSummary,
  CheckoutPreviewItem,
  CheckoutPreviewResponse,
  CheckoutPreviewShopGroup,
  CheckoutShippingSelectionSummary,
  CheckoutShopSummary,
  OrderItemResponse,
  OrderListItemResponse,
  OrderResponse,
  OrderShipmentResponse,
  OrderShipmentTrackingHistoryResponse,
  PaymentResponse,
  SellerShopOrderResponse,
  ShopOrderResponse,
} from './types';
import { VouchersService } from '../vouchers/vouchers.service';

const ACTIVE_CART_STATUS = 'Active';
const PUBLIC_PRODUCT_STATUS = 'Published';
const PUBLIC_VARIANT_STATUS = 'Active';
const PUBLIC_SHOP_STATUS = 'Approved';
const SHIPPING_COMPANY_STATUS_APPROVED = 'Approved';
const ORDER_STATUS_CREATED = 'Created';
const ORDER_STATUS_CONFIRMED = 'Confirmed';
const ORDER_STATUS_PREPARED = 'Prepared';
const ORDER_STATUS_CANCELLED = 'Cancelled';
const SHOP_ORDER_STATUS_WAITING_FOR_SELLER = 'WaitingForSeller';
const SHOP_ORDER_STATUS_CONFIRMED = 'Confirmed';
const SHOP_ORDER_STATUS_PREPARED = 'Prepared';
const PAYMENT_STATUS_PENDING = 'Pending';
const PAYMENT_STATUS_CANCELLED = 'Cancelled';
const ORDER_ITEM_STATUS_ACTIVE = 'Active';
const INVENTORY_TRANSACTION_RESERVE_ORDER = 'RESERVE_ORDER';
const INVENTORY_TRANSACTION_RELEASE_ORDER = 'RELEASE_ORDER';
const INVENTORY_REFERENCE_TYPE_ORDER_ITEM = 'ORDER_ITEM';

const checkoutCartItemInclude = {
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
      category: {
        select: {
          id: true,
          categoryName: true,
          slug: true,
          isActive: true,
        },
      },
      shopCategoryProducts: { select: { shopCategoryId: true } },
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

const checkoutCartInclude = {
  items: {
    orderBy: [{ createdAt: 'desc' }],
    include: checkoutCartItemInclude,
  },
} satisfies Prisma.CartInclude;

type CheckoutCart = Prisma.CartGetPayload<{
  include: typeof checkoutCartInclude;
}>;
type CheckoutCartItem = Prisma.CartItemGetPayload<{
  include: typeof checkoutCartItemInclude;
}>;

const orderHistoryInclude = {
  paymentMethod: true,
  shopOrders: {
    orderBy: [{ createdAt: 'asc' }],
    include: {
      shop: {
        select: {
          id: true,
          shopName: true,
          slug: true,
        },
      },
      items: {
        orderBy: [{ createdAt: 'asc' }],
      },
      shipments: {
        orderBy: [{ createdAt: 'asc' }],
        include: {
          shippingCompany: {
            select: {
              id: true,
              companyName: true,
              slug: true,
            },
          },
          shippingService: {
            select: {
              id: true,
              serviceCode: true,
              serviceName: true,
            },
          },
          trackingHistories: {
            orderBy: [{ createdAt: 'asc' }],
          },
        },
      },
    },
  },
  payments: {
    orderBy: [{ createdAt: 'desc' }],
  },
} satisfies Prisma.OrderInclude;

type OrderHistoryEntity = Prisma.OrderGetPayload<{
  include: typeof orderHistoryInclude;
}>;

type OrderHistoryShopOrder = OrderHistoryEntity['shopOrders'][number];

const sellerShopOrderInclude = {
  shop: {
    select: {
      id: true,
      shopName: true,
      slug: true,
    },
  },
  order: {
    select: {
      id: true,
      orderCode: true,
      orderStatus: true,
      paymentStatus: true,
      receiverName: true,
      receiverPhone: true,
      shippingProvince: true,
      shippingWard: true,
      shippingStreetAddress: true,
      customerNote: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  items: {
    orderBy: [{ createdAt: 'asc' }],
  },
  shipments: {
    orderBy: [{ createdAt: 'asc' }],
    include: {
      shippingCompany: {
        select: {
          id: true,
          companyName: true,
          slug: true,
        },
      },
      shippingService: {
        select: {
          id: true,
          serviceCode: true,
          serviceName: true,
        },
      },
      trackingHistories: {
        orderBy: [{ createdAt: 'asc' }],
      },
    },
  },
} satisfies Prisma.ShopOrderInclude;

type SellerShopOrderEntity = Prisma.ShopOrderGetPayload<{
  include: typeof sellerShopOrderInclude;
}>;

type ShopGroupAccumulator = {
  shop: CheckoutShopSummary;
  items: CheckoutPreviewItem[];
  subtotalAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  shippingFeeAmount: Prisma.Decimal;
  shippingSelection: ResolvedCheckoutShippingSelection | null;
  shopVoucher: ResolvedShopVoucher | null;
};

type ResolvedShopVoucher = {
  voucherId: bigint;
  voucherCode: string;
  voucherName: string;
  discountType: string;
  discountTarget: string;
  categoryIds: bigint[];
  discountAmount: Prisma.Decimal;
  eligibleAmount: Prisma.Decimal;
};

type ResolvedPlatformVoucher = ResolvedShopVoucher;

type CheckoutClient = PrismaService | Prisma.TransactionClient;

type CheckoutAddressEntity = {
  id: bigint;
  userId: bigint;
  receiverName: string;
  phoneNumber: string;
  province: string;
  ward: string;
  streetAddress: string;
  fullAddress: string | null;
  isDeleted: boolean;
};

type CheckoutPaymentMethodEntity = {
  id: bigint;
  methodCode: string;
  methodName: string;
  isOnline: boolean;
  isActive: boolean;
};

type CheckoutContext = {
  address: CheckoutAddressEntity;
  paymentMethod: CheckoutPaymentMethodEntity;
  cart: CheckoutCart;
  selectedItems: CheckoutCartItem[];
  items: CheckoutPreviewItem[];
  shopGroups: CheckoutPreviewShopGroup[];
  shopVouchersById: Map<string, ResolvedShopVoucher>;
  platformVoucher: ResolvedPlatformVoucher | null;
  subtotalAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  shippingFeeAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
};

type ResolvedCheckoutShippingSelection = {
  shippingQuoteId: bigint;
  shippingCompanyId: bigint;
  shippingServiceId: bigint;
  summary: CheckoutShippingSelectionSummary;
};

const checkoutShippingQuoteInclude = {
  shippingCompany: {
    select: {
      id: true,
      companyName: true,
      slug: true,
      companyStatus: true,
      isDeleted: true,
    },
  },
  shippingService: {
    select: {
      id: true,
      serviceCode: true,
      serviceName: true,
      isActive: true,
    },
  },
} satisfies Prisma.ShippingQuoteInclude;

type CheckoutShippingQuote = Prisma.ShippingQuoteGetPayload<{
  include: typeof checkoutShippingQuoteInclude;
}>;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vouchersService: VouchersService,
  ) {}

  async listMyOrders(user: AuthenticatedUser, query: PaginationQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId: user.id },
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
        include: orderHistoryInclude,
      }),
      this.prisma.order.count({ where: { userId: user.id } }),
    ]);

    return createPaginatedResult({
      items: orders.map((order) => this.toOrderListItemResponse(order)),
      page,
      limit,
      total,
      message: 'Orders retrieved successfully',
    });
  }

  async getMyOrderDetail(
    user: AuthenticatedUser,
    orderId: string,
  ): Promise<OrderListItemResponse> {
    const id = this.parseOrderId(orderId);
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: orderHistoryInclude,
    });

    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found',
        details: [{ field: 'orderId' }],
      });
    }

    return this.toOrderListItemResponse(order);
  }

  async listSellerShopOrders(
    user: AuthenticatedUser,
    query: PaginationQueryDto,
  ) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;
    const where = {
      shop: {
        ownerUserId: user.id,
        isDeleted: false,
      },
    };

    const [shopOrders, total] = await Promise.all([
      this.prisma.shopOrder.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
        include: sellerShopOrderInclude,
      }),
      this.prisma.shopOrder.count({ where }),
    ]);

    return createPaginatedResult({
      items: shopOrders.map((shopOrder) =>
        this.toSellerShopOrderResponse(shopOrder),
      ),
      page,
      limit,
      total,
      message: 'Seller shop orders retrieved successfully',
    });
  }

  async getSellerShopOrderDetail(
    user: AuthenticatedUser,
    shopOrderId: string,
  ): Promise<SellerShopOrderResponse> {
    const id = this.parseShopOrderId(shopOrderId);
    const shopOrder = await this.prisma.shopOrder.findFirst({
      where: {
        id,
        shop: {
          ownerUserId: user.id,
          isDeleted: false,
        },
      },
      include: sellerShopOrderInclude,
    });

    if (!shopOrder) {
      throw new NotFoundException({
        code: 'SHOP_ORDER_NOT_FOUND',
        message: 'Shop order not found',
        details: [{ field: 'shopOrderId' }],
      });
    }

    return this.toSellerShopOrderResponse(shopOrder);
  }

  async confirmSellerShopOrder(
    user: AuthenticatedUser,
    shopOrderId: string,
    dto: ConfirmShopOrderDto,
  ): Promise<SellerShopOrderResponse> {
    const id = this.parseShopOrderId(shopOrderId);

    return this.prisma.$transaction(async (tx) => {
      const shopOrder = await tx.shopOrder.findFirst({
        where: {
          id,
          shop: {
            ownerUserId: user.id,
            isDeleted: false,
          },
        },
        include: sellerShopOrderInclude,
      });

      if (!shopOrder) {
        throw new NotFoundException({
          code: 'SHOP_ORDER_NOT_FOUND',
          message: 'Shop order not found',
          details: [{ field: 'shopOrderId' }],
        });
      }

      if (shopOrder.orderStatus !== SHOP_ORDER_STATUS_WAITING_FOR_SELLER) {
        throw new BadRequestException({
          code: 'SHOP_ORDER_INVALID_STATUS',
          message: 'Only waiting shop orders can be confirmed',
          details: [
            {
              field: 'orderStatus',
              currentStatus: shopOrder.orderStatus,
              allowedStatus: SHOP_ORDER_STATUS_WAITING_FOR_SELLER,
            },
          ],
        });
      }

      const now = new Date();
      const updatedShopOrder = await tx.shopOrder.update({
        where: { id: shopOrder.id },
        data: {
          orderStatus: SHOP_ORDER_STATUS_CONFIRMED,
          confirmedAt: now,
          updatedAt: now,
          ...(dto.sellerNote !== undefined
            ? { sellerNote: this.normalizeNullableText(dto.sellerNote) }
            : {}),
        },
        include: sellerShopOrderInclude,
      });

      await tx.orderStatusHistory.create({
        data: {
          shopOrderId: shopOrder.id,
          fromStatus: shopOrder.orderStatus,
          toStatus: SHOP_ORDER_STATUS_CONFIRMED,
          changedByUserId: user.id,
          reason: 'Seller confirmed shop order',
          createdAt: now,
        },
      });

      await this.updateParentOrderStatusAfterShopOrderConfirm(
        tx,
        user,
        shopOrder.orderId,
        now,
      );

      return this.toSellerShopOrderResponse(updatedShopOrder);
    });
  }

  async prepareSellerShopOrder(
    user: AuthenticatedUser,
    shopOrderId: string,
    dto: PrepareShopOrderDto,
  ): Promise<SellerShopOrderResponse> {
    const id = this.parseShopOrderId(shopOrderId);

    return this.prisma.$transaction(async (tx) => {
      const shopOrder = await tx.shopOrder.findFirst({
        where: {
          id,
          shop: {
            ownerUserId: user.id,
            isDeleted: false,
          },
        },
        include: sellerShopOrderInclude,
      });

      if (!shopOrder) {
        throw new NotFoundException({
          code: 'SHOP_ORDER_NOT_FOUND',
          message: 'Shop order not found',
          details: [{ field: 'shopOrderId' }],
        });
      }

      if (shopOrder.orderStatus !== SHOP_ORDER_STATUS_CONFIRMED) {
        throw new BadRequestException({
          code: 'SHOP_ORDER_INVALID_STATUS',
          message: 'Only confirmed shop orders can be prepared',
          details: [
            {
              field: 'orderStatus',
              currentStatus: shopOrder.orderStatus,
              allowedStatus: SHOP_ORDER_STATUS_CONFIRMED,
            },
          ],
        });
      }

      const now = new Date();
      const updatedShopOrder = await tx.shopOrder.update({
        where: { id: shopOrder.id },
        data: {
          orderStatus: SHOP_ORDER_STATUS_PREPARED,
          preparedAt: now,
          updatedAt: now,
          ...(dto.sellerNote !== undefined
            ? { sellerNote: this.normalizeNullableText(dto.sellerNote) }
            : {}),
        },
        include: sellerShopOrderInclude,
      });

      await tx.orderStatusHistory.create({
        data: {
          shopOrderId: shopOrder.id,
          fromStatus: shopOrder.orderStatus,
          toStatus: SHOP_ORDER_STATUS_PREPARED,
          changedByUserId: user.id,
          reason: 'Seller prepared shop order',
          createdAt: now,
        },
      });

      await this.updateParentOrderStatusAfterShopOrderPrepare(
        tx,
        user,
        shopOrder.orderId,
        now,
      );

      return this.toSellerShopOrderResponse(updatedShopOrder);
    });
  }

  async checkoutPreview(
    user: AuthenticatedUser,
    dto: CheckoutPreviewDto,
  ): Promise<CheckoutPreviewResponse> {
    const context = await this.buildCheckoutContext(this.prisma, user, dto);

    return this.toCheckoutPreviewResponse(context);
  }

  async createOrder(
    user: AuthenticatedUser,
    dto: CreateOrderDto,
  ): Promise<OrderResponse> {
    return this.prisma.$transaction(async (tx) => {
      const context = await this.buildCheckoutContext(tx, user, dto);
      const now = new Date();
      const customerNote = this.normalizeNullableText(dto.customerNote);
      const order = await tx.order.create({
        data: {
          orderCode: this.createBusinessCode('ORD', now),
          userId: user.id,
          shippingAddressId: context.address.id,
          paymentMethodId: context.paymentMethod.id,
          orderStatus: ORDER_STATUS_CREATED,
          paymentStatus: PAYMENT_STATUS_PENDING,
          receiverName: context.address.receiverName,
          receiverPhone: context.address.phoneNumber,
          shippingProvince: context.address.province,
          shippingWard: context.address.ward,
          shippingStreetAddress: context.address.streetAddress,
          subtotalAmount: context.subtotalAmount,
          discountAmount: context.discountAmount,
          shippingFeeAmount: context.shippingFeeAmount,
          totalAmount: context.totalAmount,
          customerNote,
          createdAt: now,
          updatedAt: now,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: null,
          toStatus: ORDER_STATUS_CREATED,
          changedByUserId: user.id,
          reason: 'Order created from checkout',
          createdAt: now,
        },
      });

      if (context.platformVoucher) {
        await this.vouchersService.applyVoucherInTransaction(
          tx,
          user,
          context.platformVoucher.voucherId,
          context.platformVoucher.discountAmount,
          now,
          { orderId: order.id },
        );
      }

      const sourceItemsByCartItemId = new Map(
        context.selectedItems.map((item) => [item.id.toString(), item]),
      );
      const shopOrders: ShopOrderResponse[] = [];

      for (const group of context.shopGroups) {
        const shopOrder = await tx.shopOrder.create({
          data: {
            orderId: order.id,
            shopId: BigInt(group.shop.id),
            shopOrderCode: this.createBusinessCode('SORD', now),
            shippingCompanyId: group.shippingSelection
              ? BigInt(group.shippingSelection.shippingCompany.id)
              : null,
            shippingServiceId: group.shippingSelection
              ? BigInt(group.shippingSelection.shippingService.id)
              : null,
            shippingQuoteId: group.shippingSelection
              ? BigInt(group.shippingSelection.shippingQuoteId)
              : null,
            orderStatus: SHOP_ORDER_STATUS_WAITING_FOR_SELLER,
            subtotalAmount: this.toDecimal(group.subtotalAmount),
            discountAmount: this.toDecimal(group.discountAmount),
            shippingFeeAmount: this.toDecimal(group.shippingFeeAmount),
            totalAmount: this.toDecimal(group.totalAmount),
            createdAt: now,
            updatedAt: now,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            shopOrderId: shopOrder.id,
            fromStatus: null,
            toStatus: SHOP_ORDER_STATUS_WAITING_FOR_SELLER,
            changedByUserId: user.id,
            reason: 'Shop order created from checkout',
            createdAt: now,
          },
        });

        const shopVoucher = context.shopVouchersById.get(group.shop.id);
        if (shopVoucher) {
          await this.vouchersService.applyVoucherInTransaction(
            tx,
            user,
            shopVoucher.voucherId,
            shopVoucher.discountAmount,
            now,
            { orderId: order.id, shopOrderId: shopOrder.id },
          );
        }

        const orderItems: OrderItemResponse[] = [];

        for (const previewItem of group.items) {
          const sourceItem = sourceItemsByCartItemId.get(
            previewItem.cartItemId,
          );

          if (!sourceItem) {
            throw new Error('Checkout item source was not found.');
          }

          const orderItem = await tx.orderItem.create({
            data: {
              orderId: order.id,
              shopOrderId: shopOrder.id,
              shopId: sourceItem.shopId,
              productId: sourceItem.productId,
              productVariantId: sourceItem.productVariantId,
              productNameSnapshot: sourceItem.product.productName,
              variantNameSnapshot: sourceItem.productVariant.variantName,
              skuSnapshot: sourceItem.productVariant.sku,
              unitPrice: this.toDecimal(previewItem.unitPrice),
              quantity: sourceItem.quantity,
              discountAmount: this.toDecimal(previewItem.discountAmount),
              lineTotal: this.toDecimal(previewItem.lineTotal),
              itemStatus: ORDER_ITEM_STATUS_ACTIVE,
              createdAt: now,
            },
          });

          await this.reserveInventoryForOrderItem(
            tx,
            user,
            sourceItem,
            orderItem,
          );
          orderItems.push(this.toOrderItemResponse(orderItem));
        }

        shopOrders.push(
          this.toShopOrderResponse(shopOrder, group.shop, orderItems),
        );
      }

      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          paymentMethodId: context.paymentMethod.id,
          paymentCode: this.createBusinessCode('PAY', now),
          providerName: this.getProviderName(context.paymentMethod),
          amount: context.totalAmount,
          paymentStatus: PAYMENT_STATUS_PENDING,
          createdAt: now,
          updatedAt: now,
        },
      });

      await tx.paymentStatusHistory.create({
        data: {
          paymentId: payment.id,
          fromStatus: null,
          toStatus: PAYMENT_STATUS_PENDING,
          reason: 'Payment created from checkout',
          createdAt: now,
        },
      });

      await tx.cartItem.deleteMany({
        where: {
          cartId: context.cart.id,
          id: { in: context.selectedItems.map((item) => item.id) },
        },
      });
      await tx.cart.update({
        where: { id: context.cart.id },
        data: { updatedAt: now },
      });

      return this.toOrderResponse(order, context, shopOrders, [
        this.toPaymentResponse(payment, context.paymentMethod),
      ]);
    });
  }

  async cancelMyOrder(
    user: AuthenticatedUser,
    orderId: string,
    dto: CancelOrderDto,
  ): Promise<CancelOrderResponse> {
    const id = this.parseOrderId(orderId);

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id,
          userId: user.id,
        },
        include: {
          shopOrders: {
            include: {
              items: true,
            },
          },
          payments: true,
        },
      });

      if (!order) {
        throw new NotFoundException({
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
          details: [{ field: 'orderId' }],
        });
      }

      const invalidShopOrder = order.shopOrders.find(
        (shopOrder) =>
          shopOrder.orderStatus !== SHOP_ORDER_STATUS_WAITING_FOR_SELLER,
      );
      if (
        order.orderStatus !== ORDER_STATUS_CREATED ||
        invalidShopOrder !== undefined
      ) {
        throw new BadRequestException({
          code: 'ORDER_CANNOT_BE_CANCELLED',
          message:
            'Only orders waiting for seller confirmation can be cancelled',
          details: [
            {
              field: 'orderStatus',
              currentStatus: invalidShopOrder?.orderStatus ?? order.orderStatus,
              allowedStatus: ORDER_STATUS_CREATED,
            },
          ],
        });
      }

      const processedPayment = order.payments.find(
        (payment) => payment.paymentStatus !== PAYMENT_STATUS_PENDING,
      );
      if (processedPayment) {
        throw new BadRequestException({
          code: 'ORDER_PAYMENT_ALREADY_PROCESSED',
          message: 'A paid or processed order cannot be cancelled',
          details: [
            {
              paymentId: processedPayment.id.toString(),
              paymentStatus: processedPayment.paymentStatus,
            },
          ],
        });
      }

      const now = new Date();
      const orderUpdate = await tx.order.updateMany({
        where: {
          id: order.id,
          userId: user.id,
          orderStatus: ORDER_STATUS_CREATED,
          paymentStatus: PAYMENT_STATUS_PENDING,
        },
        data: {
          orderStatus: ORDER_STATUS_CANCELLED,
          paymentStatus: PAYMENT_STATUS_CANCELLED,
          cancelledAt: now,
          updatedAt: now,
        },
      });
      if (orderUpdate.count !== 1) {
        throw new BadRequestException({
          code: 'ORDER_CANNOT_BE_CANCELLED',
          message: 'Order status changed before cancellation completed',
          details: [{ field: 'orderStatus' }],
        });
      }

      await this.vouchersService.revertVoucherUsagesForOrder(tx, order.id);

      for (const shopOrder of order.shopOrders) {
        const shopOrderUpdate = await tx.shopOrder.updateMany({
          where: {
            id: shopOrder.id,
            orderStatus: SHOP_ORDER_STATUS_WAITING_FOR_SELLER,
          },
          data: {
            orderStatus: ORDER_STATUS_CANCELLED,
            updatedAt: now,
          },
        });
        if (shopOrderUpdate.count !== 1) {
          throw new BadRequestException({
            code: 'ORDER_CANNOT_BE_CANCELLED',
            message: 'Shop order status changed before cancellation completed',
            details: [{ shopOrderId: shopOrder.id.toString() }],
          });
        }

        await tx.orderStatusHistory.create({
          data: {
            shopOrderId: shopOrder.id,
            fromStatus: shopOrder.orderStatus,
            toStatus: ORDER_STATUS_CANCELLED,
            changedByUserId: user.id,
            reason: dto.reason,
            createdAt: now,
          },
        });

        for (const item of shopOrder.items) {
          const inventoryUpdate = await tx.productInventory.updateMany({
            where: {
              productVariantId: item.productVariantId,
              quantityReserved: { gte: item.quantity },
            },
            data: {
              quantityReserved: { decrement: item.quantity },
              quantityAvailable: { increment: item.quantity },
              updatedAt: now,
            },
          });
          if (inventoryUpdate.count !== 1) {
            throw new BadRequestException({
              code: 'INVENTORY_RESERVATION_INVALID',
              message: 'Reserved inventory is not enough to cancel order',
              details: [
                {
                  orderItemId: item.id.toString(),
                  productVariantId: item.productVariantId.toString(),
                  requestedQuantity: item.quantity,
                },
              ],
            });
          }

          const inventory = await tx.productInventory.findUnique({
            where: { productVariantId: item.productVariantId },
          });
          if (!inventory) {
            throw new BadRequestException({
              code: 'INVENTORY_NOT_FOUND',
              message: 'Inventory record was not found',
              details: [{ productVariantId: item.productVariantId.toString() }],
            });
          }

          await tx.inventoryTransaction.create({
            data: {
              productInventoryId: inventory.id,
              transactionType: INVENTORY_TRANSACTION_RELEASE_ORDER,
              quantityChange: item.quantity,
              quantityAfter: inventory.quantityAvailable,
              referenceType: INVENTORY_REFERENCE_TYPE_ORDER_ITEM,
              referenceId: item.id,
              note: `Released ${item.quantity} reserved unit(s) after order cancellation`,
              createdByUserId: user.id,
              createdAt: now,
            },
          });
        }
      }

      for (const payment of order.payments) {
        const paymentUpdate = await tx.payment.updateMany({
          where: {
            id: payment.id,
            paymentStatus: PAYMENT_STATUS_PENDING,
          },
          data: {
            paymentStatus: PAYMENT_STATUS_CANCELLED,
            updatedAt: now,
          },
        });
        if (paymentUpdate.count !== 1) {
          throw new BadRequestException({
            code: 'ORDER_PAYMENT_ALREADY_PROCESSED',
            message: 'Payment status changed before cancellation completed',
            details: [{ paymentId: payment.id.toString() }],
          });
        }

        await tx.paymentStatusHistory.create({
          data: {
            paymentId: payment.id,
            fromStatus: payment.paymentStatus,
            toStatus: PAYMENT_STATUS_CANCELLED,
            reason: dto.reason,
            createdAt: now,
          },
        });
      }

      await tx.orderCancellation.create({
        data: {
          orderId: order.id,
          requestedByUserId: user.id,
          cancellationReason: dto.reason,
          cancellationStatus: 'Approved',
          approvedByUserId: user.id,
          approvedAt: now,
          createdAt: now,
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.orderStatus,
          toStatus: ORDER_STATUS_CANCELLED,
          changedByUserId: user.id,
          reason: dto.reason,
          createdAt: now,
        },
      });

      return {
        id: order.id.toString(),
        idString: order.id.toString(),
        orderCode: order.orderCode,
        orderStatus: ORDER_STATUS_CANCELLED,
        paymentStatus: PAYMENT_STATUS_CANCELLED,
        cancelledAt: now,
      };
    });
  }

  private async buildCheckoutContext(
    client: CheckoutClient,
    user: AuthenticatedUser,
    dto: CheckoutPreviewDto,
  ): Promise<CheckoutContext> {
    const addressId = this.parseId(dto.addressId, 'addressId');
    const paymentMethodId = this.parseId(
      dto.paymentMethodId,
      'paymentMethodId',
    );
    const selectedCartItemIds = dto.selectedCartItemIds?.map((id) =>
      this.parseId(id, 'selectedCartItemIds'),
    );

    const [address, paymentMethod, cart] = await Promise.all([
      this.requireOwnedAddress(client, user, addressId),
      this.requireActivePaymentMethod(client, paymentMethodId),
      this.findActiveCart(client, user.id),
    ]);

    if (!cart) {
      throw new BadRequestException({
        code: 'CHECKOUT_CART_EMPTY',
        message: 'No cart items selected for checkout',
        details: [],
      });
    }

    const selectedItems = this.getSelectedItems(cart, selectedCartItemIds);

    if (selectedItems.length === 0) {
      throw new BadRequestException({
        code: 'CHECKOUT_CART_EMPTY',
        message: 'No cart items selected for checkout',
        details: [],
      });
    }

    const items = selectedItems.map((item) => this.toPreviewItem(item));
    const baseShopGroups = this.buildShopGroups(items);
    const shippingSelections = await this.resolveCheckoutShippingSelections(
      client,
      dto.shippingSelections,
      baseShopGroups,
      address,
      new Date(),
    );
    const now = new Date();

    const voucherBaseShopGroups = this.buildShopGroups(
      items,
      shippingSelections,
    );
    const shopVouchersById = await this.resolveShopVouchers(
      client,
      user,
      dto.shopVoucherCodes,
      voucherBaseShopGroups,
      selectedItems,
      now,
    );

    const preDiscountShopGroups = this.buildShopGroups(
      items,
      shippingSelections,
      shopVouchersById,
    );

    const orderSubtotalBeforePlatformVoucher = preDiscountShopGroups.reduce(
      (total, group) => total.add(this.toDecimal(group.subtotalAmount)),
      new Prisma.Decimal(0),
    );

    const platformVoucher = dto.platformVoucherCode
      ? await this.resolvePlatformVoucher(
          client,
          user,
          dto.platformVoucherCode,
          orderSubtotalBeforePlatformVoucher,
          preDiscountShopGroups.flatMap((group) => group.items),
          selectedItems,
          preDiscountShopGroups.reduce(
            (total, group) =>
              total.add(this.toDecimal(group.shippingFeeAmount)),
            new Prisma.Decimal(0),
          ),
          now,
        )
      : null;

    const shopGroups = this.applyPlatformVoucherAllocation(
      preDiscountShopGroups,
      platformVoucher,
    );

    const zero = new Prisma.Decimal(0);
    const subtotalAmount = shopGroups.reduce(
      (total, group) => total.add(this.toDecimal(group.subtotalAmount)),
      zero,
    );
    const discountAmount = shopGroups.reduce(
      (total, group) => total.add(this.toDecimal(group.discountAmount)),
      zero,
    );
    const shippingFeeAmount = shopGroups.reduce(
      (total, group) => total.add(this.toDecimal(group.shippingFeeAmount)),
      zero,
    );
    const totalAmount = subtotalAmount
      .sub(discountAmount)
      .add(shippingFeeAmount);

    return {
      address,
      paymentMethod,
      cart,
      selectedItems,
      items,
      shopGroups,
      shopVouchersById,
      platformVoucher,
      subtotalAmount,
      discountAmount,
      shippingFeeAmount,
      totalAmount,
    };
  }

  /**
   * Validates each requested shop-voucher against the subtotal of the
   * shop-group it targets. Rejects shopVoucherCodes referencing a shop
   * that doesn't exist in this checkout, or specifying more than one code
   * per shop.
   */
  private async resolveShopVouchers(
    client: CheckoutClient,
    user: AuthenticatedUser,
    selections: { shopId: string; voucherCode: string }[] | undefined,
    shopGroups: CheckoutPreviewShopGroup[],
    selectedItems: CheckoutCartItem[],
    now: Date,
  ): Promise<Map<string, ResolvedShopVoucher>> {
    const result = new Map<string, ResolvedShopVoucher>();
    if (!selections?.length) {
      return result;
    }

    const subtotalByShopId = new Map(
      shopGroups.map((group) => [
        group.shop.id,
        this.toDecimal(group.subtotalAmount),
      ]),
    );

    const seenShopIds = new Set<string>();
    for (const selection of selections) {
      if (seenShopIds.has(selection.shopId)) {
        throw new BadRequestException({
          code: 'VOUCHER_DUPLICATE_SHOP_SELECTION',
          message: 'Each shop can only have one voucher applied',
          details: [{ shopId: selection.shopId }],
        });
      }
      seenShopIds.add(selection.shopId);

      const shopSubtotal = subtotalByShopId.get(selection.shopId);
      if (shopSubtotal === undefined) {
        throw new BadRequestException({
          code: 'VOUCHER_SHOP_MISMATCH',
          message: 'Shop does not have items in this checkout',
          details: [{ shopId: selection.shopId }],
        });
      }

      const validation = await this.vouchersService.validateVoucher(
        client,
        user,
        selection.voucherCode,
        {
          orderShopId: BigInt(selection.shopId),
          productLines: selectedItems
            .filter((item) => item.shopId.toString() === selection.shopId)
            .map((item) => ({
              productId: item.productId,
              categoryId: item.product.categoryId,
              shopCategoryIds: item.product.shopCategoryProducts.map((relation) => relation.shopCategoryId),
              amount: item.productVariant.price.mul(item.quantity),
            })),
          shippingAmount: this.toDecimal(
            shopGroups.find((group) => group.shop.id === selection.shopId)
              ?.shippingFeeAmount ?? '0',
          ),
        },
        now,
      );

      result.set(selection.shopId, {
        voucherId: validation.voucher.id,
        voucherCode: validation.voucher.voucherCode,
        voucherName: validation.voucher.voucherName,
        discountType: validation.voucher.discountType,
        discountTarget: validation.voucher.discountTarget,
        categoryIds: validation.voucher.categoryIds,
        discountAmount: this.toDecimal(validation.discountAmount),
        eligibleAmount: this.toDecimal(validation.eligibleAmount),
      });
    }

    return result;
  }

  private async resolvePlatformVoucher(
    client: CheckoutClient,
    user: AuthenticatedUser,
    voucherCode: string,
    orderSubtotal: Prisma.Decimal,
    previewItems: CheckoutPreviewItem[],
    selectedItems: CheckoutCartItem[],
    shippingAmount: Prisma.Decimal,
    now: Date,
  ): Promise<ResolvedPlatformVoucher> {
    const validation = await this.vouchersService.validateVoucher(
      client,
      user,
      voucherCode,
      {
        orderShopId: null,
        productLines: selectedItems.map((item) => ({
          productId: item.productId,
          categoryId: item.product.categoryId,
          shopCategoryIds: item.product.shopCategoryProducts.map((relation) => relation.shopCategoryId),
          amount: item.productVariant.price.mul(item.quantity),
        })),
        shippingAmount,
      },
      now,
    );

    return {
      voucherId: validation.voucher.id,
      voucherCode: validation.voucher.voucherCode,
      voucherName: validation.voucher.voucherName,
      discountType: validation.voucher.discountType,
      discountTarget: validation.voucher.discountTarget,
      categoryIds: validation.voucher.categoryIds,
      discountAmount: this.toDecimal(validation.discountAmount),
      eligibleAmount: this.toDecimal(validation.eligibleAmount),
    };
  }

  /**
   * Distributes the platform voucher's total discount across shop-groups
   * proportionally to each group's subtotal share. The last group absorbs
   * any rounding remainder so allocated amounts always sum exactly to the
   * platform voucher's discountAmount.
   */
  private applyPlatformVoucherAllocation(
    shopGroups: CheckoutPreviewShopGroup[],
    platformVoucher: ResolvedPlatformVoucher | null,
  ): CheckoutPreviewShopGroup[] {
    if (!platformVoucher || shopGroups.length === 0) {
      return shopGroups;
    }

    const totalSubtotal = shopGroups.reduce(
      (total, group) => total.add(this.toDecimal(group.subtotalAmount)),
      new Prisma.Decimal(0),
    );

    if (totalSubtotal.isZero()) {
      return shopGroups;
    }

    let allocatedSoFar = new Prisma.Decimal(0);

    return shopGroups.map((group, index) => {
      const isLast = index === shopGroups.length - 1;
      const groupSubtotal = this.toDecimal(group.subtotalAmount);
      const share = isLast
        ? platformVoucher.discountAmount.sub(allocatedSoFar)
        : groupSubtotal
            .mul(platformVoucher.discountAmount)
            .div(totalSubtotal)
            .toDecimalPlaces(2);

      allocatedSoFar = allocatedSoFar.add(share);

      const newDiscountAmount = this.toDecimal(group.discountAmount).add(share);
      const newTotalAmount = groupSubtotal
        .sub(newDiscountAmount)
        .add(this.toDecimal(group.shippingFeeAmount));

      return {
        ...group,
        discountAmount: this.formatMoney(newDiscountAmount),
        totalAmount: this.formatMoney(newTotalAmount),
      };
    });
  }

  private toCheckoutPreviewResponse(
    context: CheckoutContext,
  ): CheckoutPreviewResponse {
    return {
      address: this.toAddressSummary(context.address),
      paymentMethod: this.toPaymentMethodSummary(context.paymentMethod),
      items: context.items,
      shopGroups: context.shopGroups,
      selectedCartItemCount: context.items.length,
      selectedItemCount: context.items.reduce(
        (total, item) => total + item.quantity,
        0,
      ),
      subtotalAmount: this.formatMoney(context.subtotalAmount),
      discountAmount: this.formatMoney(context.discountAmount),
      shippingFeeAmount: this.formatMoney(context.shippingFeeAmount),
      totalAmount: this.formatMoney(context.totalAmount),
      platformVoucher: context.platformVoucher
        ? {
            id: context.platformVoucher.voucherId.toString(),
            idString: context.platformVoucher.voucherId.toString(),
            voucherCode: context.platformVoucher.voucherCode,
            voucherName: context.platformVoucher.voucherName,
            discountType: context.platformVoucher.discountType,
            discountAmount: this.formatMoney(
              context.platformVoucher.discountAmount,
            ),
          }
        : null,
    };
  }

  private async requireOwnedAddress(
    client: CheckoutClient,
    user: AuthenticatedUser,
    addressId: bigint,
  ) {
    const address = await client.address.findUnique({
      where: { id: addressId },
    });

    if (!address || address.isDeleted) {
      throw new NotFoundException({
        code: 'ADDRESS_NOT_FOUND',
        message: 'Address not found',
        details: [{ field: 'addressId' }],
      });
    }

    if (address.userId !== user.id) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have access to this address',
        details: [],
      });
    }

    return address;
  }

  private async requireActivePaymentMethod(
    client: CheckoutClient,
    paymentMethodId: bigint,
  ) {
    const paymentMethod = await client.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    });

    if (!paymentMethod || !paymentMethod.isActive) {
      throw new NotFoundException({
        code: 'PAYMENT_METHOD_NOT_FOUND',
        message: 'Payment method not found',
        details: [{ field: 'paymentMethodId' }],
      });
    }

    return paymentMethod;
  }

  private findActiveCart(
    client: CheckoutClient,
    userId: bigint,
  ): Promise<CheckoutCart | null> {
    return client.cart.findFirst({
      where: {
        userId,
        cartStatus: ACTIVE_CART_STATUS,
      },
      orderBy: { createdAt: 'desc' },
      include: checkoutCartInclude,
    });
  }

  private getSelectedItems(
    cart: CheckoutCart | null,
    selectedCartItemIds: bigint[] | undefined,
  ): CheckoutCartItem[] {
    if (!cart) {
      return [];
    }

    if (!selectedCartItemIds) {
      return cart.items.filter((item) => item.isSelected);
    }

    const selectedIds = new Set(selectedCartItemIds);
    const selectedItems = cart.items.filter((item) => selectedIds.has(item.id));

    if (selectedItems.length !== selectedIds.size) {
      throw new NotFoundException({
        code: 'CART_ITEM_NOT_FOUND',
        message: 'Cart item not found',
        details: [{ field: 'selectedCartItemIds' }],
      });
    }

    return selectedItems;
  }

  private toPreviewItem(item: CheckoutCartItem): CheckoutPreviewItem {
    this.ensureItemPurchasable(item);

    const quantityAvailable = this.getQuantityAvailable(item.productVariant);

    if (quantityAvailable < item.quantity) {
      throw new BadRequestException({
        code: 'OUT_OF_STOCK',
        message: 'Not enough stock for checkout',
        details: [
          {
            cartItemId: item.id.toString(),
            productVariantId: item.productVariantId.toString(),
            requestedQuantity: item.quantity,
            quantityAvailable,
          },
        ],
      });
    }

    const unitPriceSnapshot = this.toDecimal(item.unitPriceSnapshot);
    const unitPrice = this.toDecimal(item.productVariant.price);
    const lineSubtotal = unitPrice.mul(item.quantity);
    const discountAmount = new Prisma.Decimal(0);
    const lineTotal = lineSubtotal.sub(discountAmount);
    const thumbnail = item.product.images[0] ?? null;

    return {
      cartItemId: item.id.toString(),
      cartItemIdString: item.id.toString(),
      quantity: item.quantity,
      unitPriceSnapshot: this.formatMoney(unitPriceSnapshot),
      unitPrice: this.formatMoney(unitPrice),
      priceChanged: !unitPrice.equals(unitPriceSnapshot),
      quantityAvailable,
      lineSubtotal: this.formatMoney(lineSubtotal),
      discountAmount: this.formatMoney(discountAmount),
      lineTotal: this.formatMoney(lineTotal),
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
        weightGram: item.productVariant.weightGram,
      },
      shop: this.toShopSummary(item),
    };
  }

  private ensureItemPurchasable(item: CheckoutCartItem): void {
    const unavailableReason =
      item.productVariant.variantStatus !== PUBLIC_VARIANT_STATUS
        ? 'VARIANT_INACTIVE'
        : item.product.productStatus !== PUBLIC_PRODUCT_STATUS
          ? 'PRODUCT_NOT_PUBLISHED'
          : item.product.isDeleted
            ? 'PRODUCT_DELETED'
            : item.product.isViolation
              ? 'PRODUCT_VIOLATION'
              : !item.product.category.isActive
                ? 'CATEGORY_INACTIVE'
                : item.shop.shopStatus !== PUBLIC_SHOP_STATUS
                  ? 'SHOP_NOT_APPROVED'
                  : item.shop.isDeleted
                    ? 'SHOP_DELETED'
                    : item.shop.ownerUser.userStatus !== 'Active' || item.shop.ownerUser.isDeleted
                      ? 'SELLER_SUSPENDED'
                      : this.isShopPaused(item.shop, new Date())
                        ? 'SHOP_PAUSED'
                        : item.shopId !== item.product.shopId
                          ? 'SHOP_MISMATCH'
                          : null;

    if (unavailableReason) {
      throw new BadRequestException({
        code: 'CHECKOUT_ITEM_UNAVAILABLE',
        message: 'Cart item is no longer available',
        details: [
          {
            cartItemId: item.id.toString(),
            productVariantId: item.productVariantId.toString(),
            reason: unavailableReason,
          },
        ],
      });
    }
  }

  private isShopPaused(shop: { operationMode: string; pauseStartsAt: Date | null; pauseEndsAt: Date | null }, now: Date): boolean {
    if (shop.operationMode === 'PausedIndefinitely') return true;
    return shop.operationMode === 'PausedUntil' && shop.pauseStartsAt !== null && shop.pauseEndsAt !== null && now >= shop.pauseStartsAt && now < shop.pauseEndsAt;
  }

  private buildShopGroups(
    items: CheckoutPreviewItem[],
    shippingSelections = new Map<string, ResolvedCheckoutShippingSelection>(),
    shopVouchersById = new Map<string, ResolvedShopVoucher>(),
  ): CheckoutPreviewShopGroup[] {
    const groupsByShopId = new Map<string, ShopGroupAccumulator>();

    for (const item of items) {
      const group =
        groupsByShopId.get(item.shop.id) ??
        this.createShopGroupAccumulator(item.shop);

      group.items.push(item);
      group.subtotalAmount = group.subtotalAmount.add(
        this.toDecimal(item.lineSubtotal),
      );
      group.discountAmount = group.discountAmount.add(
        this.toDecimal(item.discountAmount),
      );
      groupsByShopId.set(item.shop.id, group);
    }

    return [...groupsByShopId.values()].map((group) => {
      const shippingSelection = shippingSelections.get(group.shop.id) ?? null;

      if (shippingSelection) {
        group.shippingFeeAmount = this.toDecimal(
          shippingSelection.summary.quotedFee,
        );
        group.shippingSelection = shippingSelection;
      }

      const shopVoucher = shopVouchersById.get(group.shop.id) ?? null;
      if (shopVoucher) {
        group.discountAmount = group.discountAmount.add(
          shopVoucher.discountAmount,
        );
        group.shopVoucher = shopVoucher;
      }

      const totalAmount = group.subtotalAmount
        .sub(group.discountAmount)
        .add(group.shippingFeeAmount);

      return {
        shop: group.shop,
        items: group.items,
        subtotalAmount: this.formatMoney(group.subtotalAmount),
        discountAmount: this.formatMoney(group.discountAmount),
        shippingFeeAmount: this.formatMoney(group.shippingFeeAmount),
        totalAmount: this.formatMoney(totalAmount),
        shippingSelection: group.shippingSelection?.summary ?? null,
        shopVoucher: group.shopVoucher
          ? {
              id: group.shopVoucher.voucherId.toString(),
              idString: group.shopVoucher.voucherId.toString(),
              voucherCode: group.shopVoucher.voucherCode,
              voucherName: group.shopVoucher.voucherName,
              discountType: group.shopVoucher.discountType,
              discountAmount: this.formatMoney(
                group.shopVoucher.discountAmount,
              ),
            }
          : null,
      };
    });
  }

  private createShopGroupAccumulator(
    shop: CheckoutShopSummary,
  ): ShopGroupAccumulator {
    return {
      shop,
      items: [],
      subtotalAmount: new Prisma.Decimal(0),
      discountAmount: new Prisma.Decimal(0),
      shippingFeeAmount: new Prisma.Decimal(0),
      shippingSelection: null,
      shopVoucher: null,
    };
  }

  private async resolveCheckoutShippingSelections(
    client: CheckoutClient,
    selections: CheckoutShippingSelectionDto[] | undefined,
    shopGroups: CheckoutPreviewShopGroup[],
    address: CheckoutAddressEntity,
    now: Date,
  ): Promise<Map<string, ResolvedCheckoutShippingSelection>> {
    if (!selections?.length) {
      return new Map();
    }

    const requiredShopIds = new Set(shopGroups.map((group) => group.shop.id));
    const selectionsByShopId = new Map<
      string,
      ResolvedCheckoutShippingSelection
    >();

    for (const selection of selections) {
      const shopId = this.parseId(
        selection.shopId,
        'shippingSelections.shopId',
      );
      const shopIdString = shopId.toString();

      if (!requiredShopIds.has(shopIdString)) {
        throw new BadRequestException({
          code: 'CHECKOUT_SHIPPING_SELECTION_INVALID',
          message: 'Shipping selection does not match selected cart shops',
          details: [
            { field: 'shippingSelections.shopId', shopId: shopIdString },
          ],
        });
      }

      if (selectionsByShopId.has(shopIdString)) {
        throw new BadRequestException({
          code: 'CHECKOUT_SHIPPING_SELECTION_DUPLICATED',
          message: 'Each shop can only have one shipping selection',
          details: [
            { field: 'shippingSelections.shopId', shopId: shopIdString },
          ],
        });
      }

      const shippingServiceId = this.parseId(
        selection.shippingServiceId,
        'shippingSelections.shippingServiceId',
      );
      const shippingQuoteId = this.parseId(
        selection.shippingQuoteId,
        'shippingSelections.shippingQuoteId',
      );
      const quote = await client.shippingQuote.findUnique({
        where: { id: shippingQuoteId },
        include: checkoutShippingQuoteInclude,
      });

      if (!quote) {
        throw new BadRequestException({
          code: 'SHIPPING_QUOTE_NOT_FOUND',
          message: 'Shipping quote not found',
          details: [{ field: 'shippingSelections.shippingQuoteId' }],
        });
      }

      this.ensureCheckoutShippingQuoteMatchesSelection(
        quote,
        shopId,
        shippingServiceId,
        address,
        now,
      );

      selectionsByShopId.set(shopIdString, {
        shippingQuoteId: quote.id,
        shippingCompanyId: quote.shippingCompanyId,
        shippingServiceId: quote.shippingServiceId,
        summary: this.toCheckoutShippingSelectionSummary(quote),
      });
    }

    const missingShopIds = [...requiredShopIds].filter(
      (shopId) => !selectionsByShopId.has(shopId),
    );

    if (missingShopIds.length > 0) {
      throw new BadRequestException({
        code: 'CHECKOUT_SHIPPING_SELECTION_REQUIRED',
        message: 'Shipping selection is required for every selected shop',
        details: missingShopIds.map((shopId) => ({
          field: 'shippingSelections.shopId',
          shopId,
        })),
      });
    }

    return selectionsByShopId;
  }

  private ensureCheckoutShippingQuoteMatchesSelection(
    quote: CheckoutShippingQuote,
    shopId: bigint,
    shippingServiceId: bigint,
    address: CheckoutAddressEntity,
    now: Date,
  ): void {
    if (
      quote.shopId !== shopId ||
      quote.shippingServiceId !== shippingServiceId
    ) {
      throw new BadRequestException({
        code: 'SHIPPING_QUOTE_MISMATCH',
        message: 'Shipping quote does not match checkout selection',
        details: [{ field: 'shippingSelections.shippingQuoteId' }],
      });
    }

    if (
      quote.shippingCompany.companyStatus !==
        SHIPPING_COMPANY_STATUS_APPROVED ||
      quote.shippingCompany.isDeleted ||
      !quote.shippingService.isActive
    ) {
      throw new BadRequestException({
        code: 'SHIPPING_SERVICE_UNAVAILABLE',
        message: 'Shipping service is no longer available',
        details: [{ field: 'shippingSelections.shippingServiceId' }],
      });
    }

    if (quote.destinationProvince !== address.province) {
      throw new BadRequestException({
        code: 'SHIPPING_QUOTE_ADDRESS_MISMATCH',
        message: 'Shipping quote does not match the selected address',
        details: [{ field: 'addressId' }],
      });
    }

    if (quote.expiresAt <= now) {
      throw new BadRequestException({
        code: 'SHIPPING_QUOTE_EXPIRED',
        message: 'Shipping quote has expired',
        details: [{ field: 'shippingSelections.shippingQuoteId' }],
      });
    }
  }

  private toCheckoutShippingSelectionSummary(
    quote: CheckoutShippingQuote,
  ): CheckoutShippingSelectionSummary {
    return {
      shippingQuoteId: quote.id.toString(),
      shippingQuoteIdString: quote.id.toString(),
      shippingCompany: {
        id: quote.shippingCompany.id.toString(),
        idString: quote.shippingCompany.id.toString(),
        companyName: quote.shippingCompany.companyName,
        slug: quote.shippingCompany.slug,
      },
      shippingService: {
        id: quote.shippingService.id.toString(),
        idString: quote.shippingService.id.toString(),
        serviceCode: quote.shippingService.serviceCode,
        serviceName: quote.shippingService.serviceName,
      },
      quotedFee: this.formatMoney(this.toDecimal(quote.quotedFee)),
      estimatedMinDays: quote.estimatedMinDays,
      estimatedMaxDays: quote.estimatedMaxDays,
      expiresAt: quote.expiresAt,
    };
  }

  private toAddressSummary(address: {
    id: bigint;
    receiverName: string;
    phoneNumber: string;
    province: string;
    ward: string;
    streetAddress: string;
    fullAddress: string | null;
  }): CheckoutAddressSummary {
    return {
      id: address.id.toString(),
      idString: address.id.toString(),
      receiverName: address.receiverName,
      phoneNumber: address.phoneNumber,
      province: address.province,
      ward: address.ward,
      streetAddress: address.streetAddress,
      fullAddress: address.fullAddress,
    };
  }

  private toPaymentMethodSummary(paymentMethod: {
    id: bigint;
    methodCode: string;
    methodName: string;
    isOnline: boolean;
  }): CheckoutPaymentMethodSummary {
    return {
      id: paymentMethod.id.toString(),
      idString: paymentMethod.id.toString(),
      methodCode: paymentMethod.methodCode,
      methodName: paymentMethod.methodName,
      isOnline: paymentMethod.isOnline,
    };
  }

  private toShopSummary(item: CheckoutCartItem): CheckoutShopSummary {
    return {
      id: item.shop.id.toString(),
      idString: item.shop.id.toString(),
      shopName: item.shop.shopName,
      slug: item.shop.slug,
    };
  }

  private async reserveInventoryForOrderItem(
    client: Prisma.TransactionClient,
    user: AuthenticatedUser,
    item: CheckoutCartItem,
    orderItem: { id: bigint },
  ): Promise<void> {
    const inventory = item.productVariant.inventoryRecords[0];

    if (!inventory) {
      this.throwOutOfStock(item, 0);
    }

    const updateResult = await client.productInventory.updateMany({
      where: {
        id: inventory.id,
        quantityAvailable: { gte: item.quantity },
      },
      data: {
        quantityReserved: { increment: item.quantity },
        quantityAvailable: { decrement: item.quantity },
        updatedAt: new Date(),
      },
    });

    if (updateResult.count !== 1) {
      const freshInventory = await client.productInventory.findUnique({
        where: { id: inventory.id },
      });

      this.throwOutOfStock(item, freshInventory?.quantityAvailable ?? 0);
    }

    const updatedInventory = await client.productInventory.findUnique({
      where: { id: inventory.id },
    });

    if (!updatedInventory) {
      throw new Error('Inventory record was not found after reserve.');
    }

    await client.inventoryTransaction.create({
      data: {
        productInventoryId: inventory.id,
        transactionType: INVENTORY_TRANSACTION_RESERVE_ORDER,
        quantityChange: -item.quantity,
        quantityAfter: updatedInventory.quantityAvailable,
        referenceType: INVENTORY_REFERENCE_TYPE_ORDER_ITEM,
        referenceId: orderItem.id,
        note: `Reserved ${item.quantity} unit(s) for checkout`,
        createdByUserId: user.id,
        createdAt: new Date(),
      },
    });
  }

  private throwOutOfStock(
    item: CheckoutCartItem,
    quantityAvailable: number,
  ): never {
    throw new BadRequestException({
      code: 'OUT_OF_STOCK',
      message: 'Not enough stock for checkout',
      details: [
        {
          cartItemId: item.id.toString(),
          productVariantId: item.productVariantId.toString(),
          requestedQuantity: item.quantity,
          quantityAvailable,
        },
      ],
    });
  }

  private async updateParentOrderStatusAfterShopOrderConfirm(
    client: Prisma.TransactionClient,
    user: AuthenticatedUser,
    orderId: bigint,
    now: Date,
  ): Promise<void> {
    const waitingShopOrderCount = await client.shopOrder.count({
      where: {
        orderId,
        orderStatus: SHOP_ORDER_STATUS_WAITING_FOR_SELLER,
      },
    });

    if (waitingShopOrderCount > 0) {
      return;
    }

    const order = await client.order.findUnique({
      where: { id: orderId },
      select: { orderStatus: true },
    });

    if (
      !order ||
      ![ORDER_STATUS_CREATED, SHOP_ORDER_STATUS_WAITING_FOR_SELLER].includes(
        order.orderStatus,
      )
    ) {
      return;
    }

    await client.order.update({
      where: { id: orderId },
      data: {
        orderStatus: ORDER_STATUS_CONFIRMED,
        updatedAt: now,
      },
    });

    await client.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.orderStatus,
        toStatus: ORDER_STATUS_CONFIRMED,
        changedByUserId: user.id,
        reason: 'All shop orders confirmed',
        createdAt: now,
      },
    });
  }

  private async updateParentOrderStatusAfterShopOrderPrepare(
    client: Prisma.TransactionClient,
    user: AuthenticatedUser,
    orderId: bigint,
    now: Date,
  ): Promise<void> {
    const unpreparedShopOrderCount = await client.shopOrder.count({
      where: {
        orderId,
        orderStatus: {
          in: [
            SHOP_ORDER_STATUS_WAITING_FOR_SELLER,
            SHOP_ORDER_STATUS_CONFIRMED,
          ],
        },
      },
    });

    if (unpreparedShopOrderCount > 0) {
      return;
    }

    const order = await client.order.findUnique({
      where: { id: orderId },
      select: { orderStatus: true },
    });

    if (
      !order ||
      ![
        ORDER_STATUS_CREATED,
        SHOP_ORDER_STATUS_WAITING_FOR_SELLER,
        ORDER_STATUS_CONFIRMED,
      ].includes(order.orderStatus)
    ) {
      return;
    }

    await client.order.update({
      where: { id: orderId },
      data: {
        orderStatus: ORDER_STATUS_PREPARED,
        updatedAt: now,
      },
    });

    await client.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.orderStatus,
        toStatus: ORDER_STATUS_PREPARED,
        changedByUserId: user.id,
        reason: 'All shop orders prepared',
        createdAt: now,
      },
    });
  }

  private toOrderResponse(
    order: {
      id: bigint;
      orderCode: string;
      orderStatus: string;
      paymentStatus: string;
      subtotalAmount: { toString(): string };
      discountAmount: { toString(): string };
      shippingFeeAmount: { toString(): string };
      totalAmount: { toString(): string };
      customerNote: string | null;
      createdAt: Date;
      updatedAt: Date | null;
    },
    context: CheckoutContext,
    shopOrders: ShopOrderResponse[],
    payments: PaymentResponse[],
  ): OrderResponse {
    return {
      id: order.id.toString(),
      idString: order.id.toString(),
      orderCode: order.orderCode,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      address: this.toAddressSummary(context.address),
      paymentMethod: this.toPaymentMethodSummary(context.paymentMethod),
      subtotalAmount: this.formatMoney(this.toDecimal(order.subtotalAmount)),
      discountAmount: this.formatMoney(this.toDecimal(order.discountAmount)),
      shippingFeeAmount: this.formatMoney(
        this.toDecimal(order.shippingFeeAmount),
      ),
      totalAmount: this.formatMoney(this.toDecimal(order.totalAmount)),
      customerNote: order.customerNote,
      shopOrders,
      payments,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private toShopOrderResponse(
    shopOrder: {
      id: bigint;
      shopOrderCode: string;
      orderStatus: string;
      subtotalAmount: { toString(): string };
      discountAmount: { toString(): string };
      shippingFeeAmount: { toString(): string };
      totalAmount: { toString(): string };
      createdAt: Date;
      updatedAt: Date | null;
    },
    shop: CheckoutShopSummary,
    items: OrderItemResponse[],
    shipments?: OrderShipmentResponse[],
  ): ShopOrderResponse {
    return {
      id: shopOrder.id.toString(),
      idString: shopOrder.id.toString(),
      shopOrderCode: shopOrder.shopOrderCode,
      shop,
      orderStatus: shopOrder.orderStatus,
      subtotalAmount: this.formatMoney(
        this.toDecimal(shopOrder.subtotalAmount),
      ),
      discountAmount: this.formatMoney(
        this.toDecimal(shopOrder.discountAmount),
      ),
      shippingFeeAmount: this.formatMoney(
        this.toDecimal(shopOrder.shippingFeeAmount),
      ),
      totalAmount: this.formatMoney(this.toDecimal(shopOrder.totalAmount)),
      items,
      ...(shipments !== undefined ? { shipments } : {}),
      createdAt: shopOrder.createdAt,
      updatedAt: shopOrder.updatedAt,
    };
  }

  private toOrderListItemResponse(
    order: OrderHistoryEntity,
  ): OrderListItemResponse {
    return {
      id: order.id.toString(),
      idString: order.id.toString(),
      orderCode: order.orderCode,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      receiverName: order.receiverName,
      receiverPhone: order.receiverPhone,
      shippingAddress: {
        province: order.shippingProvince,
        ward: order.shippingWard,
        streetAddress: order.shippingStreetAddress,
      },
      subtotalAmount: this.formatMoney(this.toDecimal(order.subtotalAmount)),
      discountAmount: this.formatMoney(this.toDecimal(order.discountAmount)),
      shippingFeeAmount: this.formatMoney(
        this.toDecimal(order.shippingFeeAmount),
      ),
      totalAmount: this.formatMoney(this.toDecimal(order.totalAmount)),
      customerNote: order.customerNote,
      paymentMethod: this.toPaymentMethodSummary(order.paymentMethod),
      shopOrders: order.shopOrders.map((shopOrder) =>
        this.toOrderListShopOrderResponse(shopOrder),
      ),
      payments: order.payments.map((payment) =>
        this.toPaymentResponse(payment, order.paymentMethod),
      ),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private toOrderListShopOrderResponse(
    shopOrder: OrderHistoryShopOrder,
  ): ShopOrderResponse {
    return this.toShopOrderResponse(
      shopOrder,
      {
        id: shopOrder.shop.id.toString(),
        idString: shopOrder.shop.id.toString(),
        shopName: shopOrder.shop.shopName,
        slug: shopOrder.shop.slug,
      },
      shopOrder.items.map((item) => this.toOrderItemResponse(item)),
      shopOrder.shipments.map((shipment) =>
        this.toOrderShipmentResponse(shipment),
      ),
    );
  }

  private toOrderShipmentResponse(
    shipment: OrderHistoryShopOrder['shipments'][number],
  ): OrderShipmentResponse {
    return {
      id: shipment.id.toString(),
      idString: shipment.id.toString(),
      shipmentCode: shipment.shipmentCode,
      trackingNumber: shipment.trackingNumber,
      shipmentStatus: shipment.shipmentStatus,
      shippingFee: this.formatMoney(this.toDecimal(shipment.shippingFee)),
      shippingCompany: {
        id: shipment.shippingCompany.id.toString(),
        idString: shipment.shippingCompany.id.toString(),
        companyName: shipment.shippingCompany.companyName,
        slug: shipment.shippingCompany.slug,
      },
      shippingService: {
        id: shipment.shippingService.id.toString(),
        idString: shipment.shippingService.id.toString(),
        serviceCode: shipment.shippingService.serviceCode,
        serviceName: shipment.shippingService.serviceName,
      },
      expectedDeliveryAt: shipment.expectedDeliveryAt,
      pickedUpAt: shipment.pickedUpAt,
      deliveredAt: shipment.deliveredAt,
      trackingHistories: shipment.trackingHistories.map((history) =>
        this.toOrderShipmentTrackingHistoryResponse(history),
      ),
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
    };
  }

  private toOrderShipmentTrackingHistoryResponse(
    history: OrderHistoryShopOrder['shipments'][number]['trackingHistories'][number],
  ): OrderShipmentTrackingHistoryResponse {
    return {
      id: history.id.toString(),
      idString: history.id.toString(),
      fromStatus: history.fromStatus,
      toStatus: history.toStatus,
      locationText: history.locationText,
      note: history.note,
      createdAt: history.createdAt,
    };
  }

  private toSellerShopOrderResponse(
    shopOrder: SellerShopOrderEntity,
  ): SellerShopOrderResponse {
    return {
      id: shopOrder.id.toString(),
      idString: shopOrder.id.toString(),
      shopOrderCode: shopOrder.shopOrderCode,
      orderId: shopOrder.order.id.toString(),
      orderIdString: shopOrder.order.id.toString(),
      orderCode: shopOrder.order.orderCode,
      orderStatus: shopOrder.orderStatus,
      orderPaymentStatus: shopOrder.order.paymentStatus,
      shop: {
        id: shopOrder.shop.id.toString(),
        idString: shopOrder.shop.id.toString(),
        shopName: shopOrder.shop.shopName,
        slug: shopOrder.shop.slug,
      },
      receiverName: shopOrder.order.receiverName,
      receiverPhone: shopOrder.order.receiverPhone,
      shippingAddress: {
        province: shopOrder.order.shippingProvince,
        ward: shopOrder.order.shippingWard,
        streetAddress: shopOrder.order.shippingStreetAddress,
      },
      customerNote: shopOrder.order.customerNote,
      subtotalAmount: this.formatMoney(
        this.toDecimal(shopOrder.subtotalAmount),
      ),
      discountAmount: this.formatMoney(
        this.toDecimal(shopOrder.discountAmount),
      ),
      shippingFeeAmount: this.formatMoney(
        this.toDecimal(shopOrder.shippingFeeAmount),
      ),
      totalAmount: this.formatMoney(this.toDecimal(shopOrder.totalAmount)),
      sellerNote: shopOrder.sellerNote,
      confirmedAt: shopOrder.confirmedAt,
      preparedAt: shopOrder.preparedAt,
      completedAt: shopOrder.completedAt,
      items: shopOrder.items.map((item) => this.toOrderItemResponse(item)),
      shipments: (shopOrder.shipments ?? []).map((shipment) =>
        this.toOrderShipmentResponse(shipment),
      ),
      createdAt: shopOrder.createdAt,
      updatedAt: shopOrder.updatedAt,
    };
  }

  private toOrderItemResponse(orderItem: {
    id: bigint;
    shopId: bigint;
    productId: bigint;
    productVariantId: bigint;
    productNameSnapshot: string;
    variantNameSnapshot: string | null;
    skuSnapshot: string | null;
    unitPrice: { toString(): string };
    quantity: number;
    discountAmount: { toString(): string };
    lineTotal: { toString(): string };
    itemStatus: string;
    createdAt: Date;
  }): OrderItemResponse {
    return {
      id: orderItem.id.toString(),
      idString: orderItem.id.toString(),
      shopId: orderItem.shopId.toString(),
      shopIdString: orderItem.shopId.toString(),
      productId: orderItem.productId.toString(),
      productIdString: orderItem.productId.toString(),
      productVariantId: orderItem.productVariantId.toString(),
      productVariantIdString: orderItem.productVariantId.toString(),
      productNameSnapshot: orderItem.productNameSnapshot,
      variantNameSnapshot: orderItem.variantNameSnapshot,
      skuSnapshot: orderItem.skuSnapshot,
      unitPrice: this.formatMoney(this.toDecimal(orderItem.unitPrice)),
      quantity: orderItem.quantity,
      discountAmount: this.formatMoney(
        this.toDecimal(orderItem.discountAmount),
      ),
      lineTotal: this.formatMoney(this.toDecimal(orderItem.lineTotal)),
      itemStatus: orderItem.itemStatus,
      createdAt: orderItem.createdAt,
    };
  }

  private toPaymentResponse(
    payment: {
      id: bigint;
      paymentCode: string;
      providerName: string | null;
      amount: { toString(): string };
      paymentStatus: string;
      paidAt: Date | null;
      expiredAt: Date | null;
      createdAt: Date;
      updatedAt: Date | null;
    },
    paymentMethod: CheckoutPaymentMethodEntity,
  ): PaymentResponse {
    return {
      id: payment.id.toString(),
      idString: payment.id.toString(),
      paymentCode: payment.paymentCode,
      paymentMethod: this.toPaymentMethodSummary(paymentMethod),
      providerName: payment.providerName,
      amount: this.formatMoney(this.toDecimal(payment.amount)),
      paymentStatus: payment.paymentStatus,
      paidAt: payment.paidAt,
      expiredAt: payment.expiredAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  private getProviderName(paymentMethod: CheckoutPaymentMethodEntity): string {
    if (paymentMethod.methodCode === 'COD') {
      return 'COD';
    }

    if (paymentMethod.methodCode === 'FAKE_ONLINE') {
      return 'FAKE_ONLINE';
    }

    return paymentMethod.methodCode;
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

  private normalizeNullableText(value: string | undefined): string | null {
    if (value === undefined) {
      return null;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  }

  private getQuantityAvailable(item: {
    inventoryRecords: Array<{ quantityAvailable: number }>;
  }): number {
    return item.inventoryRecords.reduce(
      (total, inventory) => total + inventory.quantityAvailable,
      0,
    );
  }

  private parseOrderId(value: string): bigint {
    try {
      return this.parseId(value, 'orderId');
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new BadRequestException({
          code: 'INVALID_ORDER_ID',
          message: 'Order id is invalid',
          details: [{ field: 'orderId' }],
        });
      }

      throw error;
    }
  }

  private parseShopOrderId(value: string): bigint {
    try {
      return this.parseId(value, 'shopOrderId');
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new BadRequestException({
          code: 'INVALID_SHOP_ORDER_ID',
          message: 'Shop order id is invalid',
          details: [{ field: 'shopOrderId' }],
        });
      }

      throw error;
    }
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

  private toDecimal(value: { toString(): string }): Prisma.Decimal {
    return new Prisma.Decimal(value.toString());
  }

  private formatMoney(value: Prisma.Decimal): string {
    return value.toString();
  }
}
