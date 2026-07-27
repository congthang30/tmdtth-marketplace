import { sellerVouchersApi } from "@/features/vouchers/api";
import { VoucherManagementPage } from "@/features/vouchers/components/VoucherManagementPage";

export function SellerVouchersPage() {
  return (
    <VoucherManagementPage
      queryKeyPrefix="seller-vouchers"
      api={sellerVouchersApi}
      eyebrow="Mã giảm giá gian hàng"
      title="Mã giảm giá của gian hàng"
      description="Mã giảm giá bạn tạo chỉ áp dụng cho đơn hàng của gian hàng bạn, không dùng được cho gian hàng khác."
      createLabel="Tạo mã giảm giá"
      emptyTitle="Chưa có mã giảm giá"
      emptyDescription="Hãy tạo mã giảm giá đầu tiên cho gian hàng của bạn."
    />
  );
}
