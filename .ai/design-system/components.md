# Hệ thống component

> Đây là kiến trúc mục tiêu. Xem trạng thái code thật tại [`component-inventory.md`](component-inventory.md). Chỉ tạo component khi task triển khai được phê duyệt.

## Ba tầng

1. `components/ui`: primitive thuần trình bày, không biết schema nghiệp vụ.
2. `components/common` hoặc `components/commerce`: composition dùng lại nhiều feature.
3. `features/*`: component gắn use case/API và page orchestration.

Ưu tiên composition và prop union rõ nghĩa. Không truyền chuỗi boolean như `primary`, `small`, `danger`, `loading` đồng thời; dùng `variant`, `size`, `state` có TypeScript type.

## Primitive UI

### Button và ButtonLink

- Variant: `primary`, `secondary`, `outline`, `ghost`, `destructive`, `link`, `icon`.
- Size: `sm`, `md`, `lg`; mọi icon-only button có accessible name và target 44×44px trên touch.
- Có hover, active, focus-visible, disabled, loading; loading không đổi chiều rộng.
- Button và link giữ semantics đúng nhưng dùng chung style recipe.

### Field controls

- `TextInput`, `Textarea`, `SelectInput`, checkbox/radio tương lai dùng chung field shell.
- Label thật, required indicator, helper, error, disabled, readonly; error liên kết bằng `aria-describedby`, `aria-invalid`.
- Placeholder chỉ là gợi ý, không thay label.

### Dialog/Drawer

- Modal cần unique title id, initial focus, focus trap, trả focus, Escape, khóa scroll và close button.
- Drawer/bottom sheet dùng cho filter mobile; chỉ tạo khi có use case thật.
- Hành động phá hủy cần xác nhận rõ đối tượng/hậu quả.
- `ConfirmDialog` và `FormDialog` chỉ là composition của Modal; schema, query và mutation vẫn thuộc feature.

### Feedback và data display

- `Alert`, `Toast`, `Badge`, `Skeleton`, `EmptyState`, `ErrorState`, `Pagination`, `Table` dùng semantic token.
- Toast chỉ cho kết quả hành động ngắn; lỗi checkout/API quan trọng phải hiển thị gần context.
- Loading có cấu trúc dùng skeleton; hành động ngắn dùng spinner trong control.

## Commerce compositions

### ProductCard

- Hierarchy: ảnh 4:3 hoặc tỷ lệ được chốt → tên tối đa 2 dòng → giá → metadata/trust → action nếu phù hợp.
- Giá sale dùng `sale`, giá gốc line-through. Tối đa 2–3 badge theo ưu tiên official → flash sale → discount → freeship → voucher.
- Chỉ render rating, sold count, location, voucher, official, freeship khi API trả dữ liệu xác thực.
- Có image fallback, skeleton, out-of-stock state; mobile không phụ thuộc hover.

### Product detail

- Gallery, title, price, variant, stock và CTA theo dữ liệu hiện tại.
- Không cho thêm/mua khi chưa chọn variant bắt buộc hoặc hết hàng; giá/stock đổi theo variant.
- “Mua ngay”, wishlist, Q&A, related products, zoom nâng cao là conditional/future nếu API/route chưa hỗ trợ.

### Mục tiêu component dùng lại

`ProductGrid`, `PriceDisplay`, `QuantitySelector`, `VariantSelector`, `CartItem`, `CartSummary`, `CheckoutSummary`, `ShippingOption`, `StatusBadge`, `ResponsiveDataView`. Mỗi component chỉ được tạo khi ít nhất một task thật cần nó; không dựng “thư viện cho có”.

## State contract

Component gọi API hoặc hiển thị async data phải xét: initial, loading, success, empty, error, disabled và partial error nếu có nhiều nguồn. Offline chỉ dùng khi app có cơ chế nhận biết. Không hiển thị dữ liệu stale như thành công mà không có tín hiệu khi điều đó ảnh hưởng giá/tồn kho.

## Definition of done

- Dùng token đã triển khai; không hard-code brand/semantic color.
- Semantics, keyboard, focus, accessible name/error association đạt.
- Kiểm tra 320–1440px theo [`layouts.md`](layouts.md).
- Không đổi business/API contract; không đưa mock data vào production.
- Có test phù hợp và đạt lint/type-check/build theo [`../rules/frontend-code-rules.md`](../rules/frontend-code-rules.md).
