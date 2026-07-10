---
name: accessibility
description: "Audit và triển khai accessibility cho giao diện TMDTTH theo WCAG 2.2 AA phù hợp. Áp dụng khi tạo hoặc sửa form, dialog, navigation, table, toast, icon button, màu sắc, keyboard interaction, focus và screen-reader content."
---

# Khả năng tiếp cận

## Mục tiêu

Đảm bảo người dùng bàn phím, screen reader, thị lực kém hoặc hạn chế vận động hoàn thành được tác vụ cốt lõi.

## Khi nào áp dụng

- Tạo/sửa component tương tác, form, modal, navigation, table hoặc feedback state.
- Chọn màu, kiểm tra contrast hoặc audit keyboard/screen reader.

## Nguyên tắc bắt buộc

- Đọc `../../rules/accessibility-rules.md` và bảng contrast trong `../../design-system/colors.md`.
- Dùng semantic HTML trước ARIA; không dùng `div` thay `button`/`a`.
- Mọi control phải có accessible name; icon-only button phải có `aria-label` tiếng Việt.
- Focus phải nhìn thấy, theo thứ tự logic và được quản lý trong dialog.
- Lỗi form phải liên kết với field qua `aria-describedby` và `aria-invalid`.
- Không dùng màu làm tín hiệu duy nhất; text thường đạt contrast tối thiểu 4.5:1.
- Tôn trọng `prefers-reduced-motion`.

## Quy trình thực hiện

1. Xác định semantic structure và heading hierarchy.
2. Kiểm tra bằng bàn phím: Tab, Shift+Tab, Enter, Space, Escape và arrow key khi phù hợp.
3. Kiểm tra accessible name/description/state.
4. Kiểm tra focus trap, focus return và scroll lock của dialog.
5. Kiểm tra contrast, zoom 200% và reduced motion.
6. Chạy lint/test accessibility nếu project bổ sung công cụ.

## Checklist trước khi code

- [ ] Chọn đúng phần tử HTML cho hành vi.
- [ ] Xác định label, description và error association.
- [ ] Xác định focus flow khi mở/đóng overlay.

## Checklist sau khi code

- [ ] Hoàn thành tác vụ chỉ bằng bàn phím.
- [ ] Focus visible và không bị che.
- [ ] Screen reader đọc đúng tên, trạng thái và lỗi.
- [ ] Contrast đạt chuẩn đã ghi trong design system.
- [ ] Animation có phương án reduced motion.

## Những lỗi phải tránh

- Thêm ARIA sai để bù cho HTML không semantic.
- Xóa outline mà không có focus style thay thế.
- Dùng placeholder làm label.
- Tự động chuyển focus không báo trước.
- Dùng `role="dialog"` nhưng không trap/return focus.

## Ví dụ đúng

```tsx
<input aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} />
```

## Ví dụ sai

```tsx
<div onClick={save} className="text-red-500">✓</div>
```

## Tiêu chí hoàn thành

- Tác vụ cốt lõi dùng được bằng keyboard và screen reader.
- Màu, focus, form và dialog đáp ứng checklist WCAG 2.2 AA đã chọn.
