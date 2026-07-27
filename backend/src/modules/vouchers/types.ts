export const VOUCHER_DISCOUNT_TYPE_PERCENTAGE = 'Percentage';
export const VOUCHER_DISCOUNT_TYPE_FIXED_AMOUNT = 'FixedAmount';

export const VOUCHER_STATUS_ACTIVE = 'Active';
export const VOUCHER_STATUS_INACTIVE = 'Inactive';

export type VoucherDiscountType =
  | typeof VOUCHER_DISCOUNT_TYPE_PERCENTAGE
  | typeof VOUCHER_DISCOUNT_TYPE_FIXED_AMOUNT;

export type VoucherScope = 'Platform' | 'Shop';

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
};

export type VoucherValidationResult = {
  voucher: {
    id: bigint;
    voucherCode: string;
    voucherName: string;
    discountType: VoucherDiscountType;
    discountValue: string;
    maxDiscountAmount: string | null;
  };
  discountAmount: string;
};
