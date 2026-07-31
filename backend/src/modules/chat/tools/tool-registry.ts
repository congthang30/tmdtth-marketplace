import { BadRequestException } from '@nestjs/common';
import { AppRole } from '../../auth/app-role.enum';

export const CHAT_TOOL_NAMES = [
  'search_products',
  'get_product',
  'get_product_reviews',
  'get_cart',
  'add_cart_item',
  'update_cart_item',
  'remove_cart_item',
  'list_my_orders',
  'get_my_order',
  'cancel_my_order',
  'list_my_addresses',
  'list_available_vouchers',
  'list_shipping_services',
] as const;

export type ChatToolName = (typeof CHAT_TOOL_NAMES)[number];
export type ChatToolEffect = 'read' | 'mutation' | 'destructive';

type JsonObject = Record<string, unknown>;
type JsonSchema = {
  type: 'object';
  properties: Record<string, unknown>;
  required: string[];
  additionalProperties: false;
};

export type ToolDefinition = {
  name: ChatToolName;
  description: string;
  parameters: JsonSchema;
  auth: 'public' | 'authenticated';
  roles: readonly AppRole[];
  effect: ChatToolEffect;
  confirmation: boolean;
  validate: (value: unknown) => JsonObject;
  confirmationSummary?: (args: JsonObject) => string;
  buildHref?: (result: unknown, args: JsonObject) => string | null;
};

const nullableString = (maxLength = 200) => ({
  anyOf: [{ type: 'string', minLength: 1, maxLength }, { type: 'null' }],
});
const nullableNumber = (minimum = 0) => ({
  anyOf: [{ type: 'number', minimum }, { type: 'null' }],
});
const idSchema = { type: 'string', pattern: '^\\d+$' };
const objectSchema = (
  properties: Record<string, unknown>,
  required = Object.keys(properties),
): JsonSchema => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});

function invalidInput(message = 'Tham số công cụ không hợp lệ'): never {
  throw new BadRequestException({
    code: 'CHAT_TOOL_INVALID_INPUT',
    message,
    details: [],
  });
}

function object(value: unknown, keys: readonly string[]): JsonObject {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !keys.includes(key))
  ) {
    return invalidInput();
  }
  return value as JsonObject;
}

function string(
  value: unknown,
  name: string,
  { max = 200, id = false }: { max?: number; id?: boolean } = {},
): string {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
    value.length > max ||
    (id && !/^\d+$/.test(value))
  ) {
    return invalidInput(`${name} không hợp lệ`);
  }
  return value.trim();
}

function nullableStringValue(
  value: unknown,
  name: string,
  options?: { max?: number; id?: boolean },
): string | null {
  return value === null ? null : string(value, name, options);
}

function number(
  value: unknown,
  name: string,
  { min = 0, max }: { min?: number; max?: number } = {},
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    (max !== undefined && value > max)
  ) {
    return invalidInput(`${name} không hợp lệ`);
  }
  return value;
}

function integer(
  value: unknown,
  name: string,
  options: { min: number; max: number },
): number {
  const parsed = number(value, name, options);
  if (!Number.isInteger(parsed)) return invalidInput(`${name} không hợp lệ`);
  return parsed;
}

function nullableNumberValue(value: unknown, name: string): number | null {
  return value === null ? null : number(value, name);
}

function pagination(value: unknown): { page: number; limit: number } {
  const args = object(value, ['page', 'limit']);
  return {
    page: integer(args.page, 'page', { min: 1, max: 10000 }),
    limit: integer(args.limit, 'limit', { min: 1, max: 10 }),
  };
}

const customerRoles = [AppRole.Customer] as const;
const noRoles: readonly AppRole[] = [];

export const CHAT_TOOLS: Readonly<Record<ChatToolName, ToolDefinition>> = {
  search_products: {
    name: 'search_products',
    description:
      'Tìm sản phẩm đang bán theo từ khóa, danh mục, khoảng giá và thứ tự.',
    parameters: objectSchema({
      q: nullableString(100),
      categoryId: { anyOf: [idSchema, { type: 'null' }] },
      minPrice: nullableNumber(),
      maxPrice: nullableNumber(),
      sortBy: {
        anyOf: [
          {
            type: 'string',
            enum: [
              'createdAt',
              'basePrice',
              'soldCount',
              'viewCount',
              'productName',
            ],
          },
          { type: 'null' },
        ],
      },
      sortOrder: {
        anyOf: [{ type: 'string', enum: ['asc', 'desc'] }, { type: 'null' }],
      },
      page: { type: 'integer', minimum: 1, maximum: 10000 },
      limit: { type: 'integer', minimum: 1, maximum: 10 },
    }),
    auth: 'public',
    roles: noRoles,
    effect: 'read',
    confirmation: false,
    validate: (value) => {
      const args = object(value, [
        'q',
        'categoryId',
        'minPrice',
        'maxPrice',
        'sortBy',
        'sortOrder',
        'page',
        'limit',
      ]);
      const sortBy = nullableStringValue(args.sortBy, 'sortBy');
      const sortOrder = nullableStringValue(args.sortOrder, 'sortOrder');
      const allowedSort = [
        'createdAt',
        'basePrice',
        'soldCount',
        'viewCount',
        'productName',
      ];
      if (sortBy !== null && !allowedSort.includes(sortBy)) invalidInput();
      if (sortOrder !== null && !['asc', 'desc'].includes(sortOrder)) {
        invalidInput();
      }
      const minPrice = nullableNumberValue(args.minPrice, 'minPrice');
      const maxPrice = nullableNumberValue(args.maxPrice, 'maxPrice');
      if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
        invalidInput('Khoảng giá không hợp lệ');
      }
      return {
        q: nullableStringValue(args.q, 'q', { max: 100 }) ?? undefined,
        categoryId:
          nullableStringValue(args.categoryId, 'categoryId', { id: true }) ??
          undefined,
        minPrice: minPrice ?? undefined,
        maxPrice: maxPrice ?? undefined,
        sortBy: sortBy ?? undefined,
        sortOrder: sortOrder ?? undefined,
        page: integer(args.page, 'page', { min: 1, max: 10000 }),
        limit: integer(args.limit, 'limit', { min: 1, max: 10 }),
      };
    },
    buildHref: () => '/products',
  },
  get_product: {
    name: 'get_product',
    description: 'Lấy chi tiết một sản phẩm công khai bằng slug chính xác.',
    parameters: objectSchema({
      slug: { type: 'string', minLength: 1, maxLength: 255 },
    }),
    auth: 'public',
    roles: noRoles,
    effect: 'read',
    confirmation: false,
    validate: (value) => {
      const args = object(value, ['slug']);
      return { slug: string(args.slug, 'slug', { max: 255 }) };
    },
    buildHref: (_result, args) =>
      `/products/${encodeURIComponent(String(args.slug))}`,
  },
  get_product_reviews: {
    name: 'get_product_reviews',
    description: 'Đọc đánh giá công khai của một sản phẩm.',
    parameters: objectSchema({
      slug: { type: 'string', minLength: 1, maxLength: 255 },
      page: { type: 'integer', minimum: 1, maximum: 10000 },
      limit: { type: 'integer', minimum: 1, maximum: 10 },
    }),
    auth: 'public',
    roles: noRoles,
    effect: 'read',
    confirmation: false,
    validate: (value) => {
      const args = object(value, ['slug', 'page', 'limit']);
      return {
        slug: string(args.slug, 'slug', { max: 255 }),
        ...pagination({ page: args.page, limit: args.limit }),
      };
    },
  },
  get_cart: {
    name: 'get_cart',
    description: 'Đọc giỏ hàng hiện tại của khách hàng đã đăng nhập.',
    parameters: objectSchema({}),
    auth: 'authenticated',
    roles: customerRoles,
    effect: 'read',
    confirmation: false,
    validate: (value) => object(value, []),
    buildHref: () => '/cart',
  },
  add_cart_item: {
    name: 'add_cart_item',
    description: 'Thêm một phân loại sản phẩm vào giỏ; luôn cần xác nhận.',
    parameters: objectSchema({
      productVariantId: idSchema,
      quantity: { type: 'integer', minimum: 1, maximum: 999 },
    }),
    auth: 'authenticated',
    roles: customerRoles,
    effect: 'mutation',
    confirmation: true,
    validate: (value) => {
      const args = object(value, ['productVariantId', 'quantity']);
      return {
        productVariantId: string(args.productVariantId, 'productVariantId', {
          id: true,
        }),
        quantity: integer(args.quantity, 'quantity', { min: 1, max: 999 }),
      };
    },
    confirmationSummary: (args) =>
      `Thêm ${String(args.quantity)} sản phẩm (phân loại ${String(args.productVariantId)}) vào giỏ hàng?`,
    buildHref: () => '/cart',
  },
  update_cart_item: {
    name: 'update_cart_item',
    description: 'Đổi số lượng một dòng giỏ hàng; luôn cần xác nhận.',
    parameters: objectSchema({
      cartItemId: idSchema,
      quantity: { type: 'integer', minimum: 1, maximum: 999 },
    }),
    auth: 'authenticated',
    roles: customerRoles,
    effect: 'mutation',
    confirmation: true,
    validate: (value) => {
      const args = object(value, ['cartItemId', 'quantity']);
      return {
        cartItemId: string(args.cartItemId, 'cartItemId', { id: true }),
        quantity: integer(args.quantity, 'quantity', { min: 1, max: 999 }),
      };
    },
    confirmationSummary: (args) =>
      `Đổi số lượng dòng giỏ hàng ${String(args.cartItemId)} thành ${String(args.quantity)}?`,
    buildHref: () => '/cart',
  },
  remove_cart_item: {
    name: 'remove_cart_item',
    description: 'Xóa một dòng khỏi giỏ hàng; luôn cần xác nhận.',
    parameters: objectSchema({ cartItemId: idSchema }),
    auth: 'authenticated',
    roles: customerRoles,
    effect: 'destructive',
    confirmation: true,
    validate: (value) => {
      const args = object(value, ['cartItemId']);
      return {
        cartItemId: string(args.cartItemId, 'cartItemId', { id: true }),
      };
    },
    confirmationSummary: (args) =>
      `Xóa dòng ${String(args.cartItemId)} khỏi giỏ hàng?`,
    buildHref: () => '/cart',
  },
  list_my_orders: {
    name: 'list_my_orders',
    description: 'Liệt kê các đơn hàng gần đây của khách hàng đã đăng nhập.',
    parameters: objectSchema({
      page: { type: 'integer', minimum: 1, maximum: 10000 },
      limit: { type: 'integer', minimum: 1, maximum: 10 },
    }),
    auth: 'authenticated',
    roles: customerRoles,
    effect: 'read',
    confirmation: false,
    validate: pagination,
    buildHref: () => '/orders',
  },
  get_my_order: {
    name: 'get_my_order',
    description: 'Lấy chi tiết một đơn hàng thuộc khách hàng hiện tại.',
    parameters: objectSchema({ orderId: idSchema }),
    auth: 'authenticated',
    roles: customerRoles,
    effect: 'read',
    confirmation: false,
    validate: (value) => {
      const args = object(value, ['orderId']);
      return { orderId: string(args.orderId, 'orderId', { id: true }) };
    },
    buildHref: (_result, args) =>
      `/orders/${encodeURIComponent(String(args.orderId))}`,
  },
  cancel_my_order: {
    name: 'cancel_my_order',
    description:
      'Hủy đơn hàng nếu trạng thái nghiệp vụ cho phép; luôn cần xác nhận.',
    parameters: objectSchema({
      orderId: idSchema,
      reason: { type: 'string', minLength: 1, maxLength: 1000 },
    }),
    auth: 'authenticated',
    roles: customerRoles,
    effect: 'destructive',
    confirmation: true,
    validate: (value) => {
      const args = object(value, ['orderId', 'reason']);
      return {
        orderId: string(args.orderId, 'orderId', { id: true }),
        reason: string(args.reason, 'reason', { max: 1000 }),
      };
    },
    confirmationSummary: (args) =>
      `Hủy đơn hàng ${String(args.orderId)} với lý do “${String(args.reason)}”?`,
    buildHref: (_result, args) =>
      `/orders/${encodeURIComponent(String(args.orderId))}`,
  },
  list_my_addresses: {
    name: 'list_my_addresses',
    description:
      'Liệt kê tỉnh/phường và trạng thái mặc định của địa chỉ hiện tại.',
    parameters: objectSchema({
      page: { type: 'integer', minimum: 1, maximum: 10000 },
      limit: { type: 'integer', minimum: 1, maximum: 10 },
    }),
    auth: 'authenticated',
    roles: customerRoles,
    effect: 'read',
    confirmation: false,
    validate: pagination,
    buildHref: () => '/addresses',
  },
  list_available_vouchers: {
    name: 'list_available_vouchers',
    description:
      'Liệt kê mã giảm giá thật mà khách hàng hiện tại chưa sử dụng.',
    parameters: objectSchema({
      shopId: { anyOf: [idSchema, { type: 'null' }] },
      subtotal: nullableString(50),
    }),
    auth: 'authenticated',
    roles: customerRoles,
    effect: 'read',
    confirmation: false,
    validate: (value) => {
      const args = object(value, ['shopId', 'subtotal']);
      const subtotal = nullableStringValue(args.subtotal, 'subtotal', {
        max: 50,
      });
      if (subtotal !== null && !/^\d+(\.\d+)?$/.test(subtotal)) invalidInput();
      return {
        shopId:
          nullableStringValue(args.shopId, 'shopId', { id: true }) ?? undefined,
        subtotal: subtotal ?? undefined,
      };
    },
    buildHref: () => '/checkout',
  },
  list_shipping_services: {
    name: 'list_shipping_services',
    description: 'Liệt kê dịch vụ vận chuyển đang hoạt động.',
    parameters: objectSchema({
      shopId: { anyOf: [idSchema, { type: 'null' }] },
      page: { type: 'integer', minimum: 1, maximum: 10000 },
      limit: { type: 'integer', minimum: 1, maximum: 10 },
    }),
    auth: 'authenticated',
    roles: customerRoles,
    effect: 'read',
    confirmation: false,
    validate: (value) => {
      const args = object(value, ['shopId', 'page', 'limit']);
      return {
        shopId:
          nullableStringValue(args.shopId, 'shopId', { id: true }) ?? undefined,
        ...pagination({ page: args.page, limit: args.limit }),
      };
    },
    buildHref: () => '/checkout',
  },
};

export function isChatToolName(value: string): value is ChatToolName {
  return CHAT_TOOL_NAMES.includes(value as ChatToolName);
}

export function toOpenAiTools() {
  return Object.values(CHAT_TOOLS).map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      strict: true,
    },
  }));
}
