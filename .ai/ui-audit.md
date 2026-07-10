# UI audit TMDTTH

Audit source code trên **working tree ngày 2026-07-10**, gồm cả thay đổi chưa commit. Đây là audit tĩnh; các rủi ro tương tác cần được xác nhận lại bằng browser, keyboard và screen reader khi triển khai. Không có app code hoặc business logic nào được thay đổi trong nhiệm vụ tài liệu này.

## 1. Tổng quan

### Stack hiện tại

| Hạng mục | Kết quả |
| --- | --- |
| Package / app | npm workspace frontend độc lập, SPA Vite 8.1.x |
| Framework | React 19.2.x, React Router DOM 7.18.x; **không phải Next.js**, không có App/Pages Router |
| Ngôn ngữ | TypeScript 6.0.x, `noEmit`; `strict` chưa được bật tường minh |
| Styling | Tailwind CSS 3.4.x + PostCSS; theme viết tay, nhiều utility trong JSX |
| Data/form/state | TanStack Query 5, React Hook Form 7, Zod 4, Zustand 5, Axios |
| UI/icon | Không có UI framework; primitive nội bộ; Lucide React |
| Font | Stack khai báo Inter nhưng chưa thấy font được tải, nên có thể đang dùng system fallback |

### Cấu trúc frontend

- Entry/provider/router: `frontend/src/main.tsx`, `App.tsx`, `app/providers.tsx`, `app/router.tsx`.
- Shared UI: `components/ui`, `components/common`, `components/layout`.
- Feature theo domain: `account`, `admin`, `auth`, `cart`, `catalog`, `checkout`, `orders`, `reviews`, `seller`.
- API/type nằm gần feature; service lỗi/token dùng chung; route constants và formatting utilities đã có.
- Có 53 file TSX, 18 shared components và 24 page; một số page 300–578 dòng.

### Phần có thể giữ

- Feature-based structure, typed API layer, React Query/RHF/Zod và route guards.
- Primitive Button/Input/Select/Modal/Table/Badge/feedback làm điểm migration thay vì rebuild.
- Product card hiện tại có ảnh tỷ lệ ổn định, title hai dòng, border nhẹ và hierarchy cơ bản tốt.
- Palette xanh hiện tại và nền trung tính phù hợp; cần mở rộng/đổi tên token, không cần đổi brand direction.
- Các utility format và error mapping tiếng Việt là nền tảng tốt.

### Hướng cần sửa

- Chuẩn hóa semantic tokens qua CSS variables + Tailwind bridge; tách background khỏi surface.
- Sửa accessibility foundation trước khi refactor page.
- Tách shared recipes và page lớn theo [`design-system/component-inventory.md`](design-system/component-inventory.md).
- Tạo responsive public header, catalog filter mobile và data table strategy.
- Chỉ thêm commerce/marketing UI khi API trả dữ liệu thật.

### Rủi ro refactor

- Worktree đang có thay đổi chưa commit; refactor cơ học rộng dễ ghi đè hoặc trộn phạm vi.
- Đổi tên token `surface` có thể ảnh hưởng mọi layout/card; cần alias tạm và migration theo lát cắt.
- Tách component page lớn có thể làm lệch mutation invalidation, form state, enum hoặc permission.
- Các feature wishlist, notification, voucher, flash sale, official/freeship chưa có contract; dựng UI trước sẽ tạo affordance giả.
- Tailwind JIT bỏ class không có trong config mà không báo type error; migration cần visual regression.

### Baseline validation

- `npm.cmd run lint`: đạt ngày 2026-07-10.
- `npm.cmd run build`: đạt (`tsc -b && vite build`); Vite cảnh báo JS chunk chính 649.32 kB minified, được theo dõi ở AUD-033.
- Sáu project skill qua `quick_validate.py` ở UTF-8; toàn bộ relative link trong `.ai` và `AGENTS.md` hợp lệ.

## 2. Vấn đề nghiêm trọng

| ID | File liên quan | Hiện trạng | Tác động | Giải pháp | Ưu tiên | Rủi ro |
| --- | --- | --- | --- | --- | --- | --- |
| AUD-001 | `components/ui/Modal.tsx`; `account/pages/AddressesPage.tsx`; các admin shipping page | Dialog thiếu max-height/body scroll, focus trap/restore và scroll lock; footer đi theo nội dung dài | CTA có thể rơi khỏi viewport 320–430px; keyboard/screen reader có thể thoát ra nền | Nâng Modal thành dialog primitive chuẩn, unique IDs, body cuộn và footer luôn truy cập được | P0 | Cao: dùng ở nhiều CRUD flow, phải regression-test toàn bộ modal |
| AUD-002 | `catalog/pages/ProductDetailPage.tsx` | Tự chọn variant đầu tiên kể cả hết hàng; option hết hàng không disabled; CTA chưa kiểm tra available quantity | Có thể gửi add-to-cart không hợp lệ hoặc khiến người mua hiểu sai tồn kho | Chọn variant còn hàng đầu tiên hoặc không chọn; `VariantSelector` radio semantics; disable CTA/option theo stock | P0 | Cao: chạm purchase state; giữ nguyên API và kiểm thử mọi variant case |
| AUD-003 | `admin/pages/AdminDashboardPage.tsx`; `seller/pages/SellerDashboardPage.tsx` | Query widget phụ lỗi bị chuyển thành `0`/“chưa có dữ liệu” | Người vận hành hiểu nhầm số liệu thật | Hiển thị partial error và retry theo widget, phân biệt zero với unavailable | P1 | Trung bình: cần audit query state từng widget |

## 3. Vấn đề nhận diện thương hiệu

| ID | File liên quan | Hiện trạng | Tác động | Giải pháp | Ưu tiên | Rủi ro |
| --- | --- | --- | --- | --- | --- | --- |
| AUD-004 | `components/layout/PublicLayout.tsx`; `frontend/index.html` | Header ghi “TMDTTH Marketplace”, document title ghi “Công Thắng”; logo chỉ là Store icon | Nhận diện không nhất quán, khó tạo niềm tin | Product Owner chốt tên; thay logo/favicon bằng asset vector có quyền sử dụng | P2 | Trung bình: thay tên có ảnh hưởng metadata/tài liệu/SEO |
| AUD-005 | `frontend/public/favicon.svg`; `src/assets/react.svg`; `vite.svg`; `hero.png`; `App.css` | Còn asset/style starter Vite không được tham chiếu hoặc không thuộc brand | Polish kém, có thể lộ nhận diện starter | Xác nhận reference rồi xóa/thay ở task asset riêng | P3 | Thấp: cần build và grep trước khi xóa |
| AUD-006 | `components/layout/PublicLayout.tsx` | Badge “API trực tuyến/ngoại tuyến” xuất hiện ở public header | Lộ tín hiệu kỹ thuật, cạnh tranh với action mua hàng và không giúp khách xử lý sự cố | Bỏ khỏi public UI; health monitoring đặt ở observability/admin | P2 | Thấp: bảo đảm không mất công cụ vận hành cần thiết |

Chi tiết hướng brand và ba palette: [`design-system/brand-direction.md`](design-system/brand-direction.md).

## 4. Vấn đề màu sắc

| ID | File liên quan | Hiện trạng | Tác động | Giải pháp | Ưu tiên | Rủi ro |
| --- | --- | --- | --- | --- | --- | --- |
| AUD-007 | `tailwind.config.ts`; `components/ui/Badge.tsx`, `Alert.tsx`, `ToastViewport.tsx` | `muted` chỉ ~4.49:1 trên page background; success/warning có tổ hợp chữ nhỏ không đạt; semantic màu rời | Nội dung phụ/trạng thái khó đọc, không đạt AA nhất quán | Dùng target tokens/contrast trong `design-tokens.md`, kiểm tra axe trên component thật | P1 | Trung bình: đổi màu diện rộng cần visual review |
| AUD-008 | `tailwind.config.ts`; nhiều page/layout | Token `surface` đang là page background nhưng card hard-code `bg-white`; red/green/emerald dùng ngoài theme | Tên token sai nghĩa, hai nguồn giá trị, dễ drift | Tách `background`/`surface`; alias cũ trong migration; map semantic role | P2 | Cao nếu đổi một lần; migration theo component |
| AUD-009 | `seller/pages/SellerProductImagesPage.tsx`; `tailwind.config.ts` | Có class `primary-300` nhưng theme không định nghĩa scale này | Selected/focus visual có thể không render CSS | Bổ sung scale chuẩn ở foundation rồi thay class theo semantic state | P1 | Thấp nhưng dễ bỏ sót vì build không báo lỗi |
| AUD-010 | toàn frontend JSX | Primary-700 và hard-coded Tailwind semantic bị dùng cho nhiều vai trò; thiếu voucher/freeship/rating/official/new/best-seller token | Badge/trạng thái không phân biệt rõ và khó mở rộng | Dùng role token; chỉ render marketing badge khi API có dữ liệu | P2 | Trung bình: cần mapping enum/context trước migration |

## 5. Vấn đề consistency

| ID | File liên quan | Hiện trạng | Tác động | Giải pháp | Ưu tiên | Rủi ro |
| --- | --- | --- | --- | --- | --- | --- |
| AUD-011 | hầu hết `features/*/pages/*.tsx` | Recipe page header và `rounded-lg border ... bg-white ... shadow-panel` lặp | Thay đổi nhỏ cần sửa nhiều nơi; spacing/hierarchy lệch dần | Tạo `PageHeader`, `Panel` sau foundation; migrate theo feature | P2 | Trung bình: quá trừu tượng có thể làm page khó tùy biến |
| AUD-012 | `Button.tsx`; `ButtonLink.tsx`; ba field component | Button/link và label/helper/error wrapper lặp | Variant/focus/error không đồng bộ | Dùng chung `buttonStyles` và `FieldShell`, giữ semantics/public API | P1 | Trung bình: tránh breaking props hàng loạt |
| AUD-013 | Checkout, seller order, buyer order và admin CRUD pages | Nhiều page lớn 329–578 dòng, domain display và orchestration trộn | Khó test/review, dễ regression khi sửa UI | Tách theo boundary trong inventory, giữ query/mutation tại feature/page | P2 | Cao: không tách logic mù; cần characterization tests |
| AUD-014 | `Badge.tsx` và nhiều nơi dùng status | Phần lớn trạng thái dùng tone mặc định; text khác nhưng visual giống | Người dùng quét table/đơn chậm, có thể hiểu nhầm | Tạo `StatusBadge` mapping enum → text + semantic tone | P2 | Trung bình: enum phải lấy từ code/API thật |

## 6. Vấn đề responsive

| ID | File liên quan | Hiện trạng | Tác động | Giải pháp | Ưu tiên | Rủi ro |
| --- | --- | --- | --- | --- | --- | --- |
| AUD-015 | `components/layout/PublicLayout.tsx` | Desktop nav bị `hidden` trên mobile mà không có lối thay thế; search không nằm trong header | Mobile khó khám phá sản phẩm/khu vực làm việc | Marketplace header responsive, search chính, drawer/bottom nav có scope | P1 | Trung bình: route/auth state và header height |
| AUD-016 | `catalog/pages/CatalogPage.tsx` | Sáu filter xếp dọc trên mobile; grid `<640px` chỉ một cột; không active chips | Cuộn dài trước khi thấy hàng, mật độ thấp và khó biết filter đang bật | Filter Drawer + chips + SortToolbar; 2 cột mobile, tăng tới 5/6 khi card đủ rộng | P1 | Trung bình: giữ URL/search params và query behavior |
| AUD-017 | `DashboardLayout.tsx`; `components/ui/Table.tsx`; admin/seller tables | Nav ngang dài và table chỉ scroll ngang | Link/cột quan trọng khó phát hiện, mobile khó thao tác | Drawer grouped nav; responsive row/card hoặc controlled scroll theo use case | P2 | Cao: card representation phải giữ đủ dữ liệu/action |
| AUD-018 | Cart/Checkout/Product Detail pages | Fixed desktop arrangements được stack nhưng CTA/tổng kết nằm xa, chưa có safe sticky strategy | Luồng mua dài và dễ bỏ cuộc trên mobile | Sticky CTA/summary có safe-area, không che nội dung/keyboard | P1 | Cao: kiểm tra iOS/Android keyboard và dynamic viewport |

## 7. Vấn đề accessibility

| ID | File liên quan | Hiện trạng | Tác động | Giải pháp | Ưu tiên | Rủi ro |
| --- | --- | --- | --- | --- | --- | --- |
| AUD-019 | `TextInput.tsx`, `SelectInput.tsx`, `Textarea.tsx` | Error chưa nối `aria-describedby`, thiếu `aria-invalid`, helper/required contract | Screen reader không biết field nào lỗi hoặc cách sửa | `FieldShell` tạo stable ids; error `role=alert` phù hợp; focus field đầu lỗi | P1 | Trung bình: ID phải unique trong modal/list |
| AUD-020 | Cart, Product Detail, Catalog và row actions | Nhiều icon-only control thiếu accessible name, target 28–40px; focus-visible chưa chuẩn | Keyboard/touch/screen-reader khó hoặc không thể dùng | `IconButton`, `aria-label` cụ thể, min 44×44, visible focus | P1 | Trung bình: tăng target có thể đổi mật độ table |
| AUD-021 | `Modal.tsx` | Ngoài AUD-001, `aria-labelledby="modal-title"` cố định giữa instance | Duplicate IDs/naming sai khi nhiều dialog tồn tại; focus thất thoát | `useId`, title/description ids, initial/restore/trap focus | P0 | Đã gộp rủi ro với AUD-001 |
| AUD-022 | Skeleton, LoadingScreen, Alert, ToastViewport | Chưa có reduced-motion/live-region contract nhất quán; danger toast có thể chỉ `status` | Motion gây khó chịu; thông báo khẩn không được đọc đúng | `prefers-reduced-motion`; `status` cho info/success, `alert` cho error khẩn; `aria-busy` | P2 | Thấp: tránh đọc lặp/toast spam |
| AUD-023 | navigation/table/page headings | Nav label, caption table và heading hierarchy chưa thành quy ước | Landmark/structure khó hiểu với assistive tech | Semantic regions, `aria-label` nav, caption hoặc accessible name, một H1/page | P2 | Thấp |

## 8. Vấn đề nội dung tiếng Việt

Audit chuỗi tĩnh không thấy nhóm tiếng Anh user-facing lớn còn lại trong `frontend/src`; phần Việt hóa trước đó là nền tảng có thể giữ. Các điểm còn lại:

| ID | File liên quan | Hiện trạng | Tác động | Giải pháp | Ưu tiên | Rủi ro |
| --- | --- | --- | --- | --- | --- | --- |
| AUD-024 | `PublicLayout.tsx`; `index.html` | “API” là thuật ngữ kỹ thuật public; “Hồ sơ” và “Tài khoản” chưa thống nhất; tên document/brand lệch | Giọng sản phẩm thiếu nhất quán | Bỏ health text; dùng glossary trong content rule; chốt brand name | P2 | Thấp |
| AUD-025 | `CatalogPage.tsx` và các message | Có cách viết “nhưng Bạn” viết hoa đại từ giữa câu; một số lỗi chung chưa nêu retry tại chỗ | Microcopy thiếu tự nhiên/actionability | Sentence case, “bạn”; error nói vấn đề + bước xử lý + retry | P3 | Thấp |
| AUD-026 | status/error mapping toàn app | Backend key đã được map phần lớn nhưng chưa có test đảm bảo không lọt key mới | Có thể lộ enum/error code kỹ thuật khi API mở rộng | Default message an toàn + test mapping; log kỹ thuật ngoài UI | P2 | Thấp |

## 9. Component duplication

| ID | File liên quan | Hiện trạng | Tác động | Giải pháp | Ưu tiên | Rủi ro |
| --- | --- | --- | --- | --- | --- | --- |
| AUD-027 | Product Detail + Cart | Quantity control lặp | Fix stock/a11y có thể lệch giữa hai luồng | Tạo `QuantitySelector` typed, controlled | P1 | Trung bình: min/max và debounce mutation khác nhau |
| AUD-028 | OrderDetail + SellerOrderDetail + Checkout | Item list, money summary, shipment/status display lặp | Format/trạng thái sai khác theo vai trò | Tạo compositions dùng chung, inject allowed actions | P2 | Cao nếu abstraction trộn permission/business |
| AUD-029 | admin category/shipping và account address dialogs | CRUD form/modal/confirm recipes lặp | Modal/a11y/error fix phải làm nhiều lần | `FormDialog`, `ConfirmDialog`, `FieldShell`; domain form vẫn ở feature | P2 | Trung bình |
| AUD-030 | admin/seller dashboard và tables | Stat card, toolbar/row action patterns lặp hoặc thiếu | Dashboard/table không nhất quán | `StatCard`, `ManagementTable`, `RowActionMenu` | P2 | Trung bình |

Chi tiết quyết định giữ/sửa/gộp/xóa/tạo: [`design-system/component-inventory.md`](design-system/component-inventory.md).

## 10. Design token

| ID | File liên quan | Hiện trạng | Tác động | Giải pháp | Ưu tiên | Rủi ro |
| --- | --- | --- | --- | --- | --- | --- |
| AUD-031 | `tailwind.config.ts`; `index.css` | Theme nhỏ và một phần bị lặp; chưa có semantic/typography/spacing/radius scale hoàn chỉnh | Agent tiếp theo dễ hard-code hoặc tự tạo variant | CSS variables làm canonical runtime, Tailwind bridge, docs là target state | P1 | Cao: cần tránh hai nguồn hex và class chưa sinh |
| AUD-032 | JSX toàn app | Nhiều `bg-white`, Tailwind palette và recipe hard-coded | Khó đổi brand/contrast, review bằng mắt | Migration theo component sau token foundation; lint/rg guardrail | P2 | Trung bình |

## 11. Performance

| ID | File liên quan | Hiện trạng | Tác động | Giải pháp | Ưu tiên | Rủi ro |
| --- | --- | --- | --- | --- | --- | --- |
| AUD-033 | `app/router.tsx` | Eager import toàn bộ page; build ngày 2026-07-10 tạo JS 649.32 kB minified (184.97 kB gzip) và Vite cảnh báo chunk >500 kB | Public visitor phải tải khả năng chứa cả admin/seller code; chậm thiết bị/mạng yếu | Route-level `lazy`, đo bundle trước/sau và đặt performance budget | P2 | Trung bình: loading/error boundary theo route |
| AUD-034 | `ProductVisual.tsx`, seller image cards | Thiếu lazy loading/decoding/dimension/srcset rõ | Tốn bandwidth, CLS và decode main-thread | Media primitive, dimensions/aspect-ratio, lazy dưới fold | P2 | Trung bình: ảnh above-fold không nên lazy mù |
| AUD-035 | Inter config | Font được đặt tên nhưng chưa tải; nếu thêm sai có thể gây FOIT/CLS | Typography khác máy, hoặc bundle/font chậm | WOFF2 Vietnamese subset, preload cần thiết, `font-display: swap` | P2 | Thấp |
| AUD-036 | starter/dead assets | Asset có thể không dùng | Repo/bundle intent nhiễu; thường không vào bundle nếu unreferenced | Xác nhận bằng graph/rg rồi xóa ở P3 | P3 | Thấp |

## 12. Danh sách ưu tiên

| Thứ tự | Issue | Kết quả cần đạt |
| ---: | --- | --- |
| 1 | AUD-001, AUD-021 | Dialog dùng được ở 320px và bằng keyboard/screen reader |
| 2 | AUD-002 | Không thể chọn/mua variant hết hàng |
| 3 | AUD-031, AUD-007, AUD-009 | Token nền tảng đầy đủ, contrast đạt, không còn class primary thiếu |
| 4 | AUD-012, AUD-019, AUD-020 | Button/field/icon actions accessible và thống nhất |
| 5 | AUD-015, AUD-016, AUD-018 | Public discovery và purchase flow dùng tốt trên mobile |
| 6 | AUD-003, AUD-014, AUD-017 | Dashboard/table không báo số liệu sai và có responsive strategy |
| 7 | AUD-013, AUD-027–030 | Tách page lớn theo component boundary có kiểm soát |
| 8 | AUD-033–036 | Lazy route, media/font performance và dọn asset |

P0 phải được sửa/kiểm thử trước refactor thẩm mỹ. P1 là foundation hoặc UX lớn; P2 là consistency/maintainability; P3 là polish. Lộ trình cụ thể nằm tại [`ui-implementation-plan.md`](ui-implementation-plan.md).
