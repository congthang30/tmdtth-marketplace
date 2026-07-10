# Iconography

## Thư viện chuẩn

Tiếp tục dùng `lucide-react` đang có. Không trộn icon library hoặc emoji làm icon chức năng nếu chưa có lý do và review bundle/nhận diện.

## Kích thước và stroke

- 16px: metadata/inline.
- 18–20px: control và navigation mặc định.
- 24px: action lớn/empty state nhỏ.
- 32–48px: empty state có kiểm soát, không thay illustration thương hiệu.
- Giữ stroke mặc định nhất quán; không tự đổi fill/stroke giữa icon cùng cấp.

## Semantics

- Icon trang trí: `aria-hidden="true"` và không nhận focus.
- Icon-only button: `aria-label` mô tả hành động, ví dụ “Xóa sản phẩm”; target tối thiểu 44×44px.
- Icon đi cùng label không lặp accessible name.
- Trạng thái không chỉ có icon/màu: luôn kèm text hoặc accessible label rõ.
- Logo không dùng icon Lucide như tài sản cuối cùng; cần SVG thương hiệu được phê duyệt.

## Màu và motion

- Icon kế thừa `currentColor`; màu theo semantic role, không hard-code hex.
- Không dùng primary cho mọi icon. Icon warning/error/success theo đúng context.
- Animation icon phải ngắn, có mục đích và tắt/giảm theo `prefers-reduced-motion`.

## Không được

- Dùng icon mơ hồ thay nhãn cho action nghiệp vụ quan trọng.
- Dùng biểu tượng “official”, voucher, freeship nếu dữ liệu không xác thực.
- Copy logo/icon đặc trưng của marketplace khác.
