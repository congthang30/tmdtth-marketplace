import type { ApiMeta } from "@/types/api";

export type VoucherDiscountType = "Percentage" | "FixedAmount";
export type VoucherDiscountTarget = "Product" | "Shipping";
export type VoucherProductScope = "AllProducts" | "Categories" | "SpecificProducts";
export type VoucherScope = "Platform" | "Shop";
export type VoucherStatus = "Active" | "Inactive";

export type VoucherCategory = {
  id: string;
  idString: string;
  categoryName: string;
  slug: string;
};

export type VoucherProduct = {
  id: string;
  idString: string;
  productName: string;
  slug: string;
};

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
  discountTarget: VoucherDiscountTarget;
  productScope: VoucherProductScope;
  categories: VoucherCategory[];
  products: VoucherProduct[];
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
  discountTarget: VoucherDiscountTarget;
  productScope: VoucherProductScope;
  categories: VoucherCategory[];
  products: VoucherProduct[];
  eligibleAmount: string;
};

export type VoucherRequest = {
  voucherCode?: string;
  voucherName?: string;
  discountType?: VoucherDiscountType;
  discountTarget?: VoucherDiscountTarget;
  productScope?: VoucherProductScope;
  categoryIds?: string[];
  productIds?: string[];
  discountValue?: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  usageLimit?: number;
  startAt?: string;
  endAt?: string;
  voucherStatus?: VoucherStatus;
};
