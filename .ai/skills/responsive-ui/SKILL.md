---
name: responsive-ui
description: "Thiết kế, triển khai và kiểm tra responsive UI cho TMDTTH trên mobile, tablet và desktop. Áp dụng khi sửa layout, product grid, table, modal, navigation, sticky action, drawer hoặc touch interaction."
---

# UI responsive

## Mục tiêu

Đảm bảo mọi tác vụ cốt lõi dùng được từ 320px đến 1440px mà không tràn, che nội dung hoặc thu nhỏ máy móc layout desktop.

## Khi nào áp dụng

- Tạo hoặc sửa layout, grid, table, form nhiều cột, modal, navigation hay sticky CTA.
- Kiểm tra giao diện tại breakpoint hoặc xử lý lỗi overflow.

## Nguyên tắc bắt buộc

- Đọc `../../rules/responsive-rules.md` và `../../design-system/layouts.md`.
- Thiết kế mobile-first; thêm breakpoint theo nhu cầu nội dung, không theo thiết bị cụ thể.
- Kiểm tra tối thiểu 320, 375, 390, 430, 768, 1024, 1280 và 1440px.
- Giữ touch target tối thiểu 44×44px cho hành động quan trọng/icon-only.
- Table phải có scroll an toàn hoặc chuyển thành card; không nén cột đến mức mất nghĩa.
- Modal phải vừa viewport, có vùng cuộn nội dung và footer không che form.

## Quy trình thực hiện

1. Xác định nội dung bắt buộc và thứ tự ưu tiên ở 320px.
2. Chọn layout một cột trước, rồi tăng cột khi đủ không gian.
3. Kiểm tra text tiếng Việt dài, giá, badge và CTA.
4. Kiểm tra keyboard, zoom 200% và orientation nếu liên quan.
5. Ghi lại mọi ngoại lệ breakpoint trong code review.

## Checklist trước khi code

- [ ] Xác định kích thước nhỏ nhất hỗ trợ.
- [ ] Xác định nội dung được wrap, truncate hoặc chuyển vị trí.
- [ ] Xác định chiến lược cho table và navigation mobile.

## Checklist sau khi code

- [ ] Không có horizontal overflow ngoài vùng chủ động như table/carousel.
- [ ] Button, input và icon action đủ lớn để chạm.
- [ ] Modal, sticky bar và header không che nội dung.
- [ ] Product card cùng hàng không lệch nghiêm trọng.
- [ ] Test đủ danh sách viewport bắt buộc.

## Những lỗi phải tránh

- Chỉ thêm `overflow-hidden` để che lỗi layout.
- Thu nhỏ font hoặc nút dưới ngưỡng dễ dùng.
- Giữ nguyên table desktop trên mobile mà không có chiến lược.
- Phụ thuộc hover cho hành động chính.

## Ví dụ đúng

```tsx
<div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
```

## Ví dụ sai

```tsx
<div className="grid grid-cols-6 scale-75 overflow-hidden">
```

## Tiêu chí hoàn thành

- Tất cả viewport bắt buộc dùng được, không tràn và không mất chức năng.
- Quyết định responsive phản ánh priority nội dung, không chỉ thay kích thước.
