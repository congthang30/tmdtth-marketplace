# Định hướng thương hiệu

## Dữ kiện hiện tại

- Tên làm việc trong header là **TMDTTH Marketplace**; `index.html` còn tiêu đề “Công Thắng”, cần Product Owner xác nhận ở giai đoạn triển khai.
- Dấu hiệu nhận diện hiện tại chỉ là icon cửa hàng Lucide trong khối xanh; chưa có logo riêng.
- Màu `primary-600: #0F66AD` đã được dùng xuyên suốt CTA và navigation.
- `favicon.svg`, `react.svg`, `vite.svg` và một số asset là dấu vết starter Vite, không phải tài sản thương hiệu.
- Marketplace phục vụ nhiều ngành hàng; chưa có bằng chứng cho một ngành hàng hoặc nhóm tuổi duy nhất.

Giả định thiết kế: duy trì cảm giác tin cậy, phổ quát và đủ chặt chẽ cho cả khu vực mua sắm, seller và admin. Không suy diễn logo, slogan hoặc tính năng từ dữ liệu chưa có.

## Ba hướng màu được cân nhắc

| Hướng | Primary | Secondary | Accent | Ưu điểm | Nhược điểm |
| --- | --- | --- | --- | --- | --- |
| A — Azure tin cậy | `#0F66AD` | Slate `#334155` | Cyan `#0E7490` | Kế thừa UI hiện tại, tin cậy, tương phản tốt, hợp nhiều ngành hàng, migration thấp | Xanh dương phổ biến; cần logo và hình ảnh riêng để tăng khác biệt |
| B — Teal trong trẻo | `#0F766E` | Deep cyan `#164E63` | Violet `#7C3AED` | Tươi, sạch, hợp lifestyle/sức khỏe, có cảm giác premium vừa phải | Dễ lẫn với success/freeship; phải thay phần lớn màu hiện hữu |
| C — Indigo số hóa | `#6D28D9` | Slate `#334155` | Teal `#0E7490` | Trẻ, khác biệt, phù hợp sản phẩm số/lifestyle | Chưa có bằng chứng thương hiệu; rủi ro refactor và độ bền với marketplace tổng hợp cao hơn |

## Hướng được chọn: A — Azure tin cậy

Azure giữ được tài sản nhận diện đang có, đạt độ tin cậy cần thiết cho thanh toán và quản lý đơn, đồng thời không cạnh tranh với sale, voucher hay freeship. Slate tạo nền chuyên nghiệp cho dashboard; Cyan chỉ làm accent có kiểm soát.

Không sao chép màu, logo, grid hay component đặc trưng của Shopee, Lazada, TikTok Shop hoặc marketplace khác. Sự khác biệt nên đến từ logo thật, giọng tiếng Việt, chất lượng nội dung, nhịp layout và hình ảnh sản phẩm của TMDTTH.

## Tính cách và nguyên tắc hình ảnh

- Hiện đại, rõ ràng, thân thiện, đáng tin; mật độ vừa đến cao.
- Surface trắng, nền xám lạnh rất nhạt, border nhẹ; shadow chỉ biểu thị elevation.
- Bo góc vừa phải; không biến mọi section thành “viên thuốc” hoặc card khổng lồ.
- Không dùng gradient/glassmorphism mặc định; campaign chỉ dùng khi có art direction.
- Ảnh sản phẩm trung thực, tỷ lệ ổn định, không đặt text quan trọng bên trong ảnh.
- Ưu tiên 70–80% neutral, 10–20% brand, 5–10% accent/semantic trong một viewport.

## Việc cần xác nhận trước khi triển khai asset

1. Chốt tên hiển thị giữa “TMDTTH Marketplace” và “Công Thắng”.
2. Cung cấp logo vector, favicon và quy tắc vùng an toàn; nếu chưa có, tạo task branding riêng.
3. Xác định quyền sử dụng banner/ảnh; không dùng asset starter hoặc ảnh giả trong production.

Giá trị màu chuẩn nằm duy nhất tại [`design-tokens.md`](design-tokens.md); cách dùng nằm tại [`colors.md`](colors.md).
