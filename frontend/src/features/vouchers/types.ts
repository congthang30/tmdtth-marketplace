import type { ApiMeta } from "@/types/api";

export type VoucherDiscountType = "Percentage" | "FixedAmount";
export type VoucherScope = "Platform" | "Shop";
export type VoucherStatus = "Active" | "Inactive";

/** Full voucher row used by admin/seller management screens. */
export type Voucher = {
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
  startAt: string;
  endAt: string;
  voucherStatus: VoucherStatus;
  createdAt: string;
};

export type VoucherListResponse = {
  items: Voucher[];
  meta?: ApiMeta;
};

/** Lightweight voucher shown to customers when picking a code at checkout. */
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
  endAt: string;
  isEligible: boolean;
  estimatedDiscountAmount: string;
};

export type VoucherRequest = {
  voucherCode?: string;
  voucherName?: string;
  discountType?: VoucherDiscountType;
  discountValue?: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  usageLimit?: number;
  startAt?: string;
  endAt?: string;
  voucherStatus?: VoucherStatus;
};
