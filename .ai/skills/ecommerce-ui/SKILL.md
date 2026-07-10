---
name: ecommerce-ui
description: "Thiết kế, triển khai và review giao diện thương mại điện tử của TMDTTH, gồm danh mục, thẻ sản phẩm, chi tiết sản phẩm, giá, phân loại, giỏ hàng, thanh toán, đánh giá và trạng thái mua sắm. Áp dụng khi tạo hoặc sửa React/Tailwind UI liên quan luồng commerce."
---

# UI thương mại điện tử

## Mục tiêu

Tạo trải nghiệm mua sắm rõ giá, rõ trạng thái, thao tác nhanh và nhất quán với design system TMDTTH.

## Khi nào áp dụng

- Tạo hoặc sửa danh mục, thẻ sản phẩm, chi tiết sản phẩm, giỏ hàng, thanh toán hoặc đánh giá.
- Review luồng mua hàng, hiển thị giá, tồn kho, phân loại, khuyến mãi hoặc vận chuyển.

## Nguyên tắc bắt buộc

- Đọc `../../design-system/components.md`, `../../design-system/layouts.md` và `../../rules/ecommerce-ux-rules.md` trước khi code.
- Dùng token trong `../../design-system/design-tokens.md`; không hard-code màu thương hiệu hay semantic.
- Giữ nguyên API contract, route, enum và business logic.
- Hiển thị đủ loading, empty, error, disabled và out-of-stock state.
- Giữ giá bán là nội dung nổi bật nhất sau ảnh; giá gốc dùng line-through và text muted.
- Không hiển thị quá ba badge ưu tiên trên một thẻ sản phẩm.
- Trên mobile, không phụ thuộc hover và giữ vùng chạm tối thiểu 44×44px.

## Quy trình thực hiện

1. Xác định nhiệm vụ người dùng và dữ liệu thật đang có.
2. Chọn primitive/component hiện hữu từ `../../design-system/component-inventory.md`.
3. Thiết kế hierarchy: ảnh → tên → giá → trust signal → hành động.
4. Bổ sung trạng thái tải, trống, lỗi, hết hàng và vô hiệu hóa.
5. Kiểm tra luồng từ khám phá đến đặt hàng trên mobile và desktop.
6. Chạy checklist và quality gate trong `../frontend-quality/SKILL.md`.

## Checklist trước khi code

- [ ] Xác nhận nguồn dữ liệu, enum và điều kiện tồn kho.
- [ ] Xác định CTA chính, phụ và hành động phá hủy.
- [ ] Chọn component tái sử dụng thay vì copy JSX.
- [ ] Kiểm tra nội dung theo `../vietnamese-content/SKILL.md`.

## Checklist sau khi code

- [ ] Giá, tồn kho và phân loại cập nhật đúng dữ liệu.
- [ ] CTA không double submit và có loading/disabled state.
- [ ] Ảnh có tỷ lệ ổn định, fallback và alt phù hợp.
- [ ] Không có layout shift nghiêm trọng hoặc tràn ngang.
- [ ] Lint, type-check, test và build đạt.

## Những lỗi phải tránh

- Dùng màu sale làm màu thương hiệu toàn trang.
- Cho mua khi chưa chọn phân loại bắt buộc hoặc khi hết hàng.
- Ẩn phí, tổng tiền hoặc thay đổi giá khỏi người dùng.
- Dùng toast làm cách duy nhất báo lỗi thanh toán quan trọng.
- Sao chép bố cục hoặc nhận diện của marketplace khác.

## Ví dụ đúng

```tsx
<Button
  disabled={
    !selectedVariant ||
    selectedVariant.quantityAvailable < 1 ||
    mutation.isPending
  }
>
  {mutation.isPending ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
</Button>
```

## Ví dụ sai

```tsx
<button className="bg-[#ee4d2d]" onClick={submit}>Mua</button>
```

## Tiêu chí hoàn thành

- Luồng commerce rõ ràng, responsive, accessible và dùng đúng token.
- Không thay đổi hợp đồng dữ liệu hoặc logic nghiệp vụ ngoài phạm vi.
- Các trạng thái và quality gate đều được kiểm tra.
