## Quy tắc UX thương mại điện tử

### Bắt buộc

- Giữ luồng khám phá → xem chi tiết → chọn biến thể/số lượng → giỏ hàng → thanh toán → theo dõi đơn rõ ràng, có phản hồi sau mỗi hành động.
- Hiển thị tên, ảnh, giá hiện tại, giá gốc/giảm giá chỉ khi có dữ liệu, trạng thái tồn kho và nhà bán ở vị trí dễ quét; định dạng tiền tệ và trạng thái theo [content-rules](content-rules.md).
- Search, filter, sort và pagination phải phản ánh query thật, có cách reset, giữ trạng thái hợp lý và phân biệt “không có sản phẩm” với “tải lỗi”.
- Trước khi đặt hàng, tóm tắt chính xác sản phẩm, biến thể, số lượng, phí, giảm giá thật, địa chỉ, vận chuyển và tổng tiền; thay đổi phải được tính lại từ logic hiện hữu.
- Hành động nhạy cảm như xóa, hủy đơn hoặc thay đổi ảnh hưởng thanh toán phải có ngữ cảnh, xác nhận phù hợp và kết quả rõ.
- Marketplace đa nhà bán phải làm rõ người bán, trạng thái xử lý và phạm vi từng đơn mà không phỏng đoán dữ liệu backend.

### Không được

- Không hiển thị giảm giá, đếm ngược, độ khan hiếm, đánh giá, lượt mua, freeship, nhãn official hoặc best-seller nếu API không cung cấp dữ liệu đáng tin cậy.
- Không tạo dark pattern: mặc định chọn phí cao, giấu tổng tiền, đánh lạc hướng nút hủy/quay lại hoặc tạo cảm giác khẩn cấp giả.
- Không thêm wishlist, voucher, flash sale, notifications hay loyalty dưới dạng tính năng hoạt động khi chưa có API; chỉ ghi trong kế hoạch tương lai hoặc render có điều kiện khi dữ liệu tồn tại.
- Không làm ProductCard thành nơi chứa mọi thông tin; không để CTA card cạnh tranh với CTA chi tiết sản phẩm.
- Không thay đổi tính toán giá, tồn kho, vận chuyển hoặc trạng thái đơn ở frontend để phục vụ thiết kế.

### Ưu tiên

- Ưu tiên niềm tin: giá minh bạch, trạng thái thật, ảnh hợp lệ, tên nhà bán và thông báo lỗi có cách khắc phục.
- Ưu tiên giữ ngữ cảnh khi quay lại catalog hoặc sau đăng nhập nếu kiến trúc hiện tại cho phép an toàn.
- Ưu tiên skeleton ổn định kích thước, optimistic UI chỉ cho hành động có khả năng hoàn tác và cơ chế đồng bộ rõ.
- Ưu tiên sự khác biệt giữa vai trò public, buyer, seller và admin bằng điều hướng/tác vụ, không chỉ bằng màu.

### Checklist

- [ ] Thông tin giá, tồn kho, nhà bán và đơn hàng lấy từ nguồn dữ liệu thật.
- [ ] Search/filter/sort/reset/loading/empty/error hoạt động phân biệt rõ.
- [ ] Tổng đơn và phí minh bạch trước hành động cam kết.
- [ ] Không có nhãn, khẩn cấp hoặc social proof giả.
- [ ] Tính năng chưa có API chỉ là conditional/future, không mock như thật.
- [ ] Không sửa logic giá, kho, giao vận, phân quyền hoặc hợp đồng API.
