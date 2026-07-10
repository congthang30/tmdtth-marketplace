# Ví dụ áp dụng design system

> Các ví dụ thể hiện target state sau khi token Phase 1 đã được triển khai; không copy class chưa tồn tại vào production hiện tại.

## Button

Đúng — semantics, state và token rõ:

```tsx
<Button variant="primary" loading={mutation.isPending} disabled={!canSubmit}>
  Xác nhận đơn hàng
</Button>
```

Sai — hard-code màu, không disabled/loading:

```tsx
<button className="rounded-full bg-[#ee4d2d]" onClick={submit}>Mua</button>
```

## Field error

Đúng:

```tsx
<label htmlFor="phone">Số điện thoại</label>
<input
  id="phone"
  aria-invalid={Boolean(errors.phone)}
  aria-describedby={errors.phone ? "phone-error" : "phone-help"}
/>
<p id="phone-error" role="alert">Số điện thoại chưa đúng định dạng.</p>
```

Sai:

```tsx
<input placeholder="Số điện thoại" className="border-red-500" />
```

## Product metadata có điều kiện

Đúng:

```tsx
{product.freeShipping === true ? (
  <Badge tone="freeship">Miễn phí vận chuyển</Badge>
) : null}
```

Sai:

```tsx
<Badge>Miễn phí vận chuyển</Badge> // API không có trường này
```

## Async state

```tsx
if (query.isPending) return <ProductGridSkeleton count={10} />;
if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
if (!query.data.items.length) return <EmptyState title="Chưa có sản phẩm phù hợp" />;
return <ProductGrid products={query.data.items} />;
```

Không trả một mảng trống như success mà không có empty state; không hiển thị stack trace hoặc key kỹ thuật.

## Responsive grid

Đúng — giữ card đủ rộng và tăng mật độ theo viewport:

```tsx
<ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
  {products.map((product) => <ProductCard key={product.id} product={product} />)}
</ul>
```

Các breakpoint phải được test với nội dung thật; ví dụ không thay thế acceptance tại [`layouts.md`](layouts.md).

## Semantic token bridge

Target CSS:

```css
:root { --color-primary: #0f66ad; }
.focus-ring:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
```

Target Tailwind mapping phải trỏ thẳng tới variables như hướng dẫn trong [`design-tokens.md`](design-tokens.md). Chỉ dùng `rgb(var(...)/<alpha-value>)` nếu token đã được chuẩn hóa thành RGB channels; không duy trì hai giá trị hex khác nhau giữa CSS và config.

## Microcopy

Đúng: “Không thể tải sản phẩm. Kiểm tra kết nối rồi thử lại.”

Sai: “Something went wrong”, “ERR_PRODUCT_500” hoặc “Có lỗi!!!”.

Xem thêm [`../rules/content-rules.md`](../rules/content-rules.md) và skill [`../skills/vietnamese-content/SKILL.md`](../skills/vietnamese-content/SKILL.md).
