import { SellerPayoutStatus } from '@prisma/client';

export const SELLER_LEDGER_HOLD_DAYS = 7;
export const SELLER_LEDGER_HOLD_MS =
  SELLER_LEDGER_HOLD_DAYS * 24 * 60 * 60 * 1000;
export const MINIMUM_PAYOUT_AMOUNT = 100_000;
export const PAYOUT_CODE_PREFIX = 'PAY';
export const SEPAY_PROVIDER = 'SEPAY';
export const PAYOUT_RESERVED_STATUSES: SellerPayoutStatus[] = [
  SellerPayoutStatus.PendingApproval,
  SellerPayoutStatus.Approved,
  SellerPayoutStatus.Processing,
];

export type SupportedPayoutBank = { code: string; name: string };

// ponytail: VietQR transfer-capable bank snapshot from 2026-07-30; replace
// with a cached provider sync when same-day bank-directory freshness is required.
export const SUPPORTED_PAYOUT_BANKS: readonly SupportedPayoutBank[] = [
  { code: 'ABB', name: 'ABBANK' },
  { code: 'ACB', name: 'ACB' },
  { code: 'VBA', name: 'Agribank' },
  { code: 'BAB', name: 'BacABank' },
  { code: 'BVB', name: 'BaoVietBank' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'CAKE', name: 'CAKE' },
  { code: 'CIMB', name: 'CIMB' },
  { code: 'COOPBANK', name: 'COOPBANK' },
  { code: 'EIB', name: 'Eximbank' },
  { code: 'HDB', name: 'HDBank' },
  { code: 'KBANK', name: 'KBank' },
  { code: 'KLB', name: 'KienLongBank' },
  { code: 'LPB', name: 'LPBank' },
  { code: 'MB', name: 'MBBank' },
  { code: 'MBV', name: 'MBV' },
  { code: 'MSB', name: 'MSB' },
  { code: 'NAB', name: 'NamABank' },
  { code: 'NCB', name: 'NCB' },
  { code: 'OCB', name: 'OCB' },
  { code: 'PGB', name: 'PGBank' },
  { code: 'PVCB', name: 'PVcomBank' },
  { code: 'PVDB', name: 'PVcomBank Pay' },
  { code: 'STB', name: 'Sacombank' },
  { code: 'SGICB', name: 'SaigonBank' },
  { code: 'SCB', name: 'SCB' },
  { code: 'SEAB', name: 'SeABank' },
  { code: 'SHB', name: 'SHB' },
  { code: 'SHBVN', name: 'ShinhanBank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'TIMO', name: 'Timo' },
  { code: 'TPB', name: 'TPBank' },
  { code: 'UBANK', name: 'Ubank' },
  { code: 'VIB', name: 'VIB' },
  { code: 'VAB', name: 'VietABank' },
  { code: 'VIETBANK', name: 'VietBank' },
  { code: 'VCCB', name: 'VietCapitalBank' },
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'ICB', name: 'VietinBank' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'WVN', name: 'Woori' },
];
