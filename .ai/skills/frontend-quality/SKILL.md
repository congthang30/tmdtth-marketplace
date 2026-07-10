---
name: frontend-quality
description: "Triển khai và review chất lượng frontend React/TypeScript/Tailwind của TMDTTH. Áp dụng khi tạo, sửa hoặc refactor component, page, hook, state, API client, performance, SEO, testing và production readiness."
---

# Chất lượng frontend

## Mục tiêu

Giữ frontend type-safe, dễ bảo trì, accessible, responsive và sẵn sàng production mà không thay đổi business logic ngoài phạm vi.

## Khi nào áp dụng

- Tạo/sửa/refactor React component, page, hook, service, store hoặc style.
- Review architecture, performance, bundle, test, SEO hoặc quality gate.

## Nguyên tắc bắt buộc

- Đọc `../../rules/frontend-code-rules.md` và `../../rules/component-rules.md`.
- Tôn trọng stack hiện tại: React 19, TypeScript 6, React Router 7, TanStack Query, Zustand và Tailwind 3.
- Không dùng `any`, tắt rule, bỏ qua TypeScript hoặc sửa API contract để né lỗi.
- Giữ primitive UI độc lập business data; ưu tiên composition và typed variants.
- Không copy JSX/style lặp lại; page trên khoảng 300 dòng phải được đánh giá để tách theo trách nhiệm.
- Không hard-code URL, màu hoặc text lặp lại.
- Giữ query key ổn định, mutation chống double submit và lỗi được normalize.

## Quy trình thực hiện

1. Đọc file liên quan và xác định ownership dữ liệu/state.
2. Kiểm tra component inventory trước khi tạo component mới.
3. Chọn ranh giới UI/feature/page phù hợp.
4. Implement nhỏ nhất trong phạm vi, không refactor lan rộng.
5. Kiểm tra accessibility, responsive và Vietnamese content.
6. Chạy format, lint, type-check, test và build.
7. Ghi nhận warning/rủi ro không thuộc phạm vi.

## Checklist trước khi code

- [ ] Hiểu API contract, route, enum và business rule liên quan.
- [ ] Kiểm tra component/hook hiện hữu có thể tái sử dụng.
- [ ] Xác định loading/error/empty state.
- [ ] Xác định test cần cập nhật.

## Checklist sau khi code

- [ ] Không có `any`, console production, mock production hoặc URL/màu hard-code mới.
- [ ] Props, response và form được type đầy đủ.
- [ ] Không có logic/JSX trùng lặp đáng kể.
- [ ] Lint và TypeScript đạt.
- [ ] Test liên quan và build đạt.
- [ ] Bundle/performance không suy giảm rõ ràng.

## Những lỗi phải tránh

- Refactor hàng loạt ngoài mục tiêu.
- Tạo abstraction khi chỉ có một use case không ổn định.
- Đưa business query vào primitive UI.
- Dùng state cục bộ trùng với server state của TanStack Query.
- Xóa functionality để làm build đạt.

## Ví dụ đúng

```tsx
type StatusBadgeProps = { status: OrderStatus };
```

## Ví dụ sai

```tsx
function Widget(props: any) { console.log(props); return null; }
```

## Tiêu chí hoàn thành

- Thay đổi có type, test phù hợp, không phá contract và vượt mọi quality gate.
- Component đúng tầng kiến trúc, dùng token và tuân thủ accessibility/responsive/content rules.
