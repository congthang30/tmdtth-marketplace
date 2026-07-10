# UI implementation plan

> Kế hoạch này **không tự cấp quyền triển khai**. Trạng thái hiện tại của mọi task là chưa làm hoặc bị chặn. Mỗi PR phải giữ nguyên schema/API/permission/business logic trừ khi có scope riêng được duyệt.

## Quy ước

- Dependency dùng ID task; audit issue dùng `AUD-*` trong [`ui-audit.md`](ui-audit.md).
- Token trong [`design-system/design-tokens.md`](design-system/design-tokens.md) là target state cho đến khi PLAN-102 hoàn tất.
- “Conditional” nghĩa là chỉ render khi response có trường/dữ liệu thật.
- “Bị chặn — cần API/Product” nghĩa là **ngoài phạm vi UI hiện tại**; không mock, không tạo route/CTA giả.
- Mỗi task chạy lint, type-check/build và test tỷ lệ với rủi ro; task P0 cần browser + keyboard regression.

## Phase 1: Brand foundation

| ID | Mục tiêu | File liên quan | Dependency | Acceptance criteria | Ưu tiên | Rủi ro | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PLAN-101 | Chốt tên và asset thương hiệu | `frontend/index.html`, `public/favicon.svg`, `PublicLayout.tsx`, asset mới được phê duyệt | Product Owner cung cấp/chốt tên, logo | Một tên nhất quán; logo SVG/fallback accessible; không còn favicon Vite; không copy marketplace khác | P2 | Trung bình: rename/SEO | Chưa bắt đầu — cần quyết định Product |
| PLAN-102 | Triển khai color tokens và Tailwind bridge | `tailwind.config.ts`, `src/index.css`, UI primitives | Không | CSS variables là nguồn runtime; đủ primary/secondary/accent/semantic; alias migration an toàn; contrast AA; không còn `primary-300` thiếu | P1 | Cao: visual diện rộng | Chưa bắt đầu |
| PLAN-103 | Tải font và áp type scale | `index.html`, `index.css`, font assets/config | PLAN-102 | Inter Vietnamese WOFF2 thực sự tải, swap; H1/body/price styles nhất quán; không CLS đáng kể | P2 | Thấp | Chưa bắt đầu |
| PLAN-104 | Chuẩn hóa spacing/radius/shadow | `tailwind.config.ts`, `index.css`, shared primitives | PLAN-102 | Scale khớp docs; panel/card dùng border nhẹ; không arbitrary values mới ngoài ngoại lệ có giải thích | P2 | Trung bình | Chưa bắt đầu |
| PLAN-105 | Chuẩn hóa icon rules | các shared component dùng `lucide-react` | PLAN-102 | Một icon library; decorative icon hidden; functional icon có name; size/stroke nhất quán | P2 | Thấp | Chưa bắt đầu |

## Phase 2: UI foundation

| ID | Mục tiêu | File liên quan | Dependency | Acceptance criteria | Ưu tiên | Rủi ro | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PLAN-201 | Sửa dialog foundation (AUD-001/021) | `components/ui/Modal.tsx`, mọi nơi dùng Modal | PLAN-102 | Focus trap/initial/restore, Escape, unique IDs, scroll lock; body cuộn/footer truy cập ở 320px; regression toàn modal | P0 | Cao | Chưa bắt đầu |
| PLAN-202 | Hợp nhất Button/ButtonLink và tạo IconButton | `Button.tsx`, `ButtonLink.tsx`, `IconButton.tsx`, call sites P1 | PLAN-102, PLAN-105 | Typed variant/size/loading; semantics đúng; focus-visible; touch target 44px; loading không đổi width | P1 | Trung bình | Chưa bắt đầu |
| PLAN-203 | Tạo FieldShell và migrate controls | `TextInput.tsx`, `SelectInput.tsx`, `Textarea.tsx`, `FieldShell.tsx` | PLAN-102 | Label/helper/error/required/readonly; stable IDs, aria-invalid/describedby; public props migration không phá form | P1 | Trung bình | Chưa bắt đầu |
| PLAN-204 | Chuẩn hóa Alert/Toast/Skeleton/Loading/Empty/Error | `components/ui`, `components/common`, query call sites | PLAN-102 | Loading/empty/error/partial error rõ; retry ở lỗi recoverable; live region và reduced-motion đúng; không toast-only cho lỗi quan trọng | P1 | Trung bình | Chưa bắt đầu |
| PLAN-205 | Tạo PageHeader, Panel, ConfirmDialog và FormDialog | shared components + admin/account page đầu tiên | PLAN-201–203 | Thay recipe lặp ở một vertical slice; không mất hierarchy/action; dialog xử lý pending/error nhưng không chứa schema/API | P2 | Trung bình | Chưa bắt đầu |
| PLAN-206 | Nâng Table primitive và responsive data contract | `Table.tsx`, component data-display mới | PLAN-102, PLAN-202 | Caption/name, numeric alignment, optional sticky/sort semantics; strategy scroll/card được chọn theo use case | P2 | Cao | Chưa bắt đầu |
| PLAN-207 | Tạo Drawer/Checkbox/RadioGroup utilities | `components/ui` | PLAN-201–203 | Focus/keyboard/scroll dùng chung dialog layer; native semantics; safe-area mobile | P1 | Trung bình | Chưa bắt đầu |

## Phase 3: Commerce core

| ID | Mục tiêu | File liên quan | Dependency | Acceptance criteria | Ưu tiên | Rủi ro | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PLAN-301 | Chặn variant hết hàng (AUD-002) | `ProductDetailPage.tsx`, `VariantSelector.tsx` | PLAN-202, PLAN-207 | Không auto-select variant hết hàng; option disabled có text; CTA kiểm tra stock/selection; request payload không đổi | P0 | Cao: purchase logic | Chưa bắt đầu |
| PLAN-302 | Tạo PriceDisplay/Rating/semantic badges | commerce components, `utils/format.ts` | PLAN-102, PLAN-202 | Giá/range/original/sale format thống nhất; rating/badge có label; chỉ render trường thật | P1 | Trung bình | Chưa bắt đầu |
| PLAN-303 | Nâng ProductCard và ProductGrid | `ProductCard.tsx`, `ProductVisual.tsx`, `CatalogPage.tsx` | PLAN-302 | Ảnh ổn định/fallback; title 2 dòng; giá ưu tiên; out-of-stock; 2→6 cột theo width; không layout jump | P1 | Trung bình | Chưa bắt đầu |
| PLAN-304 | Tách PDP commerce primitives | `ProductDetailPage.tsx`, ProductGallery/QuantitySelector/PurchaseActions | PLAN-201–203, PLAN-301/302 | Page nhỏ hơn, gallery/quantity/variant keyboard được; mobile action không che nội dung; add-cart behavior giữ nguyên | P1 | Cao | Chưa bắt đầu |
| PLAN-305 | Review summary và pagination | `ProductReviews.tsx`, reviews API/types | PLAN-302 | Hiển thị loading/empty/error; average/pagination chỉ nếu response hỗ trợ; không suy diễn rating | P2 | Trung bình | Chưa bắt đầu — kiểm tra API trước |
| PLAN-306 | Voucher/flash sale/freeship/official UI | component commerce tương lai | API/Product scope tương ứng | Contract, quyền lợi, validity và tracking được duyệt; không có badge giả | Future | Cao | Bị chặn — cần API/Product |

## Phase 4: Discovery

| ID | Mục tiêu | File liên quan | Dependency | Acceptance criteria | Ưu tiên | Rủi ro | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PLAN-401 | Marketplace header responsive | `PublicLayout.tsx`, MarketplaceHeader/MobileNav | PLAN-202, PLAN-207, PLAN-101 nếu có asset | Search là điểm chính; nav/account/cart truy cập ở 320–1440px; bỏ API health; header sticky không che content | P1 | Trung bình | Chưa bắt đầu |
| PLAN-402 | Catalog filter/sort responsive | `CatalogPage.tsx`, FilterPanel/Chips/SortToolbar | PLAN-207, PLAN-303 | URL là source of truth; mobile Drawer; active chips/clear; grid xuất hiện sớm; query behavior giữ nguyên | P1 | Cao | Chưa bắt đầu |
| PLAN-403 | Breadcrumb và category navigation từ data hiện có | router metadata, catalog components | PLAN-401/402 | Semantic breadcrumb; category labels/links từ response/route; no dead links | P2 | Trung bình | Chưa bắt đầu |
| PLAN-404 | Homepage discovery sections | route `/`, components marketing | API/CMS/Product content | Chỉ section có dữ liệu và asset được duyệt; performance budget; không biến thành SaaS landing | Future | Cao | Bị chặn — cần dữ liệu/Product |
| PLAN-405 | Search suggestions/history/popular keywords | SearchBar + API/local privacy spec | Search contract và privacy decision | Keyboard navigation/debounce/clear; không lưu dữ liệu nhạy cảm; empty/loading/error rõ | Future | Cao | Bị chặn — cần API/Product |

## Phase 5: Purchase flow

| ID | Mục tiêu | File liên quan | Dependency | Acceptance criteria | Ưu tiên | Rủi ro | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PLAN-501 | Refactor Cart và dùng QuantitySelector | `CartPage.tsx`, cart components | PLAN-202–204, PLAN-304 | Quantity/delete accessible; stock/price errors inline; summary rõ; mutation/invalidation không đổi; 320px không tràn | P1 | Cao | Chưa bắt đầu |
| PLAN-502 | Tách CheckoutPage theo section | `CheckoutPage.tsx`, checkout components | PLAN-201–205, PLAN-501 | Address/items/shipping/payment/summary rõ; phí/tổng không ẩn; no double submit; sticky responsive an toàn | P1 | Cao: thanh toán | Chưa bắt đầu |
| PLAN-503 | Nâng AddressSelector/ShippingOption/PaymentMethod UI | checkout/account components | PLAN-203, PLAN-207, PLAN-502 | Native semantics/keyboard; selected/disabled/error rõ; quote/payment payload giữ nguyên | P1 | Cao | Chưa bắt đầu |
| PLAN-504 | Dùng chung OrderItem/MoneySummary/ShipmentTimeline | Checkout, OrderDetail, SellerOrderDetail | PLAN-204, PLAN-302 | Format tiền/status nhất quán; action theo role không bị trộn; partial state rõ | P2 | Cao | Chưa bắt đầu |
| PLAN-505 | Order confirmation và failure recovery | checkout response/routes | PLAN-502/504 | Thành công có mã/next action; lỗi quan trọng inline với retry an toàn; không double-create order | P1 | Cao | Chưa bắt đầu |
| PLAN-506 | Voucher shop/system và save-for-later | Cart/Checkout future | API hiện trả `VOUCHER_NOT_SUPPORTED`; Product scope | Chỉ bắt đầu khi contract/applicability/total recalculation được duyệt | Future | Rất cao | Bị chặn — ngoài phạm vi API hiện tại |

## Phase 6: Account

| ID | Mục tiêu | File liên quan | Dependency | Acceptance criteria | Ưu tiên | Rủi ro | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PLAN-601 | Chuẩn hóa Profile và Addresses | `ProfilePage.tsx`, `AddressesPage.tsx` | PLAN-201–205 | Form accessible; modal mobile dùng được; CRUD feedback/retry; payload không đổi | P1 | Trung bình | Chưa bắt đầu |
| PLAN-602 | Nâng Orders list/detail | `OrdersPage.tsx`, `OrderDetailPage.tsx` | PLAN-204, PLAN-504 | Status/tiền/item nhất quán; loading/empty/error/retry; mobile readable | P1 | Cao | Chưa bắt đầu |
| PLAN-603 | Tạo account overview thay placeholder | `/dashboard`, `PlaceholderPage.tsx` | PLAN-205, API account hiện có | Chỉ widget có dữ liệu thật; role-aware; xóa PlaceholderPage sau reference/build check | P2 | Trung bình | Chưa bắt đầu |
| PLAN-604 | Wishlist | route/components/API tương lai | API/Product scope | Contract, route, empty/error và privacy được duyệt; không CTA chết | Future | Cao | Bị chặn — chưa có API/route |
| PLAN-605 | Notifications | route/components/API tương lai | API/Product scope | Read/unread/pagination/preferences contract được duyệt | Future | Cao | Bị chặn — chưa có API/route |

## Phase 7: Seller và Admin

| ID | Mục tiêu | File liên quan | Dependency | Acceptance criteria | Ưu tiên | Rủi ro | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PLAN-701 | Dashboard navigation theo role | `DashboardLayout.tsx` | PLAN-207 | Sidebar desktop/drawer mobile; buyer/seller/admin group; route/permission giữ nguyên | P2 | Cao: authorization visibility | Chưa bắt đầu |
| PLAN-702 | ManagementTable và toolbar | `Table.tsx`, admin/seller list pages | PLAN-206, PLAN-202/204 | Search/sort/filter/selection chỉ khi endpoint hỗ trợ; row action keyboard; mobile strategy rõ | P1 | Cao | Chưa bắt đầu |
| PLAN-703 | Sửa dashboard partial error | Admin/SellerDashboardPage, StatCard | PLAN-204 | Query lỗi không hiển thị `0`; retry độc lập; zero thật phân biệt unavailable | P1 | Trung bình | Chưa bắt đầu |
| PLAN-704 | Refactor product management pages | SellerProducts/Form/Images/Inventory pages | PLAN-205, PLAN-702 | Page nhỏ hơn; upload/form states accessible; không đổi payload/permission | P2 | Cao | Chưa bắt đầu |
| PLAN-705 | Variant option builder thay JSON thô | `SellerProductVariantsPage.tsx`, component mới | PLAN-203, PLAN-207 | Seller thêm/xóa option bằng control; serialize đúng payload hiện tại; validation/readback test | P1 | Cao | Chưa bắt đầu |
| PLAN-706 | Refactor order management | SellerOrders/OrderDetail, admin relevant pages | PLAN-504, PLAN-702 | Status/action theo permission; confirmation/error rõ; responsive | P1 | Cao | Chưa bắt đầu |
| PLAN-707 | Voucher management/flash-sale admin | routes/components/API tương lai | API/Product/authorization scope | CRUD rules, validation, audit trail và permissions được duyệt | Future | Rất cao | Bị chặn — chưa có API/route |

## Phase 8: Quality

| ID | Mục tiêu | File liên quan | Dependency | Acceptance criteria | Ưu tiên | Rủi ro | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PLAN-801 | Responsive regression | toàn route có UI | Phase triển khai tương ứng | Test 320/375/390/430/768/1024/1280/1440; không overflow, hidden CTA, modal/table lỗi | P1 | Trung bình | Chưa bắt đầu |
| PLAN-802 | Accessibility audit WCAG 2.2 AA | primitives + critical flows | PLAN-201–207 và feature phase | Keyboard-only, focus order, axe, contrast, zoom 200%, reduced motion; P0/P1 không còn | P1 | Cao | Chưa bắt đầu |
| PLAN-803 | Performance: lazy route/media/font | `router.tsx`, ProductVisual/media, font setup | PLAN-103, stable page splits | Đo bundle/LCP/CLS trước-sau; route lazy có fallback; ảnh đúng size; không regression critical route | P2 | Trung bình | Chưa bắt đầu |
| PLAN-804 | SEO và route metadata | `index.html`, router/page metadata | PLAN-101, discovery/PDP stable | Title/description/canonical theo route; product structured data chỉ từ dữ liệu thật | P2 | Trung bình | Chưa bắt đầu |
| PLAN-805 | Test và quality gates | test config/scripts, critical components/flows | Song song mọi phase | Lint + `tsc -b` + build đạt; component/interaction tests cho variant, modal, form, checkout; không `any`/console/mock mới | P1 | Trung bình | Chưa bắt đầu |
| PLAN-806 | Visual polish và dọn starter asset | `App.css`, starter assets, toàn UI | PLAN-801–805 | Xác nhận không reference rồi xóa; visual consistency; không mở rộng business scope | P3 | Thấp | Chưa bắt đầu |

## Lát cắt triển khai đầu tiên được khuyến nghị

Thực hiện **PLAN-102 → PLAN-201 → PLAN-202 → PLAN-203**, rồi sửa **PLAN-301**. Lát cắt này xử lý token và accessibility nền tảng trước, đồng thời gỡ hai rủi ro chặn luồng mà không phải rebuild toàn bộ giao diện.
