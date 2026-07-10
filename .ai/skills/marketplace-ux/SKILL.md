---
name: marketplace-ux
description: "Phân tích, thiết kế và review UX marketplace đa ngành, đa gian hàng của TMDTTH. Áp dụng cho discovery, search, category, navigation, trust signal, promotion, seller identity, conversion và luồng nhiều shop."
---

# UX marketplace

## Mục tiêu

Giúp người dùng tìm, so sánh và mua sản phẩm nhanh trong hệ thống nhiều ngành hàng và nhiều người bán mà không làm giao diện rối.

## Khi nào áp dụng

- Thiết kế trang khám phá, tìm kiếm, danh mục, gian hàng, khuyến mãi hoặc navigation.
- Review mật độ thông tin, trust signal, conversion hoặc luồng nhiều shop.

## Nguyên tắc bắt buộc

- Đọc `../../rules/ecommerce-ux-rules.md` và `../../design-system/layouts.md`.
- Ưu tiên search, category, giá, trạng thái giao hàng và uy tín người bán trong hierarchy.
- Chỉ hiển thị section khi có dữ liệu thật; không thêm mock data vào production.
- Phân biệt rõ dữ liệu cấp sàn, cấp gian hàng và cấp sản phẩm.
- Không bắt chước trực tiếp Shopee, Lazada, TikTok Shop hoặc thương hiệu khác.
- Giữ mật độ vừa đến cao nhưng dùng grouping, spacing và typography để dễ quét.

## Quy trình thực hiện

1. Xác định intent: khám phá, tìm kiếm, so sánh, mua lại hay quản lý.
2. Lập bản đồ nguồn dữ liệu theo sàn, gian hàng và sản phẩm.
3. Xếp hạng thông tin theo quyết định mua hàng.
4. Thiết kế happy path và các trạng thái thiếu dữ liệu/lỗi.
5. Kiểm tra trust signal, phí, khuyến mãi và ownership có rõ không.
6. Kiểm tra conversion không đánh đổi tính minh bạch.

## Checklist trước khi code

- [ ] Xác định đối tượng và tác vụ chính của màn hình.
- [ ] Biết dữ liệu nào thật sự tồn tại trong API.
- [ ] Xác định điểm chuyển giữa sàn, shop và sản phẩm.
- [ ] Chọn số lượng section/badge phù hợp mật độ.

## Checklist sau khi code

- [ ] Search hoặc đường khám phá chính dễ nhận biết.
- [ ] Giá, phí, tồn kho và người bán không bị che giấu.
- [ ] Empty/error state hướng dẫn được bước tiếp theo.
- [ ] Luồng nhiều shop không gây nhầm tổng tiền hay vận chuyển.

## Những lỗi phải tránh

- Biến marketplace thành landing page ít thông tin.
- Nhồi mọi promotion vào cùng một vùng.
- Dùng nhiều badge nhưng không có thứ tự ưu tiên.
- Trộn dữ liệu shop và sàn khiến người dùng hiểu sai trách nhiệm.
- Tạo tính năng không có backend hỗ trợ.

## Ví dụ đúng

Hiển thị tên shop, giá, số lượng còn lại và phí vận chuyển ngay trước CTA đặt hàng.

## Ví dụ sai

Ẩn phí vận chuyển đến bước cuối hoặc hiển thị banner giả khi API không có campaign.

## Tiêu chí hoàn thành

- Tác vụ chính rõ, dữ liệu minh bạch và phù hợp mô hình đa shop.
- Navigation/discovery nhất quán trên desktop và mobile.
- Không sao chép nhận diện marketplace khác.
