import type { Prisma } from '@prisma/client';

export const VOUCHER_DISCOUNT_TYPE_PERCENTAGE = 'Percentage';
export const VOUCHER_DISCOUNT_TYPE_FIXED_AMOUNT = 'FixedAmount';
export const VOUCHER_DISCOUNT_TARGET_PRODUCT = 'Product';
export const VOUCHER_DISCOUNT_TARGET_SHIPPING = 'Shipping';

export const VOUCHER_STATUS_ACTIVE = 'Active';
export const VOUCHER_STATUS_INACTIVE = 'Inactive';

export type VoucherDiscountType =
  | typeof VOUCHER_DISCOUNT_TYPE_PERCENTAGE
  | typeof VOUCHER_DISCOUNT_TYPE_FIXED_AMOUNT;

export type VoucherDiscountTarget =
  | typeof VOUCHER_DISCOUNT_TARGET_PRODUCT
  | typeof VOUCHER_DISCOUNT_TARGET_SHIPPING;

export type VoucherProductScope =
  | 'AllProducts'
  | 'Categories'
  | 'SpecificProducts';

export type VoucherScope = 'Platform' | 'Shop';

export type VoucherCategorySummary = {
  id: string;
  idString: string;
  categoryName: string;
  slug: string;
};

export type VoucherProductSummary = {
  id: string;
  idString: string;
  productName: string;
  slug: string;
};

export type VoucherEligibleLine = {
  productId: bigint;
  categoryId: bigint;
  shopCategoryIds: bigint[];
  amount: Prisma.Decimal;
};

export type VoucherValidationContext = {
  orderShopId: bigint | null;
  productLines: VoucherEligibleLine[];
  shippingAmount: Prisma.Decimal;
};

/**
 * Full voucher representation used by admin/seller management screens.
 * `scope` is derived from `shopId` (null => Platform, set => Shop) so FE
 * doesn't need to re-derive this business rule itself.
 */
export type VoucherResponse = {
  id: string;
  idString: string;
  voucherCode: string;
  voucherName: string;
  scope: VoucherScope;
  shopId: string | null;
  shopIdString: string | null;
  discountType: VoucherDiscountType;
  discountValue: string;
  maxDiscountAmount: string | null;
  minOrderAmount: string;
  usageLimit: number | null;
  usedCount: number;
  startAt: Date;
  endAt: Date;
  voucherStatus: string;
  discountTarget: VoucherDiscountTarget;
  productScope: VoucherProductScope;
  categories: VoucherCategorySummary[];
  products: VoucherProductSummary[];
  createdAt: Date;
};

/**
 * Lightweight summary shown to customers at checkout: only what's needed
 * to decide whether/how to apply a voucher, never internal counters like
 * global usedCount.
 */
export type VoucherSummary = {
  id: string;
  idString: string;
  voucherCode: string;
  voucherName: string;
  scope: VoucherScope;
  shopId: string | null;
  shopIdString: string | null;
  discountType: VoucherDiscountType;
  discountValue: string;
  maxDiscountAmount: string | null;
  minOrderAmount: string;
  endAt: Date;
  /** Whether the current user's order subtotal already meets minOrderAmount. */
  isEligible: boolean;
  /** Estimated discount amount if applied to the given subtotal (0 if not eligible). */
  estimatedDiscountAmount: string;
  discountTarget: VoucherDiscountTarget;
  productScope: VoucherProductScope;
  categories: VoucherCategorySummary[];
  products: VoucherProductSummary[];
  eligibleAmount: string;
};

export type VoucherValidationResult = {
  voucher: {
    id: bigint;
    voucherCode: string;
    voucherName: string;
    discountType: VoucherDiscountType;
    discountValue: string;
    maxDiscountAmount: string | null;
    discountTarget: VoucherDiscountTarget;
    categoryIds: bigint[];
    productScope: VoucherProductScope;
    productIds: bigint[];
  };
  eligibleAmount: string;
  discountAmount: string;
};
