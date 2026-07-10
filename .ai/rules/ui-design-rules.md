## Quy tắc thiết kế giao diện

### Bắt buộc

- Dùng token ngữ nghĩa trong [design-tokens](../design-system/design-tokens.md), [colors](../design-system/colors.md), [typography](../design-system/typography.md), [spacing](../design-system/spacing.md) và [radius-shadow](../design-system/radius-shadow.md); không coi giá trị Tailwind rời rạc trong từng trang là nguồn chuẩn.
- Giữ ngôn ngữ thị giác nhất quán: nền trang sáng, bề mặt trắng, viền rõ nhẹ, bóng vừa đủ, màu xanh thương hiệu cho hành động chính và trạng thái chọn.
- Tạo thứ bậc rõ bằng tiêu đề, khoảng cách, nhóm nội dung và hành động chính; mỗi khu vực chỉ có một CTA nổi trội.
- Thiết kế theo dữ liệu thật mà API hiện có cung cấp; trạng thái không có dữ liệu, đang tải và lỗi phải là một phần của giao diện.
- Mọi giao diện mới phải dùng hoặc mở rộng component dùng chung theo [components](../design-system/components.md) và bố cục theo [layouts](../design-system/layouts.md).
- Giữ nguyên luồng nghiệp vụ, hợp đồng API và phân quyền khi chuẩn hóa UI.

### Không được

- Không tự ý dựng lại toàn bộ giao diện, đổi route, thay đổi business logic hoặc sửa cấu trúc payload chỉ để thuận tiện cho trình bày.
- Không thêm màu, font, khoảng cách, bo góc hoặc bóng đổ tùy hứng ngoài hệ token đã duyệt.
- Không lạm dụng card, đường viền, gradient, animation hoặc CTA cùng mức nhấn trong một màn hình.
- Không dùng nội dung giả để làm giao diện trông đầy hơn; wishlist, voucher, flash sale, thông báo và tính năng chưa có API chỉ được mô tả như khả năng tương lai hoặc hiển thị có điều kiện.
- Không hy sinh khả năng đọc, khả năng thao tác bàn phím hoặc trải nghiệm mobile để đạt hiệu ứng thị giác.

### Ưu tiên

- Ưu tiên sửa sai lệch có ảnh hưởng toàn hệ thống trước: token, primitive, trạng thái, layout, sau đó mới tinh chỉnh từng trang.
- Ưu tiên tính rõ ràng, tin cậy và tốc độ hoàn thành tác vụ mua bán hơn hiệu ứng trang trí.
- Ưu tiên tái sử dụng recipe/component sẵn có, giảm CSS/Tailwind lặp và giữ diff triển khai nhỏ, dễ kiểm chứng.
- Ưu tiên responsive và accessibility ngay từ lúc thiết kế, không để thành bước vá cuối.

### Checklist

- [ ] Màu, chữ, spacing, radius và shadow đều ánh xạ được về token.
- [ ] Có một CTA chính và thứ bậc nội dung dễ quét.
- [ ] Có đủ loading, empty, error và success khi luồng cần chúng.
- [ ] Component/layout đã đối chiếu với tài liệu design system.
- [ ] Không thay đổi business logic, API, route hoặc quyền người dùng.
- [ ] Đã kiểm tra mobile, desktop, bàn phím và độ tương phản.
