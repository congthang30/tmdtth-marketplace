import type {
  BankTransactionMatchStatus,
  SellerLedgerEntryType,
  SellerPayoutStatus,
} from './api';

export const payoutStatusOptions: Array<{ value: SellerPayoutStatus; label: string }> = [
  { value: 'PendingApproval', label: 'Chờ phê duyệt' },
  { value: 'Approved', label: 'Đã phê duyệt' },
  { value: 'Processing', label: 'Chờ đối soát' },
  { value: 'Paid', label: 'Đã chi trả' },
  { value: 'Rejected', label: 'Đã từ chối' },
  { value: 'Failed', label: 'Chuyển khoản thất bại' },
  { value: 'Cancelled', label: 'Đã hủy' },
];

export const ledgerTypeOptions: Array<{ value: SellerLedgerEntryType; label: string }> = [
  { value: 'SaleCredit', label: 'Doanh thu đơn hàng' },
  { value: 'PlatformVoucherCredit', label: 'Sàn bù mã giảm giá' },
  { value: 'PlatformFeeDebit', label: 'Phí sàn' },
  { value: 'AdjustmentCredit', label: 'Điều chỉnh tăng' },
  { value: 'AdjustmentDebit', label: 'Điều chỉnh giảm' },
  { value: 'PayoutDebit', label: 'Đã chi trả' },
];

export const matchStatusOptions: Array<{
  value: BankTransactionMatchStatus;
  label: string;
}> = [
  { value: 'Unmatched', label: 'Chưa khớp' },
  { value: 'Matched', label: 'Đã khớp' },
  { value: 'AmountMismatch', label: 'Lệch số tiền' },
  { value: 'InvalidDirection', label: 'Sai chiều giao dịch' },
  { value: 'AlreadyMatched', label: 'Đã được đối soát' },
  { value: 'IntegrityConflict', label: 'Xung đột dữ liệu' },
];

function labelFor<T extends string>(options: Array<{ value: T; label: string }>, value: T) {
  return options.find((option) => option.value === value)?.label ?? 'Không xác định';
}

export const payoutStatusLabel = (status: SellerPayoutStatus) =>
  labelFor(payoutStatusOptions, status);
export const ledgerTypeLabel = (type: SellerLedgerEntryType) =>
  labelFor(ledgerTypeOptions, type);
export const matchStatusLabel = (status: BankTransactionMatchStatus) =>
  labelFor(matchStatusOptions, status);

export function payoutBadgeTone(
  status: SellerPayoutStatus,
): 'default' | 'success' | 'danger' {
  if (status === 'Paid') return 'success';
  if (status === 'Rejected' || status === 'Failed' || status === 'Cancelled') return 'danger';
  return 'default';
}

export function matchBadgeTone(
  status: BankTransactionMatchStatus,
): 'default' | 'success' | 'danger' {
  if (status === 'Matched') return 'success';
  if (status === 'IntegrityConflict' || status === 'InvalidDirection') return 'danger';
  return 'default';
}
