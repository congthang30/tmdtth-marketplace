import { apiGet, apiGetResponse, apiPatch, apiPost, apiPut } from '@/services/api';
import type { ApiMeta } from '@/types/api';

export type SellerLedgerEntryType =
  | 'SaleCredit'
  | 'PlatformVoucherCredit'
  | 'PlatformFeeDebit'
  | 'AdjustmentCredit'
  | 'AdjustmentDebit'
  | 'PayoutDebit';
export type SellerPayoutStatus =
  | 'PendingApproval'
  | 'Approved'
  | 'Processing'
  | 'Paid'
  | 'Rejected'
  | 'Failed'
  | 'Cancelled';
export type BankTransactionMatchStatus =
  | 'Unmatched'
  | 'Matched'
  | 'AmountMismatch'
  | 'InvalidDirection'
  | 'AlreadyMatched'
  | 'IntegrityConflict';

export type FinanceShop = {
  id: string;
  shopName: string;
  code: string;
};

export type FinanceSummary = {
  shop: FinanceShop;
  pendingAmount: string;
  availableAmount: string;
  reservedAmount: string;
  paidAmount: string;
  holdDays: number;
  asOf: string;
};

export type LedgerEntry = {
  id: string;
  shop: FinanceShop;
  shopOrder: {
    id: string;
    shopOrderCode: string;
    orderStatus: string;
  } | null;
  entryType: SellerLedgerEntryType;
  sourceType: string;
  sourceId: string;
  amount: string;
  direction: 'Credit' | 'Debit';
  description: string;
  metadata: unknown;
  availableAt: string;
  createdAt: string;
};

export type PayoutBank = {
  code: string;
  name: string;
  fullName: string;
  logoUrl: string | null;
};

export type PayoutAccount = {
  bankCode: string;
  bankName: string;
  maskedAccountNumber: string;
  accountHolderName: string;
  status: string;
  updatedAt: string;
};

export type SellerPayout = {
  id: string;
  payoutCode: string;
  amount: string;
  status: SellerPayoutStatus;
  bankCode: string;
  bankName: string;
  maskedAccountNumber: string;
  accountHolderName: string;
  requestedAt: string;
  approvedAt: string | null;
  processingAt: string | null;
  paidAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  shop?: FinanceShop;
};

export type TransferInstruction = {
  content: string;
  amount: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
};

export type BankTransaction = {
  id: string;
  provider: string;
  providerTransactionId: string;
  gateway: string;
  accountNumberMasked: string;
  transferType: 'in' | 'out';
  transferAmount: string;
  transactionDate: string;
  code: string | null;
  content: string | null;
  referenceCode: string | null;
  matchStatus: BankTransactionMatchStatus;
  payload: unknown;
  createdAt: string;
  payout: Pick<SellerPayout, 'id' | 'payoutCode' | 'status'> | null;
  shop: FinanceShop | null;
};

export type PageParams = {
  page?: number;
  limit?: number;
  q?: string;
};
export type LedgerParams = PageParams & {
  entryType?: SellerLedgerEntryType;
  from?: string;
  to?: string;
  shopId?: string;
};
export type PayoutParams = PageParams & {
  status?: SellerPayoutStatus;
  shopId?: string;
};
export type BankTransactionParams = PageParams & {
  matchStatus?: BankTransactionMatchStatus;
  transferType?: 'in' | 'out';
};

type Paginated<T> = { items: T[]; meta?: ApiMeta };

async function getPaginated<T>(url: string, params: object): Promise<Paginated<T>> {
  const response = await apiGetResponse<T[]>(url, { params });
  return { items: response.data, meta: response.meta };
}

export const sellerFinanceKeys = {
  all: ['seller', 'finance'] as const,
  summary: () => [...sellerFinanceKeys.all, 'summary'] as const,
  banks: () => [...sellerFinanceKeys.all, 'banks'] as const,
  account: () => [...sellerFinanceKeys.all, 'account'] as const,
  ledger: (params: LedgerParams) => [...sellerFinanceKeys.all, 'ledger', params] as const,
  payouts: (params: PayoutParams) => [...sellerFinanceKeys.all, 'payouts', params] as const,
};

export const adminFinanceKeys = {
  all: ['admin', 'finance'] as const,
  payouts: (params: PayoutParams) => [...adminFinanceKeys.all, 'payouts', params] as const,
  transactions: (params: BankTransactionParams) => [...adminFinanceKeys.all, 'transactions', params] as const,
  transaction: (id: string) => [...adminFinanceKeys.all, 'transaction', id] as const,
};

export const sellerFinanceApi = {
  summary: () => apiGet<FinanceSummary>('/seller/finance/summary'),
  banks: () => apiGet<PayoutBank[]>('/seller/finance/payout-banks'),
  account: () => apiGet<PayoutAccount | null>('/seller/finance/payout-account'),
  saveAccount: (body: { bankCode: string; bankName: string; accountNumber: string; accountHolderName: string }) =>
    apiPut<PayoutAccount, typeof body>('/seller/finance/payout-account', body),
  ledger: (params: LedgerParams) => getPaginated<LedgerEntry>('/seller/finance/ledger', params),
  payouts: (params: PayoutParams) => getPaginated<SellerPayout>('/seller/finance/payouts', params),
  createPayout: (amount: string) =>
    apiPost<SellerPayout, { amount: string }>('/seller/finance/payouts', { amount }),
  cancelPayout: (id: string) => apiPatch<SellerPayout>(`/seller/finance/payouts/${id}/cancel`),
};

export const adminFinanceApi = {
  payouts: (params: PayoutParams) => getPaginated<SellerPayout>('/admin/finance/payouts', params),
  transactions: (params: BankTransactionParams) =>
    getPaginated<BankTransaction>('/admin/finance/bank-transactions', params),
  transaction: (id: string) => apiGet<BankTransaction>(`/admin/finance/bank-transactions/${id}`),
  approve: (id: string) => apiPatch<SellerPayout>(`/admin/finance/payouts/${id}/approve`),
  reject: (id: string, reason: string) =>
    apiPatch<SellerPayout, { reason: string }>(`/admin/finance/payouts/${id}/reject`, { reason }),
  process: (id: string, body: { bankReference: string; note?: string }) =>
    apiPatch<SellerPayout & { transferInstruction: TransferInstruction }, typeof body>(
      `/admin/finance/payouts/${id}/process`,
      body,
    ),
  fail: (id: string, reason: string) =>
    apiPatch<SellerPayout, { reason: string }>(`/admin/finance/payouts/${id}/fail`, { reason }),
  match: (transactionId: string, body: { payoutId: string; reason: string }) =>
    apiPatch<{ payoutCode: string; status: 'Paid' }, typeof body>(
      `/admin/finance/bank-transactions/${transactionId}/match`,
      body,
    ),
};
