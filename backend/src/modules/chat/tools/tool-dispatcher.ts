import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { serializeForJson } from '../../../common/utils/serialization.util';
import { AddressesService } from '../../addresses/addresses.service';
import { AuthenticatedUser } from '../../auth/types';
import { CartService } from '../../cart/cart.service';
import { OrdersService } from '../../orders/orders.service';
import { ProductsService } from '../../products/products.service';
import { ReviewsService } from '../../reviews/reviews.service';
import { ShippingService } from '../../shipping/shipping.service';
import { VouchersService } from '../../vouchers/vouchers.service';
import { CHAT_TOOLS, ChatToolName, isChatToolName } from './tool-registry';

type JsonObject = Record<string, unknown>;
type Paginated = { items: unknown[]; meta: unknown };

function record(value: unknown): JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

@Injectable()
export class ToolDispatcher {
  constructor(
    private readonly productsService: ProductsService,
    private readonly cartService: CartService,
    private readonly ordersService: OrdersService,
    private readonly addressesService: AddressesService,
    private readonly reviewsService: ReviewsService,
    private readonly vouchersService: VouchersService,
    private readonly shippingService: ShippingService,
  ) {}

  async dispatch(
    actor: AuthenticatedUser | undefined,
    toolName: string,
    rawArguments: string,
  ): Promise<unknown> {
    const { name, args } = this.authorizeAndValidate(
      actor,
      toolName,
      rawArguments,
    );
    if (CHAT_TOOLS[name].confirmation) {
      throw new BadRequestException({
        code: 'CHAT_CONFIRMATION_REQUIRED',
        message: 'Hành động này cần được bạn xác nhận trước khi thực hiện',
        details: [],
      });
    }
    return this.execute(actor, name, args);
  }

  async dispatchConfirmed(
    actor: AuthenticatedUser | undefined,
    toolName: string,
    rawArguments: string,
  ): Promise<unknown> {
    const { name, args } = this.authorizeAndValidate(
      actor,
      toolName,
      rawArguments,
    );
    if (!CHAT_TOOLS[name].confirmation) {
      throw new BadRequestException({
        code: 'CHAT_CONFIRMATION_NOT_APPLICABLE',
        message: 'Công cụ này không yêu cầu xác nhận',
        details: [],
      });
    }
    return this.execute(actor, name, args);
  }

  parseAndAuthorize(
    actor: AuthenticatedUser | undefined,
    toolName: string,
    rawArguments: string,
  ): { name: ChatToolName; args: JsonObject } {
    return this.authorizeAndValidate(actor, toolName, rawArguments);
  }

  private authorizeAndValidate(
    actor: AuthenticatedUser | undefined,
    toolName: string,
    rawArguments: string,
  ): { name: ChatToolName; args: JsonObject } {
    if (!isChatToolName(toolName)) {
      throw new ForbiddenException({
        code: 'CHAT_TOOL_NOT_ALLOWED',
        message: 'Công cụ không được phép',
        details: [],
      });
    }
    const tool = CHAT_TOOLS[toolName];
    if (tool.auth === 'authenticated' && !actor) {
      throw new UnauthorizedException({
        code: 'CHAT_LOGIN_REQUIRED',
        message: 'Vui lòng đăng nhập để dùng chức năng này',
        details: [],
      });
    }
    if (
      tool.roles.length > 0 &&
      (!actor || !actor.roles.some((role) => tool.roles.includes(role)))
    ) {
      throw new ForbiddenException({
        code: 'CHAT_TOOL_FORBIDDEN',
        message: 'Bạn không có quyền dùng chức năng này',
        details: [],
      });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawArguments);
    } catch {
      throw new BadRequestException({
        code: 'CHAT_TOOL_INVALID_INPUT',
        message: 'Tham số công cụ không phải JSON hợp lệ',
        details: [],
      });
    }
    return { name: toolName, args: tool.validate(parsed) };
  }

  private async execute(
    actor: AuthenticatedUser | undefined,
    name: ChatToolName,
    args: JsonObject,
  ): Promise<unknown> {
    let result: unknown;
    switch (name) {
      case 'search_products':
        result = await this.productsService.listPublicProducts(args);
        break;
      case 'get_product':
        result = await this.productsService.getPublicProductDetail(
          args.slug as string,
        );
        break;
      case 'get_product_reviews':
        result = await this.reviewsService.listPublicProductReviews(
          args.slug as string,
          { page: args.page as number, limit: args.limit as number },
        );
        break;
      case 'get_cart':
        result = await this.cartService.getMyCart(this.requireActor(actor));
        break;
      case 'add_cart_item':
        result = await this.cartService.addItem(this.requireActor(actor), {
          productVariantId: args.productVariantId as string,
          quantity: args.quantity as number,
        });
        break;
      case 'update_cart_item':
        result = await this.cartService.updateItem(
          this.requireActor(actor),
          args.cartItemId as string,
          { quantity: args.quantity as number },
        );
        break;
      case 'remove_cart_item':
        result = await this.cartService.deleteItem(
          this.requireActor(actor),
          args.cartItemId as string,
        );
        break;
      case 'list_my_orders':
        result = await this.ordersService.listMyOrders(
          this.requireActor(actor),
          {
            page: args.page as number,
            limit: args.limit as number,
          },
        );
        break;
      case 'get_my_order':
        result = await this.ordersService.getMyOrderDetail(
          this.requireActor(actor),
          args.orderId as string,
        );
        break;
      case 'cancel_my_order':
        result = await this.ordersService.cancelMyOrder(
          this.requireActor(actor),
          args.orderId as string,
          { reason: args.reason as string },
        );
        break;
      case 'list_my_addresses':
        result = await this.addressesService.listMyAddresses(
          this.requireActor(actor),
          { page: args.page as number, limit: args.limit as number },
        );
        break;
      case 'list_available_vouchers':
        result = await this.vouchersService.listAvailableVouchers(
          this.requireActor(actor),
          {
            shopId: args.shopId as string | undefined,
            subtotal: args.subtotal as string | undefined,
          },
        );
        break;
      case 'list_shipping_services':
        result = await this.shippingService.listActiveShippingServices({
          shopId: args.shopId as string | undefined,
          page: args.page as number,
          limit: args.limit as number,
        });
        break;
    }
    return serializeForJson(this.projectOutput(name, result));
  }

  private requireActor(
    actor: AuthenticatedUser | undefined,
  ): AuthenticatedUser {
    if (!actor) {
      throw new UnauthorizedException({
        code: 'CHAT_LOGIN_REQUIRED',
        message: 'Vui lòng đăng nhập để dùng chức năng này',
        details: [],
      });
    }
    return actor;
  }

  private projectOutput(name: ChatToolName, result: unknown): unknown {
    if (name === 'list_my_addresses') {
      const page = result as Paginated;
      return {
        items: page.items.map((item) => {
          const address = item as {
            id: string;
            province: string;
            ward: string;
            isDefault: boolean;
          };
          return {
            id: address.id,
            province: address.province,
            ward: address.ward,
            isDefault: address.isDefault,
          };
        }),
        meta: page.meta,
      };
    }
    if (name === 'list_my_orders') {
      const page = result as Paginated;
      return {
        items: page.items.map((item) => this.projectOrder(item)),
        meta: page.meta,
      };
    }
    if (name === 'get_my_order') return this.projectOrder(result);
    return result;
  }

  private projectOrder(value: unknown): unknown {
    const order = record(value);
    return {
      id: order.id,
      orderCode: order.orderCode,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      subtotalAmount: order.subtotalAmount,
      discountAmount: order.discountAmount,
      shippingFeeAmount: order.shippingFeeAmount,
      totalAmount: order.totalAmount,
      shopOrders: array(order.shopOrders).map((shopOrder) =>
        this.projectShopOrder(shopOrder),
      ),
      payments: array(order.payments).map((payment) =>
        this.projectPayment(payment),
      ),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private projectShopOrder(value: unknown): unknown {
    const shopOrder = record(value);
    const shop = record(shopOrder.shop);
    return {
      id: shopOrder.id,
      shopOrderCode: shopOrder.shopOrderCode,
      shop: { id: shop.id, shopName: shop.shopName, slug: shop.slug },
      orderStatus: shopOrder.orderStatus,
      subtotalAmount: shopOrder.subtotalAmount,
      discountAmount: shopOrder.discountAmount,
      shippingFeeAmount: shopOrder.shippingFeeAmount,
      totalAmount: shopOrder.totalAmount,
      items: array(shopOrder.items).map((item) => this.projectOrderItem(item)),
      shipments: array(shopOrder.shipments).map((shipment) =>
        this.projectShipment(shipment),
      ),
    };
  }

  private projectOrderItem(value: unknown): unknown {
    const item = record(value);
    return {
      id: item.id,
      productId: item.productId,
      productVariantId: item.productVariantId,
      productName: item.productNameSnapshot,
      variantName: item.variantNameSnapshot,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      itemStatus: item.itemStatus,
    };
  }

  private projectShipment(value: unknown): unknown {
    const shipment = record(value);
    const company = record(shipment.shippingCompany);
    const service = record(shipment.shippingService);
    return {
      shipmentCode: shipment.shipmentCode,
      trackingNumber: shipment.trackingNumber,
      shipmentStatus: shipment.shipmentStatus,
      shippingCompany: { companyName: company.companyName },
      shippingService: { serviceName: service.serviceName },
      expectedDeliveryAt: shipment.expectedDeliveryAt,
      pickedUpAt: shipment.pickedUpAt,
      deliveredAt: shipment.deliveredAt,
    };
  }

  private projectPayment(value: unknown): unknown {
    const payment = record(value);
    return {
      paymentCode: payment.paymentCode,
      amount: payment.amount,
      paymentStatus: payment.paymentStatus,
      paidAt: payment.paidAt,
      expiredAt: payment.expiredAt,
    };
  }
}
