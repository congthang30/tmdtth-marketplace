import { adminVouchersApi } from "@/features/vouchers/api";
import { VoucherManagementPage } from "@/features/vouchers/components/VoucherManagementPage";

export function AdminVouchersPage() {
  return (
    <VoucherManagementPage
      owner="platform"
      queryKeyPrefix="admin-vouchers"
      api={adminVouchersApi}
      eyebrow="Mã giảm giá toàn hệ thống"
      title="Mã giảm giá"
      description="Mã giảm giá do sàn phát hành, áp dụng cho toàn bộ đơn hàng bất kể gian hàng nào. Không thể trùng với mã giảm giá của một gian hàng cụ thể."
      createLabel="Tạo mã toàn hệ thống"
      emptyTitle="Chưa có mã giảm giá"
      emptyDescription="Hãy tạo mã giảm giá đầu tiên cho toàn hệ thống."
    />
  );
}
