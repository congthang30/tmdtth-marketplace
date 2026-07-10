# Component inventory

Audit trên working tree ngày **2026-07-10**, bao gồm thay đổi chưa commit. Trạng thái là quyết định mục tiêu, không phải lệnh xóa/sửa ngay. Mọi thay đổi phải đi qua [`../ui-implementation-plan.md`](../ui-implementation-plan.md).

## Component hiện có

| ID | Phân loại | Component | Đường dẫn | Trạng thái | Vấn đề | Hướng xử lý |
| --- | --- | --- | --- | --- | --- | --- |
| CMP-001 | Primitive UI | Alert | `frontend/src/components/ui/Alert.tsx` | Sửa | Màu semantic còn phụ thuộc Tailwind color rời; live region chưa thành contract | Map token success/warning/error/info; thêm semantics theo độ khẩn cấp |
| CMP-002 | Primitive UI | Badge | `frontend/src/components/ui/Badge.tsx` | Sửa | Chỉ ba tone; nhiều status khác nghĩa nhìn giống nhau | Giữ generic, mở semantic tone; status nghiệp vụ qua `StatusBadge` |
| CMP-003 | Primitive UI | Button | `frontend/src/components/ui/Button.tsx` | Gộp | Target khoảng 36px; thiếu size/icon/loading/focus contract | Dùng chung `buttonStyles` với ButtonLink; variant typed, 44px touch target |
| CMP-004 | Primitive UI | ButtonLink | `frontend/src/components/ui/ButtonLink.tsx` | Gộp | Lặp style Button, variant không đồng bộ | Giữ semantics link nhưng dùng chung style recipe và size API |
| CMP-005 | Primitive UI | Modal | `frontend/src/components/ui/Modal.tsx` | Sửa | Không focus trap/restore, scroll lock, max-height/body scroll; ID title cố định | Nâng thành dialog accessible; body cuộn, footer thấy được ở mobile |
| CMP-006 | Data display | Pagination | `frontend/src/components/ui/Pagination.tsx` | Sửa | Cần xác nhận label/current page, target chạm và responsive | Giữ API đơn giản; bổ sung nav semantics và compact mobile mode |
| CMP-007 | Form | SelectInput | `frontend/src/components/ui/SelectInput.tsx` | Gộp | Lặp field wrapper; error chưa liên kết screen reader | Dùng `FieldShell`, giữ public component để migration an toàn |
| CMP-008 | Feedback | Skeleton | `frontend/src/components/ui/Skeleton.tsx` | Sửa | Chưa giảm motion; skeleton page chưa phản ánh cấu trúc nhất quán | Thêm reduced-motion và composition theo nội dung |
| CMP-009 | Data display | Table family | `frontend/src/components/ui/Table.tsx` | Sửa | Chỉ scroll ngang; thiếu caption/sort/selection/sticky/numeric contract | Giữ primitive semantic; `ManagementTable` xử lý use case cao hơn |
| CMP-010 | Form | Textarea | `frontend/src/components/ui/Textarea.tsx` | Gộp | Lặp field wrapper; thiếu helper/required/error association | Dùng `FieldShell`; giữ native textarea semantics |
| CMP-011 | Form | TextInput | `frontend/src/components/ui/TextInput.tsx` | Gộp | Lặp field wrapper; thiếu `aria-invalid`, `aria-describedby` | Dùng `FieldShell`, hỗ trợ helper/error/required/readonly |
| CMP-012 | Feedback | EmptyState | `frontend/src/components/common/EmptyState.tsx` | Sửa | Nền tảng tốt; CTA/hierarchy chưa có size/context convention | Chuẩn hóa icon/title/body/action, compact/full variants |
| CMP-013 | Feedback | ErrorState | `frontend/src/components/common/ErrorState.tsx` | Sửa | Có action nhưng phần lớn page không truyền retry; lỗi thành ngõ cụt | Chuẩn hóa retry, message actionable, error/partial-error variants |
| CMP-014 | Feedback | LoadingScreen | `frontend/src/components/common/LoadingScreen.tsx` | Sửa | Chưa có live region/reduced motion; spinner toàn trang dùng rộng | Chỉ dùng cho route/session blocking; còn lại dùng skeleton contextual |
| CMP-015 | Feedback | PlaceholderPage | `frontend/src/components/common/PlaceholderPage.tsx` | Xóa | `/dashboard` còn placeholder, không phải UX production | Thay bằng account overview thật rồi xóa sau khi kiểm tra reference |
| CMP-016 | Feedback | ToastViewport | `frontend/src/components/common/ToastViewport.tsx` | Sửa | Danger vẫn có thể dùng `status`; màu/timeout/a11y chưa theo mức độ | `alert` cho lỗi khẩn, `status` cho success/info; pause và reduced motion |
| CMP-017 | Layout | PublicLayout | `frontend/src/components/layout/PublicLayout.tsx` | Sửa | Nav biến mất trên mobile; thiếu search chính; lộ API health cho khách | Tách `MarketplaceHeader`, mobile nav; bỏ tín hiệu kỹ thuật khỏi public UI |
| CMP-018 | Layout | DashboardLayout | `frontend/src/components/layout/DashboardLayout.tsx` | Sửa | Mobile nav ngang dài, vai trò buyer/seller/admin chưa phân nhóm | Sidebar desktop + drawer mobile, group và accessible nav label |
| CMP-019 | Navigation | LogoutButton | `frontend/src/features/auth/components/LogoutButton.tsx` | Giữ | Chức năng đơn giản; cần thừa hưởng Button loading/focus | Giữ logic, chuyển sang Button contract mới khi foundation xong |
| CMP-020 | Navigation | ProtectedRoute | `frontend/src/features/auth/components/ProtectedRoute.tsx` | Giữ | Không phải visual component | Giữ nguyên auth behavior; chỉ chuẩn hóa blocking loading nếu cần |
| CMP-021 | Navigation | RoleRoute | `frontend/src/features/auth/components/RoleRoute.tsx` | Giữ | Không phải visual component | Giữ nguyên authorization behavior |
| CMP-022 | Navigation | AuthSessionProvider | `frontend/src/features/auth/components/AuthSessionProvider.tsx` | Giữ | Không phải UI primitive | Giữ data/session contract; không đưa vào design layer |
| CMP-023 | Commerce | ProductCard | `frontend/src/features/catalog/components/ProductCard.tsx` | Sửa | Cấu trúc card ổn nhưng metadata chưa ưu tiên conversion; thiếu sale/out-of-stock states | Dùng `PriceDisplay`; badge có điều kiện; card cân chiều cao, 2 dòng title |
| CMP-024 | Commerce | ProductVisual | `frontend/src/features/catalog/components/ProductVisual.tsx` | Sửa | Fallback tốt nhưng thiếu lazy/decoding/dimensions/srcset và dùng lại seller | Nâng thành media primitive/composition dùng chung, tránh CLS |
| CMP-025 | Commerce | ProductReviews | `frontend/src/features/catalog/components/ProductReviews.tsx` | Sửa | Chỉ 5 review; rating bị đóng trong file; thiếu summary/pagination | Tách `Rating`, thêm states/filter khi API hỗ trợ |
| CMP-026 | Commerce | CartItemCard (page-local) | `frontend/src/features/cart/pages/CartPage.tsx` | Gộp | Quantity/action lặp PDP; component nằm trong page | Tách `CartItem`, dùng chung `QuantitySelector`, giữ mutation ở feature |
| CMP-027 | Form | AddressFormModal (page-local) | `frontend/src/features/account/pages/AddressesPage.tsx` | Gộp | Form dài gắn Modal hiện tại; pattern lặp dialog CRUD | Tách form/domain khỏi dialog shell; dùng `FormDialog`/Modal chuẩn |
| CMP-028 | Commerce | ReviewModal (page-local) | `frontend/src/features/orders/pages/OrderDetailPage.tsx` | Gộp | Modal/form nằm trong page lớn | Tách feature component, dùng field/dialog contract chung |
| CMP-029 | Seller | InventoryEditor (page-local) | `frontend/src/features/seller/pages/SellerProductInventoryPage.tsx` | Gộp | Page-local editor khó test/reuse | Tách feature component; không đổi inventory API/validation |

## Component cần tạo khi có task triển khai

| ID | Phân loại | Component | Đường dẫn mục tiêu | Trạng thái | Vấn đề giải quyết | Hướng xử lý |
| --- | --- | --- | --- | --- | --- | --- |
| CMP-030 | Primitive UI | FieldShell / FormField | `frontend/src/components/ui/FieldShell.tsx` | Tạo mới | Ba field lặp label/error/a11y | Composition cho label, helper, error ids; không chứa schema business |
| CMP-031 | Primitive UI | IconButton | `frontend/src/components/ui/IconButton.tsx` | Tạo mới | Icon actions thiếu accessible name/target 44px | Bắt buộc `aria-label`, variant/size/focus/loading chuẩn |
| CMP-032 | Primitive UI | Checkbox / RadioGroup | `frontend/src/components/ui/` | Tạo mới | Native controls đang style rời, variant selection thiếu semantics | Bọc nhẹ quanh native semantics, keyboard đúng |
| CMP-033 | Primitive UI | Drawer | `frontend/src/components/ui/Drawer.tsx` | Tạo mới | Filter/nav mobile chưa có container accessible | Dùng chung dialog focus/scroll layer; hỗ trợ safe-area |
| CMP-034 | Primitive UI | ConfirmDialog | `frontend/src/components/ui/ConfirmDialog.tsx` | Tạo mới | Nhiều modal xác nhận CRUD lặp | Compose Modal, destructive semantics, busy/error inline |
| CMP-035 | Primitive UI | Spinner / VisuallyHidden | `frontend/src/components/ui/` | Tạo mới | Loading/accessibility utility chưa thống nhất | Utility nhỏ, reduced motion, accessible label ở parent |
| CMP-036 | Layout | PageHeader | `frontend/src/components/common/PageHeader.tsx` | Tạo mới | Header page lặp ở gần mọi feature | Slots title/eyebrow/description/actions/breadcrumb |
| CMP-037 | Layout | Panel / Card | `frontend/src/components/ui/Panel.tsx` | Tạo mới | Recipe border-white-shadow lặp nhiều | Surface primitive ít variant; không biến mọi section thành card |
| CMP-038 | Navigation | MarketplaceHeader / MobileNav | `frontend/src/components/layout/` | Tạo mới | Public discovery/navigation yếu, mobile mất nav | Search nổi bật, cart/account; feature chỉ khi route/data có |
| CMP-039 | Navigation | Breadcrumb / Footer | `frontend/src/components/common/` | Tạo mới | Thiếu orientation và footer | Semantic nav/footer; route metadata là nguồn label |
| CMP-040 | Commerce | ProductGrid | `frontend/src/features/catalog/components/ProductGrid.tsx` | Tạo mới | Grid/skeleton breakpoint lặp | Grid responsive + list semantics + skeleton composition |
| CMP-041 | Commerce | PriceDisplay | `frontend/src/components/commerce/PriceDisplay.tsx` | Tạo mới | Giá format/hierarchy lặp | Sale/original/range typed; dùng utility tiền hiện tại |
| CMP-042 | Commerce | Rating / DiscountBadge / StockBadge | `frontend/src/components/commerce/` | Tạo mới | Commerce semantics chưa dùng lại | Chỉ render từ data thật; accessible label, semantic token |
| CMP-043 | Commerce | ProductGallery | `frontend/src/features/catalog/components/ProductGallery.tsx` | Tạo mới | Gallery/PDP lớn, state ảnh phân tán | Thumbnail keyboard, fallback; zoom chỉ khi có scope |
| CMP-044 | Commerce | VariantSelector | `frontend/src/components/commerce/VariantSelector.tsx` | Tạo mới | Variant hết hàng chưa disable/chọn sai | Radio semantics; giá/tồn kho do feature cung cấp |
| CMP-045 | Commerce | QuantitySelector | `frontend/src/components/commerce/QuantitySelector.tsx` | Tạo mới | Quantity control lặp Cart/PDP | Min/max/stock, accessible names, 44px target |
| CMP-046 | Commerce | CartItem / ShopCartGroup | `frontend/src/features/cart/components/` | Tạo mới | Cart chưa composition theo shop | Chỉ thêm shop grouping nếu response hỗ trợ; mutation vẫn ở feature |
| CMP-047 | Commerce | CartSummary / CheckoutSummary / MoneySummary | `frontend/src/components/commerce/` | Tạo mới | Tổng tiền lặp, hierarchy/sticky khác nhau | Shared rows/total; fee không ẩn; layout sticky ở wrapper |
| CMP-048 | Commerce | OrderItem / ShipmentTimeline / StatusBadge | `frontend/src/components/commerce/` | Tạo mới | Buyer/seller order display lặp | Mapping enum tập trung, text + tone; không đổi enum/API |
| CMP-049 | Discovery | SearchBar / CategoryMenu | `frontend/src/features/catalog/components/` | Tạo mới | Search/header chưa marketplace-ready | Query URL hiện tại là nguồn; suggestion/history chỉ khi API có |
| CMP-050 | Discovery | FilterPanel / ActiveFilterChips / SortToolbar | `frontend/src/features/catalog/components/` | Tạo mới | Form filter dài và mobile kém | Desktop panel + mobile Drawer, giữ URL state |
| CMP-051 | Form | AddressSelector / ShippingOption | `frontend/src/features/checkout/components/` | Tạo mới | Checkout select thô, page quá lớn | Typed compositions; không thay shipping quote/payment contract |
| CMP-052 | Admin/Seller | ManagementTable / ResponsiveDataView / DataTableToolbar | `frontend/src/components/data-display/` | Tạo mới | CRUD table lặp, thiếu search/sort/selection và mobile representation | Compose Table; capability chỉ bật khi backend hỗ trợ; card/row giữ cùng data model |
| CMP-053 | Admin/Seller | RowActionMenu / StatCard | `frontend/src/components/common/` | Tạo mới | Row nhiều nút; KPI lỗi bị xem như zero | Menu keyboard; stat có loading/error/partial error |
| CMP-054 | Seller | VariantOptionBuilder / UploadDropzone | `frontend/src/features/seller/components/` | Tạo mới | Người bán nhập JSON, image workflow dài | Serialize nội bộ; giữ payload hiện tại, validate trước submit |
| CMP-055 | Auth | AuthCard | `frontend/src/features/auth/components/AuthCard.tsx` | Tạo mới | Login/Register shell lặp | Shared visual shell, form logic vẫn riêng |
| CMP-056 | Form | FormDialog | `frontend/src/components/common/FormDialog.tsx` | Tạo mới | Form modal CRUD lặp shell/submit/error nhưng khác domain | Compose Modal + form actions; nhận form content qua composition, không chứa schema/API |

## Thứ tự consolidation

1. CMP-005, CMP-003/004, CMP-030/031 và CMP-002 để gỡ P0/P1 nền tảng.
2. CMP-036/037/034 và CMP-009/052 cho consistency.
3. CMP-041/044/045/040 trước khi refactor Product Detail, Cart và Checkout.
4. CMP-038/049/050 cho discovery/mobile.
5. CMP-048/052/053/054 cho seller/admin.

Wishlist, notification, voucher management, flash sale, official store và freeship không có contract đầy đủ trong repo hiện tại; không tạo component hoặc mock trước API/product scope.
