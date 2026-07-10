## Quy tắc phản hồi và trạng thái

### Bắt buộc

- Mọi tác vụ bất đồng bộ phải có phản hồi phù hợp cho ít nhất các trạng thái idle, loading, success và error; luồng dữ liệu còn phải xét empty và stale/refetch khi có.
- Dùng Skeleton cho bố cục nội dung dự đoán được, LoadingScreen cho tải toàn vùng cần thiết, spinner nhỏ trong button khi submit; giữ kích thước ổn định để tránh layout shift.
- EmptyState phải nói điều gì đang trống và đưa hành động có ích; phân biệt catalog không có kết quả do filter với tài khoản chưa từng có dữ liệu.
- ErrorState phải dùng tiếng Việt dễ hiểu, không lộ stack/HTTP detail, có Retry khi hành động an toàn và có đường thoát khi không thể thử lại.
- Toast dùng cho xác nhận ngắn, không chặn; lỗi cần người dùng xử lý hoặc dữ liệu lâu dài phải nằm gần ngữ cảnh, không chỉ xuất hiện trong toast.
- Màu/icon/ARIA live role phải khớp mức độ: status cho thông báo thường, alert cho lỗi khẩn; tuân thủ [colors](../design-system/colors.md) và [components](../design-system/components.md).
- Trạng thái optimistic chỉ dùng khi có thể hoàn tác hoặc khôi phục chắc chắn và không làm sai lệch giá, tồn kho, thanh toán hay trạng thái đơn.

### Không được

- Không hiển thị “Không có dữ liệu” khi thực tế request lỗi, chưa chạy hoặc filter đang loại hết kết quả.
- Không dùng skeleton vô hạn, spinner toàn trang cho cập nhật nhỏ hoặc nhiều cơ chế loading chồng nhau.
- Không thông báo thành công trước khi server xác nhận với hành động không an toàn.
- Không đưa lỗi validation, lỗi thanh toán hoặc cảnh báo phá hủy chỉ vào toast dễ biến mất.
- Không tự động retry request có side effect hoặc lặp submit có thể tạo đơn/giao dịch trùng.
- Không mock thông báo, flash sale, voucher hoặc trạng thái thương mại chưa có từ API.

### Ưu tiên

- Ưu tiên phản hồi tại chỗ gần hành động, sau đó mới thêm toast cho xác nhận toàn cục nếu cần.
- Ưu tiên giữ nội dung cũ khi refetch không làm người dùng hiểu nhầm và biểu thị tiến trình nhẹ thay vì xóa màn hình.
- Ưu tiên thông báo có hành động cụ thể: thử lại, sửa trường, xóa bộ lọc, quay lại hoặc liên hệ hỗ trợ.
- Ưu tiên tôn trọng `prefers-reduced-motion` cho spinner, shimmer, toast và transition.

### Checklist

- [ ] Idle/loading/success/error và empty được phân biệt đúng.
- [ ] Loading không làm nhảy layout hoặc khóa toàn trang không cần thiết.
- [ ] Thông báo nêu được kết quả và hành động tiếp theo.
- [ ] Toast/inline/dialog được chọn đúng mức độ và có ARIA phù hợp.
- [ ] Retry/optimistic không thể tạo side effect trùng hoặc sai nguồn sự thật.
- [ ] Không có trạng thái/tính năng commerce giả.
