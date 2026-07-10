# Frontend Full Rebuild Execution Plan

Ngày tạo: 2026-07-10

Nguồn tham chiếu:

- `plan_frontend_mvp.md`
- `plan_schema_prisma_mvp_ecommerce.md`
- `.ai/ui-audit.md`
- `.ai/ui-implementation-plan.md`
- `.ai/design-system/`
- `.ai/rules/`
- `.ai/skills/`

Mục tiêu: rebuild toàn bộ lớp giao diện frontend TMDTTH theo design system mới, thay thế UI của tất cả route hiện có nhưng giữ nguyên React/Vite stack, URL, API contract, enum, authorization và business behavior đã hoàn thành trong MVP.

Phạm vi của lượt tạo tài liệu này chỉ là **lập kế hoạch**. Chưa sửa hoặc rebuild code trong `frontend/src`.

---

## 0. Tiến độ rebuild frontend

| Task ID | Trạng thái | Ngày | Ghi chú |
| --- | --- | --- | --- |
| FE-RB-PLAN | Hoàn thành | 2026-07-10 | Đã audit stack, route, API, page, component, responsive, accessibility và UX; tạo design system/rules/skills; lập kế hoạch rebuild trong file này. |
| FE-RB-00 | Đang thực hiện | 2026-07-10 | FE-RB-002 hoàn thành; FE-RB-001 đã có checkpoint. FE-RB-003/004 đã triển khai và pass logic/lint/build; còn visual/keyboard/browser matrix do in-app browser chưa khả dụng. |
| FE-RB-01 | Chưa bắt đầu | - | Design token, global style, typography và kiến trúc nền. |
| FE-RB-02 | Chưa bắt đầu | - | Rebuild UI primitives, feedback, form, dialog, table và commerce primitives. |
| FE-RB-03 | Chưa bắt đầu | - | Rebuild public/dashboard shell, auth và error routes. |
| FE-RB-04 | Chưa bắt đầu | - | Rebuild catalog, product detail và reviews. |
| FE-RB-05 | Chưa bắt đầu | - | Rebuild cart và checkout. |
| FE-RB-06 | Chưa bắt đầu | - | Rebuild customer account, addresses và orders. |
| FE-RB-07 | Chưa bắt đầu | - | Rebuild seller workspace. |
| FE-RB-08 | Chưa bắt đầu | - | Rebuild admin workspace. |
| FE-RB-09 | Chưa bắt đầu | - | Accessibility, responsive, performance, test, cleanup và cutover. |

Quy tắc cập nhật:

- Chỉ đánh dấu task `Hoàn thành` khi scope, acceptance và quality gate của task đều đạt.
- Mỗi task phải ghi ngày hoàn thành, file chính đã đổi và command xác minh.
- Không đánh dấu route hoàn thành nếu chỉ có happy path hoặc chỉ kiểm tra desktop.
- Không xóa UI cũ trước khi route thay thế đạt parity và có phương án rollback.
- Tính năng chưa có backend contract giữ trạng thái `Bị chặn`, không mock như production.

---

## 1. Baseline hiện tại

### 1.1 Stack được giữ nguyên

- React 19 + TypeScript 6 + Vite 8.
- React Router 7 cho route và guard.
- Axios cho API client.
- TanStack Query 5 cho server state.
- React Hook Form + Zod cho form.
- Zustand cho auth/client state dùng chung thực sự.
- Tailwind CSS 3 và CSS variables cho styling/token.
- Lucide React cho icon.
- npm là package manager.

Không chuyển sang Next.js, không thêm `"use client"`, không đổi router/state library trong rebuild nếu chưa có ADR và phê duyệt riêng.

### 1.2 Baseline chất lượng

- `npm.cmd run lint`: pass ngày 2026-07-10.
- `npm.cmd run build`: pass ngày 2026-07-10.
- Main JS bundle hiện tại: 649.32 kB minified, 184.97 kB gzip; Vite cảnh báo chunk lớn hơn 500 kB.
- Backend MVP và end-to-end business flow đã hoàn thành theo hai plan nguồn.
- Frontend chưa có test runner/component test/E2E browser trong `package.json`.
- Working tree có thay đổi chưa commit; phải checkpoint trước khi bắt đầu rebuild.

### 1.3 Vấn đề ưu tiên phải xử lý sớm

| ID | Mức độ | Hiện trạng | Yêu cầu rebuild |
| --- | --- | --- | --- |
| AUD-001 | P0 | Modal thiếu max-height/body scroll, focus trap/restore và scroll lock | Có safety patch trước; sau đó thay bằng Dialog foundation mới. |
| AUD-002 | P0 | Product Detail có thể chọn variant hết hàng và CTA chưa kiểm tra stock | Sửa ngay trước hoặc trong lát cắt Product Detail đầu tiên. |
| AUD-007/009/031 | P1 | Contrast/token thiếu và có class `primary-300` chưa được định nghĩa | Triển khai token bridge trước mọi component mới. |
| AUD-012/019/020 | P1 | Button/field/icon actions thiếu contract accessibility | Rebuild primitives trước page. |
| AUD-015/016/018 | P1 | Header, filter, product grid và purchase flow mobile yếu | Public/purchase route phải mobile-first. |
| AUD-003/014/017 | P1/P2 | Dashboard/table có partial-error và mobile strategy chưa đúng | Dùng shared StatCard/ResponsiveDataView. |
| AUD-033 | P2 | Router eager-load toàn bộ page | Chuyển sang lazy route modules. |

Chi tiết đầy đủ nằm tại `.ai/ui-audit.md`.

---

## 2. Phạm vi và nguyên tắc rebuild

### 2.1 In scope

- Thay toàn bộ visual layer của các route hiện có.
- Chuẩn hóa design tokens, typography, layout, icon và responsive behavior.
- Rebuild UI primitives và shared commerce/data components.
- Tách các page lớn theo feature/component responsibility.
- Giữ và tái sử dụng API client, API feature modules, types, auth guard và business integration đang đúng.
- Chuẩn hóa loading, empty, error, partial-error, disabled và success state.
- Route-level lazy loading, error boundary, metadata client-side và media optimization.
- Bổ sung test foundation, component/interaction test và critical-flow browser test sau khi dependency ADR được duyệt.
- Việt hóa tự nhiên toàn bộ user-facing content.
- Đạt responsive từ 320px đến 1440px và WCAG 2.2 AA phù hợp.

### 2.2 Out of scope

- Thay đổi Prisma schema, database, backend enum hoặc API response chỉ để thuận tiện cho UI.
- Đổi logic giá, tồn kho, shipping quote, checkout, payment, order hoặc permission.
- Chuyển sang SSR/Next.js. Nếu SEO public catalog cần SSR thật, tạo architecture task riêng sau rebuild.
- Dark mode khi chưa có yêu cầu Product.
- Logo pháp lý hoặc campaign artwork khi chưa có asset được duyệt.
- Các tính năng chưa có API/route: wishlist, notification, voucher hoạt động, flash sale, official store, freeship flag, Q&A, related products, search suggestions/history và buy-now trực tiếp.

### 2.3 Chiến lược được chọn

Rebuild **theo lát cắt trong app hiện tại**, không tạo `frontend-v2` song song:

1. Chốt baseline và contract.
2. Xây token và primitives mới.
3. Thay từng shell/route theo dependency order.
4. Giữ URL và API integration không đổi.
5. Chỉ xóa component cũ khi không còn consumer.
6. Cutover hoàn tất khi mọi route đạt parity và quality gate.

Lý do:

- Không phải duy trì hai API client, auth session và route tree.
- Cho phép review/rollback theo từng PR nhỏ.
- Không chặn luồng MVP đang hoạt động trong suốt rebuild.
- Giảm nguy cơ bỏ sót seller/admin flow khi “big bang”.

---

## 3. API capability và giới hạn dữ liệu

| Khu vực | Backend hỗ trợ hiện tại | UI được phép rebuild | Giới hạn phải giữ |
| --- | --- | --- | --- |
| Catalog | Category tree, product list/detail, search, category, price, sort, pagination | Header search, filter, grid, ProductCard, PDP | Không có brand/rating/location/freeship/official filter contract. |
| Product reviews | Review list có pagination; customer tạo review từ order item | Review list, create review, loading/empty/error | Không có aggregate rating/histogram; không tự tính toàn bộ từ một page. |
| Cart | List/add/update/select/delete; shop data có trong item | Group theo shop, quantity, item select, summary | Select-all không atomic; không hứa save-for-later/voucher. |
| Checkout | Address, payment methods, shipping services/quotes, server preview, create order | Address/payment/shipping selection, preview, final submit | Voucher trả `VOUCHER_NOT_SUPPORTED`; customer note chỉ cấp order. |
| Customer account | Profile và address CRUD/default | Profile, address list/form/dialog | Không có notification/preferences API. |
| Orders | History/detail/cancel, fake online payment, shipment tracking, review | Order list/detail/status/timeline/cancel/review | Fake payment là demo method; phải xác nhận environment policy trước production. |
| Seller shop | Get/register own shop | Shop status/register/dashboard hub | Không có analytics endpoint; lỗi query không được biến thành số 0. |
| Seller products | Product/variant/image/inventory CRUD và upload | Full seller product workflow | Variant option lưu JSON; UI builder phải serialize đúng payload. |
| Seller orders | List/detail/confirm/prepare/create shipment/update tracking | Order management và shipment workflow | Chỉ action theo transition backend cho phép. |
| Admin | Category/shop approval/shipping company/service management | Dashboard hub và CRUD screens | Không có analytics hoặc voucher management endpoint. |

Quy tắc dữ liệu:

- Response backend là source of truth cho giá, stock, totals, status và permission.
- Query URL là source of truth cho catalog filter/sort/page.
- Không tính “global rating”, “best seller”, “freeship” hoặc “official” nếu response không cung cấp.
- Test có thể dùng fixture, nhưng production code không chứa mock business data.

---

## 4. Kiến trúc frontend mục tiêu

```text
frontend/src/
  app/
    providers.tsx
    query-client.ts
    router/
      index.tsx
      route-error.tsx
      routes.ts
    styles/
      tokens.css
      globals.css
  components/
    ui/
      Button.tsx
      IconButton.tsx
      FieldShell.tsx
      TextInput.tsx
      SelectInput.tsx
      Textarea.tsx
      Checkbox.tsx
      RadioGroup.tsx
      Badge.tsx
      Alert.tsx
      Dialog.tsx
      Drawer.tsx
      Skeleton.tsx
      Spinner.tsx
      Pagination.tsx
      Table.tsx
    common/
      PageHeader.tsx
      EmptyState.tsx
      ErrorState.tsx
      QueryState.tsx
      ConfirmDialog.tsx
      FormDialog.tsx
      StatusBadge.tsx
      StatCard.tsx
    commerce/
      ProductGrid.tsx
      ProductCard.tsx
      ProductVisual.tsx
      PriceDisplay.tsx
      Rating.tsx
      VariantSelector.tsx
      QuantitySelector.tsx
      CartItem.tsx
      MoneySummary.tsx
      OrderItem.tsx
      ShipmentTimeline.tsx
    data-display/
      ResponsiveDataView.tsx
      ManagementTable.tsx
      DataTableToolbar.tsx
      RowActionMenu.tsx
    layout/
      PublicLayout.tsx
      MarketplaceHeader.tsx
      MobileNav.tsx
      DashboardLayout.tsx
      DashboardSidebar.tsx
      Footer.tsx
  features/
    auth/
    account/
    catalog/
    cart/
    checkout/
    orders/
    reviews/
    seller/
    admin/
  services/
    api.ts
    errors.ts
    system.ts
    token-storage.ts
  stores/
    auth.store.ts
    toast.store.ts
  types/
  utils/
  constants/
```

### 4.1 Ranh giới trách nhiệm

- `components/ui`: primitive thuần UI, không import feature API/type nghiệp vụ.
- `components/common`: composition dùng chung nhưng không điều phối API.
- `components/commerce`: presentational commerce component nhận typed props.
- `features/*`: API, query/mutation, schema, feature component và page orchestration.
- TanStack Query quản lý server state; không sao chép response vào Zustand.
- Zustand giữ auth session và global UI state có nhu cầu thật.
- React Hook Form + Zod quản lý form; backend validation vẫn được normalize/display.
- Shared formatter/status mapping là nguồn duy nhất cho tiền, ngày và nhãn enum.

### 4.2 Styling

- `tokens.css` chứa canonical CSS variables từ `.ai/design-system/design-tokens.md`.
- Tailwind theme chỉ bridge tới variables, không lặp hex.
- `background` là page background; `surface` là card/dialog trắng.
- Không dùng arbitrary brand/semantic color trong page.
- Không thêm token target-state vào JSX trước khi Tailwind/CSS đã triển khai.

### 4.3 Routing và loading

- Route modules dùng lazy import theo public/account/seller/admin boundary.
- Mỗi route có loading fallback và error boundary phù hợp.
- `ProtectedRoute` và `RoleRoute` giữ behavior hiện tại.
- 401/403/404 phải phân biệt, không redirect loop.
- Public shell không gọi/hiển thị API health cho người mua.

---

## 5. Route rebuild matrix

| Route | Màn hình mục tiêu | Phase | API chính | Trạng thái |
| --- | --- | --- | --- | --- |
| `/` | Catalog discovery mặc định; không dựng marketing homepage giả | FE-RB-04 | `GET /products`, `/categories` | Chưa bắt đầu |
| `/products` | Catalog/search/filter/sort/product grid | FE-RB-04 | `GET /products`, `/categories` | Chưa bắt đầu |
| `/products/:slug` | Product detail/gallery/variant/stock/reviews/add-cart | FE-RB-04 | `GET /products/:slug`, reviews, cart | Chưa bắt đầu |
| `/login` | Login | FE-RB-03 | `POST /auth/login`, `GET /auth/me` | Chưa bắt đầu |
| `/register` | Register | FE-RB-03 | `POST /auth/register` | Chưa bắt đầu |
| `/cart` | Cart grouped by shop và summary | FE-RB-05 | Cart endpoints | Chưa bắt đầu |
| `/checkout` | Address/payment/shipping/preview/order | FE-RB-05 | Addresses, payment, shipping, orders | Chưa bắt đầu |
| `/dashboard` | Role-aware navigation hub; không fake analytics | FE-RB-06 | Auth/profile + route capability | Chưa bắt đầu |
| `/profile` | Profile view/update | FE-RB-06 | `GET/PATCH /users/me` | Chưa bắt đầu |
| `/addresses` | Address CRUD/default | FE-RB-06 | Address endpoints | Chưa bắt đầu |
| `/orders` | Customer order history | FE-RB-06 | `GET /orders/my` | Chưa bắt đầu |
| `/orders/:id` | Order/payment/shipment/review/cancel | FE-RB-06 | Order/payment/review endpoints | Chưa bắt đầu |
| `/seller` | Seller shop status và task hub | FE-RB-07 | `GET /shops/me`, seller lists | Chưa bắt đầu |
| `/seller/shop/register` | Shop registration/status | FE-RB-07 | Shop endpoints | Chưa bắt đầu |
| `/seller/products` | Seller product list | FE-RB-07 | Seller products | Chưa bắt đầu |
| `/seller/products/create` | Create product | FE-RB-07 | Seller products/categories/shop | Chưa bắt đầu |
| `/seller/products/:id/edit` | Edit/delete product | FE-RB-07 | Seller products | Chưa bắt đầu |
| `/seller/products/:id/variants` | Variant CRUD và option builder | FE-RB-07 | Seller variants | Chưa bắt đầu |
| `/seller/products/:id/images` | Upload/image manager | FE-RB-07 | Uploads/product images | Chưa bắt đầu |
| `/seller/products/:id/inventory` | Inventory by variant | FE-RB-07 | Inventory endpoints | Chưa bắt đầu |
| `/seller/orders` | Seller order list | FE-RB-07 | Seller orders | Chưa bắt đầu |
| `/seller/orders/:id` | Confirm/prepare/shipment/tracking | FE-RB-07 | Seller order/shipment endpoints | Chưa bắt đầu |
| `/admin` | Admin task hub; partial error rõ | FE-RB-08 | Admin list endpoints | Chưa bắt đầu |
| `/admin/categories` | Category management | FE-RB-08 | Admin categories | Chưa bắt đầu |
| `/admin/shops` | Shop approval/rejection | FE-RB-08 | Admin shops | Chưa bắt đầu |
| `/admin/shipping/companies` | Shipping company management | FE-RB-08 | Admin shipping companies | Chưa bắt đầu |
| `/admin/shipping/services` | Shipping service management | FE-RB-08 | Admin shipping services | Chưa bắt đầu |
| `/forbidden` | Branded accessible 403 | FE-RB-03 | Không cần API | Chưa bắt đầu |
| `/not-found`, `*` | Branded accessible 404 | FE-RB-03 | Không cần API | Chưa bắt đầu |

---

## 6. Backlog chi tiết

## FE-RB-00 - Baseline, contract và safety

Status: Đang thực hiện

Tài liệu thực thi:

- [Baseline FE-RB-001](.ai/rebuild/baseline.md)
- [Contract manifest FE-RB-002](.ai/rebuild/contract-manifest.md)
- [Contract hashes FE-RB-002](.ai/rebuild/contract-hashes.md)
- [Safety verification FE-RB-003/004](.ai/rebuild/p0-safety-verification.md)

### FE-RB-001 - Checkpoint và baseline

Scope:

- Ghi nhận toàn bộ worktree hiện tại; không reset thay đổi chưa commit.
- Tạo branch/checkpoint phù hợp trước implementation.
- Chạy lint/build và ghi bundle baseline.
- Chụp baseline các route chính ở desktop/mobile để so parity.

Acceptance:

- Có checkpoint có thể quay lại mà không mất thay đổi.
- Route/API/page inventory khớp code hiện tại.
- Baseline lint/build và bundle size được ghi vào bảng tiến độ.

Kết quả ngày 2026-07-10: Đang thực hiện. Đã ghi Git/source/dependency baseline, chạy lint/build và tạo checkpoint ref không đổi branch/index/worktree. Chưa chụp được ảnh route vì in-app browser không khả dụng; xem `.ai/rebuild/baseline.md`.

### FE-RB-002 - Freeze route/API contract

Scope:

- Lập route manifest và API capability map từ code thật.
- Ghi query keys, mutation invalidation, auth/role behavior và enum mapping cần giữ.
- Đánh dấu feature blocked do thiếu backend.

Acceptance:

- Mỗi route trong section 5 có API, permission và expected states.
- Không có plan task dựa trên field/endpoint không tồn tại.

Kết quả ngày 2026-07-10: Hoàn thành. Route, endpoint, role/guard, query key, invalidation, enum/transition, dữ liệu được hỗ trợ và capability bị chặn đã được đóng băng trong `.ai/rebuild/contract-manifest.md`; hash của các file contract nằm trong `.ai/rebuild/contract-hashes.md`.

### FE-RB-003 - Safety patch Product Detail P0

Scope:

- Không auto-select variant hết hàng.
- Disable variant hết hàng với text rõ và radio semantics.
- CTA kiểm tra selected variant, stock và pending state.

Acceptance:

- Không thể gửi add-cart cho variant `quantityAvailable < 1` từ UI.
- Payload và API contract không đổi.
- Có regression test cho available/out-of-stock/no-variant.

Kết quả ngày 2026-07-10: Đã triển khai, đang chờ browser verification. Logic regression `node:test` pass 4/4; frontend lint/build pass; backend cart test pass 9/9. Native radio, disabled/out-of-stock text và CTA/handler guard đã có; payload không đổi. Chưa đánh dấu hoàn thành vì chưa kiểm tra keyboard/interaction trên browser thật.

### FE-RB-004 - Safety patch Modal P0

Scope:

- Bổ sung max-height, body scroll, footer truy cập được trên mobile.
- Bổ sung unique IDs, focus trap/restore, Escape và scroll lock.

Acceptance:

- Mọi modal hiện có dùng được ở 320px và chỉ bằng keyboard.
- Focus trở về trigger sau khi đóng.

Kết quả ngày 2026-07-10: Đã triển khai, đang chờ browser verification. Shared Modal đã có max-height/body scroll/footer cố định, unique IDs, initial/trap/restore focus, Escape và scroll lock mà không đổi 20 consumer. Lint/build pass; chưa đánh dấu hoàn thành vì in-app browser chưa khả dụng để kiểm tra toàn bộ viewport/keyboard matrix.

### FE-RB-005 - Test/dependency ADR

Scope:

- Chọn test runner, React interaction test, browser E2E và accessibility automation.
- Đánh giá có cần headless UI primitive dependency cho Dialog/Drawer/Menu hay tiếp tục custom.
- Mọi dependency mới phải ghi bundle/maintenance/accessibility tradeoff.

Acceptance:

- Có ADR được phê duyệt trước khi thêm dependency.
- Có scripts dự kiến cho unit/component/E2E/a11y.

---

## FE-RB-01 - Brand và UI foundation

Status: Chưa bắt đầu

Scope:

- Implement CSS variables/Tailwind bridge từ design tokens.
- Tách `background`, `surface`, text, border và semantic colors.
- Load Inter Vietnamese subset với `font-display: swap`.
- Implement typography, spacing, radius, shadow, focus và reduced-motion base.
- Chuẩn hóa global reset, body, link, image, form và selection styles.
- Tách query client/router setup; chuẩn bị lazy routes và route error boundary.
- Tạo centralized format/status/content mapping.

Acceptance:

- Không còn class token chưa định nghĩa như `primary-300`.
- Token contrast đạt WCAG AA trên tổ hợp thật.
- Tailwind không chứa nguồn hex thứ hai cho cùng token.
- Font tải đúng Vietnamese glyph, không có FOIT nghiêm trọng.
- Build/lint pass; không thay behavior route/API.

Risks:

- Đổi nghĩa `surface` có ảnh hưởng diện rộng; dùng alias/migration có thời hạn.
- Không rewrite toàn bộ class bằng search-replace thiếu ngữ cảnh.

---

## FE-RB-02 - Component system

Status: Chưa bắt đầu

### FE-RB-201 - Action primitives

- Rebuild Button, ButtonLink và IconButton dùng chung variant/size/loading recipe.
- Variant: primary, secondary, outline, ghost, destructive, link/icon.
- Target chạm tối thiểu 44x44px; focus-visible; loading không đổi chiều rộng.

Acceptance: semantics button/link đúng, disabled/loading/keyboard/focus test pass.

### FE-RB-202 - Form primitives

- Tạo FieldShell/FormField, TextInput, SelectInput, Textarea, Checkbox và RadioGroup.
- Stable IDs, label, helper, required, error, readonly, disabled, `aria-invalid` và `aria-describedby`.

Acceptance: RHF/Zod integration không đổi payload; focus lỗi đầu tiên hợp lý; autofill/paste hoạt động.

### FE-RB-203 - Overlay primitives

- Rebuild Dialog; tạo Drawer, ConfirmDialog, FormDialog và RowActionMenu khi có consumer.
- Dùng cùng focus/scroll foundation.

Acceptance: keyboard/focus/zoom/mobile pass; destructive action có context và pending/error inline.

### FE-RB-204 - Feedback primitives

- Rebuild Alert, Badge, Toast, Skeleton, Spinner, EmptyState, ErrorState và QueryState.
- Phân biệt loading/empty/error/partial-error/refetch.

Acceptance: live region đúng mức độ; reduced motion; recoverable error có retry; lỗi quan trọng không toast-only.

### FE-RB-205 - Layout/data primitives

- Tạo Container, Panel, PageHeader, Pagination, Table, ResponsiveDataView, ManagementTable, DataTableToolbar và StatCard.

Acceptance: table semantic; tiền/số căn phải; mobile có card/scroll strategy; partial error không biến thành `0`.

### FE-RB-206 - Commerce primitives

- Tạo ProductGrid, ProductCard, ProductVisual, PriceDisplay, Rating, VariantSelector, QuantitySelector, CartItem, MoneySummary, OrderItem, StatusBadge và ShipmentTimeline.

Acceptance: chỉ render metadata có thật; giá/stock/status theo props typed; ProductCard cân bằng, title hai dòng, không quá ba badge.

Quality gate Phase 02:

- Component/interaction tests cho mọi primitive tương tác.
- Keyboard/focus/contrast/reduced-motion pass.
- Không primitive nào import feature API/store nghiệp vụ.
- Lint/build pass.

---

## FE-RB-03 - App shell, auth và error routes

Status: Chưa bắt đầu

Scope:

- Rebuild PublicLayout với MarketplaceHeader, search chính, cart/account và mobile navigation.
- Bỏ API health badge khỏi public header.
- Rebuild DashboardLayout với sidebar desktop và drawer mobile, nhóm Customer/Seller/Admin.
- Rebuild Login, Register, logout/session loading và route guards presentation.
- Rebuild 403, 404 và route-level error boundary.
- Lazy-load public/account/seller/admin route groups.

Acceptance:

- Mọi chức năng navigation thiết yếu truy cập được ở 320px.
- Role menu và guard behavior giữ nguyên; 401/403 không redirect loop.
- Auth forms accessible, chống double submit và giữ input khi server lỗi.
- Public route không tải eager toàn bộ seller/admin page.
- Header/sticky elements không che focus hoặc content.

---

## FE-RB-04 - Public catalog, PDP và reviews

Status: Chưa bắt đầu

### Catalog

- `/` và `/products` dùng chung catalog route model.
- Search/category/min-max price/sort/order/page đọc và ghi URL.
- Desktop filter panel/toolbar; mobile filter Drawer; active filter chips và reset.
- Product grid 2 cột mobile, 3 tablet, 4 desktop vừa, 5–6 khi card đủ rộng.
- Loading skeleton, category partial error, product error, filtered empty và retry.

### Product detail

- Breadcrumb, gallery, product/shop/category info, PriceDisplay, variant, quantity, stock và add-cart.
- Variant hết hàng disabled; CTA không hoạt động khi invalid.
- Mobile purchase action dễ truy cập nhưng không che content.
- Không thêm buy-now, wishlist, shipping estimate hoặc official/freeship nếu không có contract.

### Reviews

- Paginated review list và create review flow ở order detail.
- Không hiển thị global average/histogram khi API chưa cung cấp aggregate.

Acceptance:

- Public user browse catalog/detail không cần login.
- URL filter share/reload vẫn giữ state.
- Authenticated customer add variant còn hàng vào cart.
- 320–1440px, keyboard, image fallback và async states pass.
- Ảnh dưới fold lazy load, có aspect ratio/dimensions để giảm CLS.

---

## FE-RB-05 - Cart và checkout

Status: Chưa bắt đầu

### Cart

- Group item theo shop từ response hiện có.
- Item selection, quantity, delete, stock/price signals và MoneySummary.
- Reuse QuantitySelector; delete có accessible label/confirm phù hợp.
- Không thêm save-for-later hoặc voucher.

### Checkout

- Tách AddressSelector, PaymentMethodSelector, ShippingOption, CheckoutItems và CheckoutSummary.
- Quote shipping theo từng shop, hiển thị ETA/fee/expires state.
- Server checkout preview là nguồn totals; hiển thị `priceChanged`, out-of-stock và quote expired.
- Chống double submit; create order một lần; lỗi quan trọng inline.
- Desktop summary sticky có giới hạn; mobile bottom action có safe-area và không che keyboard.

Acceptance:

- Luồng cart → preview → create order dùng API thật và không hardcode ID.
- Tổng tiền/discount/shipping khớp server response.
- Quote hết hạn hoặc item thay đổi có recovery path.
- Không gửi order hai lần khi click/Enter liên tiếp.
- Critical purchase E2E pass ở desktop và mobile viewport.

---

## FE-RB-06 - Customer account và orders

Status: Chưa bắt đầu

Scope:

- `/dashboard`: role-aware task hub, không fake analytics.
- `/profile`: view/update, sync auth store sau thành công.
- `/addresses`: list/create/edit/default/delete với FormDialog accessible.
- `/orders`: responsive history, pagination, status và empty/error/retry.
- `/orders/:id`: order/shop groups, payment, shipment timeline, cancel flow và review flow.
- Fake online success chỉ hiển thị cho method `FAKE_ONLINE`; xác nhận policy trước production deployment.

Acceptance:

- Profile/address mutation giữ data khi lỗi và invalidate đúng query.
- Order snapshots hiển thị đúng; không truy ngược product hiện tại để thay snapshot.
- Cancel/review/payment action chỉ hiện khi backend state cho phép.
- Payment/shipment/status update refetch đúng và có partial error.
- Mobile order detail không tràn hoặc mất action.

---

## FE-RB-07 - Seller workspace

Status: Chưa bắt đầu

### Seller shell và shop

- Dashboard task hub và shop status.
- Register shop form, pending/approved/rejected states từ API.

### Product management

- Product list với responsive management view và row action menu.
- Product create/edit form.
- VariantOptionBuilder thay nhập JSON thô; serialize `variantOptionJson` đúng payload.
- Image upload/library/thumbnail/order/alt text.
- Inventory by variant, quantity/reserved/available/threshold rõ.

### Order và shipment

- Seller order list/detail.
- Confirm/prepare theo allowed transition.
- Create shipment, service selection và tracking update/timeline.

Acceptance:

- Seller chỉ thấy/chỉnh data thuộc shop của mình; guard/API behavior không đổi.
- Không cần hardcode shop/product/variant/shipping IDs.
- Form và upload có loading/progress/error/retry hợp lý.
- Variant builder round-trip JSON không mất dữ liệu.
- Invalid order/shipment transition hiển thị message và không optimistic sai.
- Tất cả seller routes dùng được ở mobile, table chuyển responsive representation.

---

## FE-RB-08 - Admin workspace

Status: Chưa bắt đầu

Scope:

- Admin dashboard task hub và partial error per widget.
- Category tree/list/create/edit/deactivate.
- Shop list/filter/status/approve/reject với reason dialog.
- Shipping company list/create/edit/delete.
- Shipping service list/filter company/create/edit/deactivate.
- Dùng ManagementTable, DataTableToolbar, StatusBadge, FormDialog và ConfirmDialog.

Acceptance:

- Admin-only routes giữ guard; non-admin nhận 403.
- List có loading/empty/error/pagination; filter/sort chỉ dùng tham số API hỗ trợ.
- Không báo `0` khi query lỗi.
- Status có text + semantic tone; destructive action có target/context rõ.
- Mobile không chỉ co table desktop; primary actions vẫn truy cập được.

Voucher management không thuộc phase này vì backend chưa có endpoint.

---

## FE-RB-09 - Hardening, cleanup và cutover

Status: Chưa bắt đầu

### Responsive gate

- Test `320, 375, 390, 430, 768, 1024, 1280, 1440px` cho mọi route.
- Không body overflow, hidden CTA, modal vượt viewport hoặc sticky che content.
- Text tiếng Việt dài, số lớn, ảnh lỗi và zoom 200% không phá layout.

### Accessibility gate

- Keyboard-only, focus order/visibility, semantic landmarks/headings.
- Dialog/Drawer/Menu focus management.
- Form error association và live regions.
- Contrast WCAG 2.2 AA; reduced motion.
- Automated scan kết hợp manual screen-reader smoke cho critical flows.

### Performance gate

- Lazy route groups; không còn Vite chunk >500 kB warning nếu có thể tách hợp lý.
- So bundle/LCP/CLS với baseline đã ghi ở FE-RB-001.
- Optimize font, product images và uploads preview.
- Không memoization/virtualization nếu chưa đo được bottleneck.

### SEO/client metadata gate

- Document title/description theo route, brand name nhất quán.
- Product structured data chỉ khi field thật đủ và scope SEO được duyệt.
- Không tuyên bố SPA đạt SSR SEO; prerender/SSR là task kiến trúc riêng.

### Cleanup/cutover

- Xóa component/style/asset starter không còn reference sau `rg` và build verification.
- Xóa legacy component chỉ khi toàn bộ consumer đã migrate.
- Cập nhật `frontend/README.md`, route/component docs và progress table.
- Chạy full critical E2E với backend/database thật.

Acceptance:

- Mọi route trong section 5 đạt parity và visual target.
- Không còn P0/P1 accessibility/responsive issue đã biết.
- Lint, TypeScript/build, component tests và browser E2E pass.
- Main business acceptance flow Admin → Seller → Customer → Seller shipping → Customer review pass.
- Có rollback checkpoint và release notes.

---

## 7. PR và migration rules

- Mỗi PR chỉ nên chứa một foundation slice hoặc một route group có liên quan.
- Không refactor API/domain logic và visual layout lớn trong cùng PR nếu không bắt buộc.
- Thay page internals dưới route hiện tại; không tạo URL `v2` public.
- Legacy/new component chỉ cùng tồn tại ngắn hạn; ghi owner và task xóa.
- Không đổi query key/invalidation mà không có regression test.
- Không dùng screenshot đẹp làm bằng chứng duy nhất; phải kiểm tra interaction và data states.
- Mỗi PR cập nhật task status trong file này sau khi quality gate đạt.

Thứ tự review trong PR:

1. API/permission/business parity.
2. Loading/empty/error/partial-error behavior.
3. Keyboard/accessibility.
4. Responsive/mobile.
5. Visual/token consistency.
6. Performance và test.

---

## 8. Definition of Ready

Một task chỉ bắt đầu khi:

- Route/use case và API contract đã được đọc từ code thật.
- Xác định rõ data có/không có; không dựa trên mock production.
- Dependency component đã hoàn thành hoặc có plan cụ thể.
- Có acceptance cho loading/empty/error/success và permission.
- Có viewport, keyboard và test scope.
- Không chồng lên thay đổi chưa commit của task khác.

---

## 9. Definition of Done cho mỗi route

- Dùng design tokens đã triển khai, không hard-code brand/semantic color mới.
- Không đổi API payload/enum/business behavior.
- Happy path và validation/business error path hoạt động với backend thật.
- Loading, empty, error, partial-error, disabled và success phù hợp.
- Keyboard/focus/accessible name/error association đạt.
- Responsive pass ở các viewport liên quan, tối thiểu 320/768/1280/1440px trong PR và full matrix ở Phase 09.
- Nội dung tiếng Việt tự nhiên; không lộ key/error kỹ thuật.
- Không có dead action hoặc feature chưa được backend hỗ trợ.
- Lint/build và tests liên quan pass.
- Không làm bundle/performance suy giảm không giải thích.

---

## 10. Quality gates

Frontend baseline:

```powershell
cd frontend
npm.cmd run lint
npm.cmd run build
```

Sau FE-RB-005, bổ sung scripts đã được duyệt cho:

- Unit tests.
- Component/interaction tests.
- Browser E2E critical flows.
- Accessibility automation.
- Bundle report khi cần.

Backend gates chỉ bắt buộc nếu một task được phê duyệt riêng để sửa backend:

```powershell
cd backend
npm.cmd run build
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
npm.cmd run lint
npm.cmd run prisma:validate
```

Không sửa backend trong rebuild UI nếu chưa chứng minh blocker và được mở rộng scope.

---

## 11. Implementation order

1. FE-RB-001 và FE-RB-002: checkpoint + contract freeze.
2. FE-RB-003 và FE-RB-004: safety P0.
3. FE-RB-005: test/dependency ADR.
4. FE-RB-01: token/global foundation.
5. FE-RB-02: primitives và commerce components.
6. FE-RB-03: shell/auth/error/lazy routes.
7. FE-RB-04: catalog/PDP/reviews.
8. FE-RB-05: cart/checkout.
9. FE-RB-06: account/orders.
10. FE-RB-07: seller.
11. FE-RB-08: admin.
12. FE-RB-09: full hardening, cleanup và cutover.

Rationale:

- Safety issues được gỡ trước khi rebuild kéo dài.
- Token và primitives được chốt trước page để tránh rewrite lần hai.
- Public discovery và purchase flow chứng minh giá trị sớm.
- Account/order dùng lại purchase components.
- Seller/Admin dùng shared form/table/status foundation sau cùng.
- Full cleanup chỉ làm sau parity để luôn có rollback.

---

## 12. Decision log và blockers

| Decision ID | Trạng thái | Quyết định/Blocker | Default của plan |
| --- | --- | --- | --- |
| DEC-FE-01 | Đã chọn | Rebuild in-place hay app v2 song song | In-place theo route slice. |
| DEC-FE-02 | Đã chọn | Giữ hay đổi frontend stack | Giữ React/Vite/Router/Query/RHF/Zustand/Tailwind. |
| DEC-FE-03 | Đã chọn | Dark mode | Ngoài scope. |
| DEC-FE-04 | Cần xác nhận | Tên chính thức “TMDTTH Marketplace” hay “Công Thắng” | Dùng “TMDTTH Marketplace” làm working name. |
| DEC-FE-05 | Cần ADR | Test runner/browser/a11y tools | Không thêm dependency trước FE-RB-005. |
| DEC-FE-06 | Cần ADR | Custom hay headless primitives cho Dialog/Drawer/Menu | Ưu tiên ít dependency; quyết định bằng accessibility spike. |
| DEC-FE-07 | Cần xác nhận | `FAKE_ONLINE` có xuất hiện ngoài demo/dev không | Chỉ render khi method API trả về; production policy phải được chốt. |
| DEC-FE-08 | Bị chặn | Wishlist/notification/voucher/flash sale/official/freeship/buy-now | Không triển khai trước API/Product scope. |
| DEC-FE-09 | Bị chặn | Marketing homepage/CMS banners | `/` tiếp tục là catalog cho đến khi có dữ liệu thật. |
| DEC-FE-10 | Cần xác nhận | Backend cho phép `POST /shops` với mọi tài khoản đã đăng nhập nhưng frontend chặn `/seller/shop/register` cho role `Customer` | Không tự đổi guard/role; cần chốt luồng nâng role hoặc quyền truy cập đăng ký shop trước khi rebuild seller onboarding. |
| DEC-FE-11 | Cần backend decision | Frontend gửi lý do từ chối shop nhưng backend hiện không lưu hoặc sử dụng `reason` | Không tuyên bố lý do đã được lưu; giữ contract hiện tại cho đến khi backend được mở rộng scope. |

---

## 13. Task đầu tiên đề xuất

Bắt đầu bằng **FE-RB-001 + FE-RB-002** trong một PR chỉ chứa baseline/documentation, sau đó tạo safety PR cho **FE-RB-003 + FE-RB-004**.

Không bắt đầu thay màu hoặc viết lại page trước checkpoint/contract freeze. Sau safety patch, triển khai FE-RB-01 theo thứ tự:

1. `tokens.css` và Tailwind bridge.
2. Global typography/focus/reduced-motion.
3. Button/IconButton.
4. FieldShell và form controls.
5. Dialog/Drawer foundation.

Đây là lát cắt nhỏ nhất mở đường cho toàn bộ rebuild mà vẫn giữ ứng dụng chạy được sau mỗi bước.
