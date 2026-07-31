# TMDTTH agent instructions

## Scope và thứ tự ưu tiên

1. Giữ nguyên schema, API contract, enum, authorization và business behavior trong code/backend hiện hành, trừ khi task nói rõ phải đổi.
2. Tôn trọng phạm vi MVP trong `promt.md`, `plan_frontend_mvp.md` và README của frontend/backend.
3. Với mọi thay đổi giao diện, đọc rule tương ứng trong `.ai/rules/` và design source trong `.ai/design-system/`.
4. `.ai/design-system/` mô tả cả hiện trạng lẫn **target state**. Không dùng token/component chưa triển khai chỉ vì đã xuất hiện trong tài liệu; kiểm tra inventory/plan trước.
5. `.ai/ui-audit.md` là bằng chứng audit; `.ai/ui-implementation-plan.md` là backlog, không tự cấp quyền mở rộng task.

Không rebuild toàn bộ UI, không thêm mock production và không tạo CTA/route cho feature chưa có contract. Wishlist, notification, voucher, flash sale, official store, freeship, Q&A, related product và search suggestion chỉ được triển khai khi API/Product scope cung cấp dữ liệu và hành vi thật.

## Skill routing

Trước khi code hoặc review UI, đọc đầy đủ skill phù hợp:

| Phạm vi | Skill |
| --- | --- |
| Catalog, product, cart, checkout, order UI | `.ai/skills/ecommerce-ui/SKILL.md` |
| Mọi UI storefront/ecommerce, API commerce, SEO | `.ai/skills/storefront-best-practices/SKILL.md` |
| Discovery, multi-seller, trust, conversion | `.ai/skills/marketplace-ux/SKILL.md` |
| Breakpoint, mobile, table/drawer/sticky | `.ai/skills/responsive-ui/SKILL.md` |
| Keyboard, focus, form, dialog, contrast | `.ai/skills/accessibility/SKILL.md` |
| Chuỗi hiển thị và microcopy tiếng Việt | `.ai/skills/vietnamese-content/SKILL.md` |
| Architecture, TypeScript, performance, test | `.ai/skills/frontend-quality/SKILL.md` |

Một task thường cần nhiều skill; chỉ đọc những skill liên quan và tuân theo tất cả rule được chúng dẫn chiếu.

## Convention kỹ thuật

- Frontend là React 19 + React Router + Vite + TypeScript + Tailwind, không phải Next.js. Không thêm `"use client"` hoặc áp dụng server/client component convention của Next.js.
- Ưu tiên shared primitive hiện có và migration theo component; xem `.ai/design-system/component-inventory.md` trước khi tạo mới.
- UI primitive không phụ thuộc business schema. Feature giữ query/mutation/permission gần domain.
- Dùng Lucide, semantic HTML, focus visible, accessible names và target chạm tối thiểu 44×44px.
- Mọi async UI có loading, empty/error hoặc partial-error phù hợp; lỗi quan trọng không chỉ báo bằng toast.
- Nội dung user-facing dùng tiếng Việt tự nhiên; không hiển thị key/error code kỹ thuật.
- Không hard-code brand/semantic colors mới. Giá trị chuẩn nằm tại `.ai/design-system/design-tokens.md` và chỉ dùng sau khi token tương ứng đã được triển khai.

## Quality gate

Trong phạm vi thay đổi, chạy lint, TypeScript/build và test liên quan. Với UI, kiểm tra tối thiểu 320, 375, 390, 430, 768, 1024, 1280 và 1440px; keyboard/focus; loading/empty/error; contrast và reduced motion khi có animation.
