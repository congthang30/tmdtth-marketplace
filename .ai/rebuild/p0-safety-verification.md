# FE-RB-003 và FE-RB-004 — Safety verification

Ngày thực hiện: 2026-07-10

Trạng thái: **Đã triển khai, đang chờ browser verification**. Không đánh dấu hoàn thành khi chưa kiểm tra interaction/viewport thật.

Checkpoint trước implementation:

- Ref: `refs/codex/checkpoints/frontend-rebuild-before-p0-20260710-205524`
- Commit: `6e05682ca47ed64a3a7ab84c48cdff9b098907c2`

## FE-RB-003 — Product Detail

Đã triển khai:

- Chỉ tự chọn phân loại đầu tiên có `quantityAvailable > 0`; không fallback sang variant đầu tiên bất kể stock.
- Dùng `fieldset`, `legend` và native radio cùng group name.
- Phân loại hết hàng bị `disabled` và có text “Hết hàng”.
- Quantity controls bị vô hiệu hóa khi không có phân loại hợp lệ; icon action có accessible name và target 44 px.
- CTA và click handler đều kiểm tra variant, stock, số lượng nguyên dương, giới hạn tồn kho và mutation pending.
- Khi không có phân loại mua được, cả khách chưa đăng nhập cũng chỉ thấy CTA disabled “Sản phẩm đã hết hàng”.
- Payload giữ nguyên `{ productVariantId, quantity }`; không đổi endpoint, API type hoặc backend.

Regression logic nằm tại `frontend/tests/product-purchase-state.test.mjs`, bao phủ:

1. Variant đầu hết hàng, variant sau còn hàng.
2. Tất cả variant hết hàng.
3. Không có variant.
4. Số lượng hợp lệ, vượt tồn, bằng 0, không nguyên, variant hết hàng và null selection.

Backend public product hiện chỉ trả variant active có tồn khả dụng. Patch frontend vẫn giữ kiểm tra phòng thủ cho stale/refetch/contract-compatible response; backend cart tiếp tục là source of truth cuối cùng.

## FE-RB-004 — Modal

Đã triển khai tại shared `Modal` mà không đổi public props hoặc 20 consumer hiện có:

- `useId` cho title và `aria-labelledby` riêng từng instance.
- Initial focus vào nút đóng, focus trap cho Tab/Shift+Tab và trả focus về trigger còn tồn tại.
- Escape đóng dialog; listener dùng callback ref để không cleanup/re-focus khi consumer truyền `onClose` inline.
- Body scroll lock có reference count và phục hồi inline overflow trước đó.
- Panel dùng dynamic viewport max-height; header/footer không co; body là vùng cuộn độc lập.
- Footer hỗ trợ wrap; close button 44×44 px và có focus-visible ring.

Consumer rủi ro cao cần browser smoke: form ảnh sản phẩm, địa chỉ, đơn vị/dịch vụ vận chuyển và shipment/tracking.

## Verification đã chạy

| Command | Kết quả |
| --- | --- |
| `node --test tests/product-purchase-state.test.mjs` | Pass, 4/4 tests |
| `npm.cmd run lint` | Pass |
| `npm.cmd run build` | Pass, 2.033 modules |
| `npm.cmd exec -- oxlint --react-plugin --jsx-a11y-plugin ...` | Exit 0; còn warning khuyến nghị native `dialog`, không suppress |
| `npm.cmd test -- --runInBand src/modules/cart/cart.service.spec.ts` tại backend | Pass, 9/9 tests |

Build sau patch:

| Asset | Sau patch | Delta so baseline |
| --- | ---: | ---: |
| Main CSS | 19,77 kB; gzip 4,73 kB | +1,48 kB; gzip +0,23 kB |
| Main JS | 652,14 kB; gzip 185,88 kB | +2,82 kB; gzip +0,91 kB |

Vite vẫn cảnh báo chunk lớn hơn 500 kB; xử lý ở task lazy-route/performance, không thuộc safety patch.

## Browser verification còn thiếu

In-app browser discovery trả danh sách rỗng trong lượt kiểm tra này. Theo browser skill, không chuyển sang automation backend khác để lách giới hạn.

Khi browser khả dụng, cần kiểm tra:

- Product Detail: radio bằng Tab/arrow, variant hết hàng, all-out-of-stock, không variant, quantity boundary, pending double action và inline `OUT_OF_STOCK`.
- Modal: open/initial focus, Tab/Shift+Tab wrap, Escape, close button, focus restore và background scroll lock.
- Modal dài và confirm modal tại 320, 375, 390, 430, 768, 1024, 1280, 1440 px; zoom 200%; footer không bị che.
- Không có event listener/scroll lock rò rỉ sau nhiều lần mở/đóng.

Warning `prefer-tag-over-role` được giữ công khai. Quyết định chuyển sang native/headless dialog thuộc `FE-RB-005`/Dialog foundation; không đổi tag mù khi chưa có browser regression.
