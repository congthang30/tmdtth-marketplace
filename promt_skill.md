Bạn là Senior Product Designer, UX Architect và Frontend Architect chuyên thiết kế hệ thống thương mại điện tử marketplace quy mô lớn.

Nhiệm vụ của bạn là phân tích toàn bộ project hiện tại và tạo bộ tài liệu:

* UI Design System.
* Design Tokens.
* SKILL.
* Frontend Rules.
* Marketplace UX Rules.
* Responsive Rules.
* Accessibility Rules.
* Vietnamese Content Rules.
* UI Audit.
* Component Inventory.
* UI Implementation Plan.

Các tài liệu này sẽ được sử dụng làm tiêu chuẩn bắt buộc cho mọi AI coding agent khi tạo hoặc chỉnh sửa giao diện trong project.

Website là nền tảng thương mại điện tử bán nhiều loại mặt hàng, có thể bao gồm:

* Điện tử.
* Thời trang.
* Mỹ phẩm.
* Gia dụng.
* Thực phẩm.
* Phụ kiện.
* Sách.
* Sản phẩm số.
* Nhiều cửa hàng và nhà bán hàng.
* Khuyến mãi.
* Voucher.
* Flash sale.
* Giỏ hàng.
* Thanh toán.
* Quản lý đơn hàng.
* Seller dashboard.
* Admin dashboard.

Website có thể tham khảo các UX pattern phổ biến của marketplace lớn, nhưng tuyệt đối không sao chép trực tiếp màu sắc, nhận diện, logo, bố cục hoặc component đặc trưng của Shopee, Lazada, TikTok Shop hay bất kỳ thương hiệu nào khác.

# 1. PHÂN TÍCH PROJECT TRƯỚC KHI TẠO RULE

Trước khi tạo hoặc sửa file, hãy phân tích toàn bộ project:

* Framework và phiên bản.
* Package manager.
* App Router hoặc Pages Router.
* TypeScript hoặc JavaScript.
* CSS, SCSS, Tailwind CSS hoặc CSS Modules.
* Thư viện UI.
* Thư viện icon.
* Font hiện tại.
* Theme hiện tại.
* Design token hiện tại.
* Component dùng chung.
* Layout.
* Các page đã có.
* Màu sắc đang được sử dụng.
* Các giá trị style bị hard-code.
* Component bị trùng lặp.
* Các vấn đề responsive.
* Các vấn đề accessibility.
* Các vấn đề về UX marketplace.
* Nội dung tiếng Anh đang hiển thị cho người dùng Việt Nam.

Sau khi phân tích, hãy ghi lại:

1. Stack hiện tại.
2. Cấu trúc frontend.
3. Những phần có thể giữ lại.
4. Những phần cần sửa.
5. Component nên tái sử dụng.
6. Component nên hợp nhất.
7. Component cần tạo mới.
8. Các rủi ro khi refactor.
9. Hướng triển khai design system phù hợp với code hiện tại.

Không được tự động rebuild toàn bộ giao diện trong nhiệm vụ này.

# 2. TẠO CẤU TRÚC FILE

Hãy tạo hoặc cập nhật cấu trúc phù hợp sau:

```text
.ai/
├── skills/
│   ├── ecommerce-ui/
│   │   └── SKILL.md
│   ├── marketplace-ux/
│   │   └── SKILL.md
│   ├── responsive-ui/
│   │   └── SKILL.md
│   ├── accessibility/
│   │   └── SKILL.md
│   ├── vietnamese-content/
│   │   └── SKILL.md
│   └── frontend-quality/
│       └── SKILL.md
│
├── rules/
│   ├── ui-design-rules.md
│   ├── branding-rules.md
│   ├── color-rules.md
│   ├── component-rules.md
│   ├── responsive-rules.md
│   ├── ecommerce-ux-rules.md
│   ├── form-rules.md
│   ├── table-rules.md
│   ├── feedback-state-rules.md
│   ├── accessibility-rules.md
│   ├── content-rules.md
│   └── frontend-code-rules.md
│
└── design-system/
    ├── design-tokens.md
    ├── brand-direction.md
    ├── colors.md
    ├── typography.md
    ├── spacing.md
    ├── radius-shadow.md
    ├── components.md
    ├── layouts.md
    ├── icons.md
    ├── component-inventory.md
    └── examples.md
```

Đồng thời tạo:

```text
.ai/ui-audit.md
.ai/ui-implementation-plan.md
```

Nếu project dùng Cursor, hãy tạo hoặc cập nhật:

```text
.cursor/rules/
```

Nếu project dùng Claude Code, hãy tạo hoặc cập nhật:

```text
CLAUDE.md
```

Nếu dùng công cụ AI khác, hãy tạo file rule theo định dạng phù hợp.

Các file phải tham chiếu lẫn nhau hợp lý, không lặp lại toàn bộ nội dung.

# 3. ĐỊNH HƯỚNG THIẾT KẾ

Thiết kế theo hướng:

* Marketplace hiện đại.
* Bán nhiều ngành hàng.
* Mật độ thông tin vừa đến cao.
* Hiển thị nhiều sản phẩm nhưng không rối.
* Dễ tìm kiếm.
* Dễ so sánh sản phẩm.
* Dễ nhận biết giá và khuyến mãi.
* Tối ưu hành vi mua hàng nhanh.
* Có nhận diện thương hiệu riêng.
* Phù hợp người dùng Việt Nam.
* Có thể mở rộng cho nhiều seller.
* Có thể dùng lâu dài trong production.

Phong cách hình ảnh:

* Hiện đại.
* Sạch sẽ.
* Gọn gàng.
* Thân thiện.
* Chuyên nghiệp.
* Card rõ ràng.
* Typography dễ đọc.
* Border nhẹ.
* Shadow tiết chế.
* Bo góc vừa phải.
* Không lạm dụng gradient.
* Không lạm dụng glassmorphism.
* Không biến giao diện marketplace thành landing page SaaS.
* Không để quá nhiều khoảng trắng làm giảm số lượng sản phẩm hiển thị.
* Không bo tròn mọi section thành các khối quá lớn.
* Không dùng bảng màu cam đỏ làm mặc định chỉ vì website có cấu trúc marketplace.

# 4. PHÂN TÍCH VÀ CHỌN NHẬN DIỆN MÀU

Không được mặc định sử dụng màu giống Shopee.

Trước khi định nghĩa màu, hãy kiểm tra:

* Logo hiện tại.
* Màu thương hiệu hiện có.
* Ngành hàng chính.
* Đối tượng người dùng.
* Phong cách sản phẩm.
* Hình ảnh banner.
* Mức độ trẻ trung hoặc cao cấp của thương hiệu.
* Khả năng hiển thị trên giao diện có mật độ thông tin cao.
* Độ tương phản.
* Accessibility.
* Khả năng dùng màu lâu dài khi mở rộng hệ thống.

Nếu project đã có màu thương hiệu phù hợp, hãy chuẩn hóa màu đó thành hệ token.

Nếu project chưa có nhận diện rõ ràng, hãy đề xuất ba hướng màu khác nhau và chọn một hướng phù hợp nhất.

## Hướng A: Xanh dương hiện đại

Phù hợp với marketplace tổng hợp, công nghệ, điện tử và nền tảng cần tạo cảm giác tin cậy.

```css
--color-primary-50: #eff6ff;
--color-primary-100: #dbeafe;
--color-primary-200: #bfdbfe;
--color-primary-300: #93c5fd;
--color-primary-400: #60a5fa;
--color-primary-500: #3b82f6;
--color-primary-600: #2563eb;
--color-primary-700: #1d4ed8;
--color-primary-800: #1e40af;
--color-primary-900: #1e3a8a;
--color-primary-950: #172554;
```

Cảm giác:

* Tin cậy.
* Hiện đại.
* Sạch.
* Phù hợp nhiều ngành hàng.
* Dễ kết hợp với màu sale và voucher.

## Hướng B: Tím chàm sáng tạo

Phù hợp với marketplace trẻ, sản phẩm lifestyle, phụ kiện, thời trang và sản phẩm số.

```css
--color-primary-50: #f5f3ff;
--color-primary-100: #ede9fe;
--color-primary-200: #ddd6fe;
--color-primary-300: #c4b5fd;
--color-primary-400: #a78bfa;
--color-primary-500: #8b5cf6;
--color-primary-600: #7c3aed;
--color-primary-700: #6d28d9;
--color-primary-800: #5b21b6;
--color-primary-900: #4c1d95;
--color-primary-950: #2e1065;
```

Cảm giác:

* Trẻ trung.
* Công nghệ.
* Khác biệt.
* Hiện đại.
* Có thể tạo nhận diện mạnh mà không giống các marketplace phổ biến.

## Hướng C: Xanh ngọc cao cấp

Phù hợp với marketplace gia dụng, sức khỏe, mỹ phẩm, thực phẩm và lifestyle.

```css
--color-primary-50: #f0fdfa;
--color-primary-100: #ccfbf1;
--color-primary-200: #99f6e4;
--color-primary-300: #5eead4;
--color-primary-400: #2dd4bf;
--color-primary-500: #14b8a6;
--color-primary-600: #0d9488;
--color-primary-700: #0f766e;
--color-primary-800: #115e59;
--color-primary-900: #134e4a;
--color-primary-950: #042f2e;
```

Cảm giác:

* Tươi mới.
* Sạch.
* Tin cậy.
* Cao cấp vừa phải.
* Dễ kết hợp với nhiều ngành hàng.

## Hướng D: Xanh navy cao cấp

Phù hợp với website muốn có cảm giác chuyên nghiệp, chắc chắn và cao cấp hơn marketplace đại trà.

```css
--color-primary-50: #f8fafc;
--color-primary-100: #f1f5f9;
--color-primary-200: #e2e8f0;
--color-primary-300: #cbd5e1;
--color-primary-400: #94a3b8;
--color-primary-500: #64748b;
--color-primary-600: #475569;
--color-primary-700: #334155;
--color-primary-800: #1e293b;
--color-primary-900: #0f172a;
--color-primary-950: #020617;
```

Có thể kết hợp navy với một accent riêng như:

```css
--color-accent-500: #22c55e;
```

hoặc:

```css
--color-accent-500: #eab308;
```

hoặc:

```css
--color-accent-500: #06b6d4;
```

## Quy trình lựa chọn màu

AI phải:

1. Phân tích nhận diện hiện tại.
2. Đề xuất ba bảng màu.
3. Nêu ưu và nhược điểm của từng bảng.
4. Chọn một bảng màu chính.
5. Giải thích lý do lựa chọn.
6. Tạo token hoàn chỉnh.
7. Kiểm tra contrast.
8. Áp dụng màu theo vai trò, không theo cảm tính.

Không được tự ý chọn màu cam đỏ nếu không có lý do thương hiệu rõ ràng.

# 5. HỆ THỐNG MÀU THEO VAI TRÒ

Design system phải định nghĩa tối thiểu:

* Primary.
* Primary foreground.
* Secondary.
* Accent.
* Neutral.
* Background.
* Surface.
* Surface elevated.
* Border.
* Border strong.
* Text primary.
* Text secondary.
* Text muted.
* Disabled.
* Focus.
* Overlay.
* Success.
* Warning.
* Error.
* Info.
* Sale.
* Flash sale.
* Voucher.
* Freeship.
* Rating.
* Official store.
* New product.
* Best seller.

Màu primary không được dùng cho mọi thành phần.

## Primary

Dùng cho:

* CTA chính.
* Trạng thái active.
* Link quan trọng.
* Focus ring.
* Tab đang chọn.
* Thanh tiến trình chính.

Không dùng primary cho:

* Tất cả badge.
* Tất cả icon.
* Tất cả tiêu đề.
* Tất cả đường viền.
* Toàn bộ background của nhiều section.

## Accent

Accent là màu phụ giúp tạo điểm nhấn nhưng không cạnh tranh với primary.

Dùng cho:

* Chương trình nổi bật.
* Campaign.
* Icon trang trí.
* Highlight nhỏ.
* Một số badge marketing.

## Sale

Màu sale là semantic color riêng, không phụ thuộc màu primary.

Có thể sử dụng đỏ hoặc hồng đỏ cho giá giảm:

```css
--color-sale-50: #fff1f2;
--color-sale-100: #ffe4e6;
--color-sale-500: #f43f5e;
--color-sale-600: #e11d48;
--color-sale-700: #be123c;
```

Màu sale chỉ dùng cho:

* Giá giảm.
* Phần trăm giảm.
* Flash sale.
* Thông tin khuyến mãi quan trọng.

Không biến toàn bộ giao diện thành màu sale.

## Voucher

Voucher có thể sử dụng màu tím, vàng hoặc xanh tùy bảng màu chính.

Voucher phải khác rõ với:

* Error.
* Sale.
* Success.
* Warning.

## Freeship

Có thể sử dụng xanh lá hoặc xanh ngọc.

Freeship không được dùng cùng màu với error.

## Rating

Rating có thể sử dụng vàng hổ phách:

```css
--color-rating: #f59e0b;
```

Không dùng màu rating cho button hoặc trạng thái khác.

# 6. QUY TẮC PHỐI MÀU

Thiết kế giao diện theo tỷ lệ tham khảo:

* 70–80% màu trung tính.
* 10–20% màu thương hiệu.
* 5–10% màu semantic và màu nhấn.

Background chính nên là neutral rất nhạt:

```css
--color-page-background: #f6f7f9;
```

hoặc:

```css
--color-page-background: #f8fafc;
```

Surface chính:

```css
--color-surface: #ffffff;
```

Text chính:

```css
--color-text-primary: #171717;
```

Text phụ:

```css
--color-text-secondary: #525252;
```

Text muted:

```css
--color-text-muted: #737373;
```

Border:

```css
--color-border: #e5e7eb;
```

Quy tắc:

* Không dùng màu đen tuyệt đối cho toàn bộ chữ.
* Không dùng màu xám quá nhạt làm nội dung khó đọc.
* Không dùng primary làm màu nền toàn trang.
* Không dùng gradient cho mọi banner và button.
* Không dùng quá ba màu nhấn trong cùng một khu vực.
* Badge phải sử dụng semantic token.
* Trạng thái lỗi không được chỉ thể hiện bằng màu.
* Màu hover, active và focus phải được định nghĩa sẵn.
* Màu disabled phải đủ rõ nhưng không gây nhầm với trạng thái active.
* Màu dark mode chỉ tạo nếu project thực sự cần dark mode.

# 7. TYPOGRAPHY

Ưu tiên font hỗ trợ tiếng Việt tốt:

* Inter.
* Be Vietnam Pro.
* Manrope.
* Roboto.
* Geist.

Chỉ dùng tối đa hai font family.

Định nghĩa:

* Display.
* Heading 1.
* Heading 2.
* Heading 3.
* Heading 4.
* Body large.
* Body medium.
* Body small.
* Label.
* Caption.
* Price large.
* Price medium.
* Price small.

Quy tắc:

* Tên sản phẩm trong card tối đa hai dòng.
* Giá bán nổi bật hơn giá gốc.
* Giá gốc dùng line-through và màu muted.
* Không dùng quá nhiều font weight.
* Không viết hoa đoạn dài.
* Text phụ phải đủ tương phản.
* Tiêu đề section ngắn, rõ và dễ quét.
* Không dùng font size quá lớn làm giảm mật độ sản phẩm.

# 8. SPACING, RADIUS VÀ SHADOW

Dùng spacing theo hệ 4px:

```text
0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64
```

Không tùy tiện dùng các giá trị như:

```text
13px, 17px, 19px, 27px, 29px
```

Radius:

```text
xs: 4px
sm: 6px
md: 8px
lg: 12px
xl: 16px
pill: 999px
```

Khuyến nghị:

* Product card: 6–10px.
* Button: 6–8px.
* Input: 6–8px.
* Modal: 12–16px.
* Badge: 4px hoặc pill.
* Banner: 8–12px.

Không bo tròn quá lớn cho toàn bộ section.

Shadow:

* xs.
* sm.
* md.
* lg.
* focus ring.

Product card mặc định nên dùng border nhẹ.

Shadow chỉ tăng nhẹ khi hover trên desktop.

Không dùng shadow đậm trên mọi component.

# 9. LAYOUT MARKETPLACE

Desktop:

```text
Max-width: 1200–1440px
Padding ngang: 16–32px
```

Tablet:

```text
Padding ngang: 16–24px
```

Mobile:

```text
Padding ngang: 12–16px
```

Product grid:

```text
>= 1440px: 6 cột
1200–1439px: 5 hoặc 6 cột
992–1199px: 4 hoặc 5 cột
768–991px: 3 hoặc 4 cột
480–767px: 2 cột
< 480px: 2 cột
```

Không áp dụng máy móc một cấu hình grid cho mọi trang.

Trang chủ có thể bao gồm:

1. Utility bar.
2. Main header.
3. Search bar.
4. Category navigation.
5. Hero banner.
6. Banner phụ.
7. Shortcut dịch vụ.
8. Danh mục nổi bật.
9. Flash sale.
10. Voucher.
11. Official store.
12. Thương hiệu nổi bật.
13. Sản phẩm bán chạy.
14. Gợi ý hôm nay.
15. Product grid.
16. Footer.

Không bắt buộc hiển thị tất cả section khi không có dữ liệu thật.

# 10. HEADER VÀ NAVIGATION

Desktop header có thể gồm:

* Logo.
* Search bar lớn.
* Gợi ý từ khóa.
* Danh mục.
* Tài khoản.
* Đơn hàng.
* Yêu thích.
* Thông báo.
* Giỏ hàng.
* Seller center.

Mobile header:

* Logo hoặc nút quay lại.
* Search.
* Cart.
* Bottom navigation nếu phù hợp.

Quy tắc:

* Header sticky không được chiếm quá nhiều chiều cao.
* Search phải là thành phần nổi bật.
* Không nhồi quá nhiều link nhỏ trên mobile.
* Navigation phải dùng màu thương hiệu có kiểm soát.
* Không sử dụng nguyên một thanh header cam đỏ chỉ để tạo cảm giác giống Shopee.
* Logo và search phải có hierarchy rõ ràng.

# 11. PRODUCT CARD

Product card phải hỗ trợ:

* Ảnh sản phẩm.
* Placeholder khi ảnh lỗi.
* Tên sản phẩm.
* Giá bán.
* Giá gốc.
* Phần trăm giảm.
* Rating.
* Số lượng đã bán.
* Địa điểm người bán.
* Freeship.
* Official store.
* Yêu thích.
* Voucher.
* Trạng thái hết hàng.
* Thêm vào giỏ nếu phù hợp.
* Skeleton loading.

Quy tắc:

* Ảnh dùng aspect ratio nhất quán.
* Tên sản phẩm tối đa hai dòng.
* Phần tên có chiều cao đồng đều.
* Giá bán là nội dung nổi bật nhất sau ảnh.
* Không hiển thị quá nhiều badge.
* Chỉ hiển thị hai hoặc ba badge quan trọng nhất.
* Badge không che phần quan trọng của ảnh.
* Card trong cùng grid phải cân bằng chiều cao.
* Hover không làm layout bị nhảy.
* Mobile không phụ thuộc hover.
* Sản phẩm hết hàng phải có trạng thái rõ.
* Không dùng màu primary cho tất cả thông tin trong card.
* Giá sale sử dụng token sale.
* Official store sử dụng token official.
* Freeship sử dụng token freeship.
* Rating sử dụng token rating.

Thứ tự badge:

1. Official store.
2. Flash sale.
3. Giảm giá.
4. Freeship.
5. Yêu thích.
6. Voucher.

# 12. TRANG CHI TIẾT SẢN PHẨM

Bắt buộc có quy tắc cho:

* Gallery ảnh.
* Thumbnail.
* Zoom.
* Tên sản phẩm.
* Rating.
* Số đánh giá.
* Số lượng đã bán.
* Giá.
* Giá gốc.
* Giảm giá.
* Flash sale.
* Voucher.
* Vận chuyển.
* Biến thể.
* Số lượng.
* Tồn kho.
* Thêm vào giỏ.
* Mua ngay.
* Chính sách đổi trả.
* Bảo hành.
* Thông tin người bán.
* Mô tả.
* Thông số.
* Đánh giá.
* Hỏi đáp.
* Sản phẩm liên quan.

Quy tắc:

* “Mua ngay” là CTA chính.
* “Thêm vào giỏ” là CTA phụ.
* Wishlist là hành động cấp ba.
* Không cho mua khi chưa chọn biến thể bắt buộc.
* Biến thể hết hàng phải bị disable.
* Giá cập nhật đúng theo biến thể.
* Mobile có sticky action bar nếu phù hợp.
* Không dùng cả hai CTA cùng màu và cùng độ nổi bật.
* CTA dùng màu thương hiệu đã chọn, không mặc định cam đỏ.

# 13. SEARCH, CATEGORY VÀ FILTER

Search hỗ trợ:

* Placeholder tiếng Việt.
* Gợi ý tìm kiếm.
* Lịch sử tìm kiếm.
* Từ khóa phổ biến.
* Loading.
* Empty state.
* Xóa nội dung.
* Keyboard navigation.
* Debounce.

Trang danh mục:

* Breadcrumb.
* Tiêu đề.
* Số kết quả.
* Filter.
* Sort.
* Product grid.
* Pagination hoặc load more.
* Empty state.
* Error state.

Filter:

* Danh mục.
* Khoảng giá.
* Thương hiệu.
* Rating.
* Nơi bán.
* Freeship.
* Official store.
* Tình trạng sản phẩm.
* Thuộc tính động.

Mobile sử dụng drawer hoặc bottom sheet.

Filter đang chọn phải hiển thị thành chip.

Màu chip active sử dụng primary hoặc secondary token, không tự hard-code.

# 14. CART VÀ CHECKOUT

Cart cần hỗ trợ:

* Chọn sản phẩm.
* Chọn theo shop.
* Chọn toàn bộ.
* Thay đổi số lượng.
* Xóa.
* Lưu để mua sau.
* Phân loại.
* Giá.
* Voucher shop.
* Voucher hệ thống.
* Phí vận chuyển.
* Tổng tiền.
* Sản phẩm hết hàng.
* Thay đổi giá.

Checkout gồm:

1. Địa chỉ.
2. Sản phẩm theo shop.
3. Vận chuyển.
4. Voucher.
5. Thanh toán.
6. Ghi chú.
7. Tổng kết.
8. Đặt hàng.

Quy tắc:

* Không double submit.
* Button có loading.
* Validation gần field.
* Không giấu phí.
* Tổng tiền rõ ràng.
* Không dùng toast làm cách duy nhất để báo lỗi quan trọng.
* CTA đặt hàng sử dụng primary token.
* Warning, error và discount phải dùng semantic token riêng.

# 15. FORM

Mỗi field phải có:

* Label.
* Required indicator.
* Placeholder.
* Helper text.
* Error message.
* Disabled.
* Readonly.
* Loading nếu cần.

Trạng thái:

* Default.
* Hover.
* Focus.
* Filled.
* Error.
* Success.
* Disabled.
* Readonly.

Quy tắc:

* Không dùng placeholder thay label.
* Focus state phải rõ.
* Error không chỉ dùng màu đỏ.
* Không reset toàn form khi một request lỗi.
* Số điện thoại phải phù hợp người dùng Việt Nam.
* Tiền tệ và ngày tháng phải định dạng thống nhất.
* Border focus dùng primary token.
* Border error dùng error token.
* Border success dùng success token.

# 16. BUTTON

Các loại button:

* Primary.
* Secondary.
* Outline.
* Ghost.
* Destructive.
* Link.
* Icon button.

Kích thước:

* Small.
* Medium.
* Large.

Quy tắc:

* Mỗi khu vực chỉ có một CTA primary nổi bật.
* Button có hover, active, focus, disabled và loading.
* Loading không làm thay đổi chiều rộng.
* Icon button có aria-label.
* Vùng bấm mobile tối thiểu khoảng 44x44px.
* Destructive dùng error token.
* Không dùng error color cho hành động bình thường.
* Không dùng primary cho mọi button.
* Button secondary phải khác primary đủ rõ.
* Button outline không dùng border hard-code.

# 17. TABLE

Dùng table cho:

* Quản lý sản phẩm.
* Quản lý đơn hàng.
* Quản lý user.
* Quản lý voucher.
* Seller dashboard.
* Admin dashboard.

Table cần có:

* Sort.
* Filter.
* Search.
* Pagination.
* Selection.
* Bulk action.
* Loading.
* Empty.
* Error.
* Sticky header.
* Horizontal scroll.
* Responsive.

Quy tắc:

* Không nhồi quá nhiều cột.
* Giá và số canh phải.
* Text canh trái.
* Action ở cuối.
* Status dùng badge có text.
* Mobile có thể chuyển row thành card.
* Không chỉ dùng màu để biểu thị trạng thái.
* Header table dùng neutral surface, không bắt buộc dùng màu primary.

# 18. FEEDBACK STATE

Mọi component gọi API phải có:

* Initial.
* Loading.
* Success.
* Empty.
* Error.
* Partial error.
* Disabled.
* Offline nếu phù hợp.

Loading:

* Skeleton cho nội dung có cấu trúc.
* Spinner cho hành động ngắn.
* Tránh layout shift.

Empty state:

* Icon hoặc illustration nhẹ.
* Tiêu đề.
* Mô tả.
* CTA nếu có.

Error state:

* Nêu rõ vấn đề.
* Có hướng xử lý.
* Có nút thử lại nếu phù hợp.
* Không hiển thị stack trace.
* Không chỉ ghi “Có lỗi xảy ra”.

Toast:

* Thêm vào giỏ thành công.
* Lưu thay đổi.
* Sao chép mã.
* Hành động nhỏ hoàn tất.

Toast phải dùng semantic color tương ứng.

# 19. RESPONSIVE

Kiểm tra tối thiểu:

```text
320px
375px
390px
430px
768px
1024px
1280px
1440px
```

Không được:

* Tràn ngang.
* Button quá nhỏ.
* Text cắt không kiểm soát.
* Modal vượt màn hình.
* Table bị nén không đọc được.
* Sticky element che nội dung.
* Header chiếm quá nhiều chiều cao.
* Product card lệch chiều cao nghiêm trọng.
* Dùng nguyên layout desktop rồi thu nhỏ.

# 20. ACCESSIBILITY

Bắt buộc:

* Semantic HTML.
* Keyboard navigation.
* Focus visible.
* Alt text.
* Label cho input.
* Aria-label cho icon button.
* Heading hierarchy.
* Focus trap cho dialog.
* Không dùng div thay button.
* Contrast đạt WCAG hợp lý.
* Không chỉ dùng màu để biểu thị trạng thái.
* Hỗ trợ prefers-reduced-motion.
* Vùng bấm đủ lớn.
* Error message được screen reader đọc.
* Kiểm tra contrast của bảng màu đã chọn trước khi chốt design system.

# 21. NỘI DUNG TIẾNG VIỆT

Tất cả nội dung hiển thị cho người dùng Việt Nam phải được Việt hóa tự nhiên.

Thay:

* Cart → Giỏ hàng.
* Checkout → Thanh toán.
* Add to cart → Thêm vào giỏ.
* Buy now → Mua ngay.
* Wishlist → Yêu thích.
* Order → Đơn hàng.
* Profile → Tài khoản.
* Settings → Cài đặt.
* Submit → Xác nhận.
* Cancel → Hủy.

Quy tắc:

* CTA bắt đầu bằng động từ.
* Không dịch word-by-word.
* Không dùng từ máy móc.
* Error nói rõ vấn đề và cách xử lý.
* Không viết hoa toàn bộ.
* Không dùng quá nhiều dấu chấm than.
* Tiền tệ dùng một định dạng thống nhất.
* Ngày tháng dùng một chuẩn thống nhất.
* Không hiển thị key kỹ thuật.

# 22. COMPONENT ARCHITECTURE

Tổ chức component theo ba tầng:

```text
ui/
  Button
  Input
  Select
  Checkbox
  Radio
  Badge
  Modal
  Drawer
  Tooltip
  Skeleton
  EmptyState
  ErrorState

commerce/
  ProductCard
  ProductGrid
  ProductGallery
  PriceDisplay
  DiscountBadge
  Rating
  VoucherCard
  ShopCard
  CartItem
  OrderItem
  QuantitySelector
  VariantSelector
  ShippingOption

features/
  SearchBar
  CategoryMenu
  FlashSale
  CartSummary
  CheckoutSummary
  AddressSelector
  FilterPanel
  SortToolbar
  ReviewSection
```

Quy tắc:

* Không để page component quá lớn.
* Không lặp JSX.
* Không lặp style.
* Không hard-code màu.
* Không truyền quá nhiều boolean props.
* Dùng variant rõ ràng.
* Props có TypeScript type.
* Primitive UI không phụ thuộc business data.
* Ưu tiên composition.
* Chỉ dùng `"use client"` khi cần.
* Tách server và client component hợp lý.

# 23. CODE QUALITY

Bắt buộc:

* TypeScript strict nếu project hỗ trợ.
* Không dùng `any` tùy tiện.
* Không bỏ qua lỗi TypeScript.
* Không hard-code màu.
* Không hard-code URL.
* Không hard-code text lặp lại.
* Không copy-paste component.
* Không để console.log trong production.
* Không để mock data trong production.
* Không sửa API contract nếu không cần.
* Không xóa code chưa hiểu.
* Không đổi business logic ngoài phạm vi.

Ưu tiên:

* Reusable.
* Maintainable.
* Accessible.
* Responsive.
* Type-safe.
* Performance-conscious.
* SEO-friendly.
* Production-ready.

# 24. DESIGN TOKEN

Token phải được triển khai bằng một trong các cách:

* CSS variables.
* Tailwind theme.
* Theme provider hiện tại.
* Token file TypeScript.

Ví dụ:

```css
:root {
  --color-primary: var(--color-primary-600);
  --color-primary-hover: var(--color-primary-700);
  --color-primary-active: var(--color-primary-800);
  --color-primary-foreground: #ffffff;

  --color-background: #f8fafc;
  --color-surface: #ffffff;
  --color-surface-elevated: #ffffff;

  --color-text-primary: #171717;
  --color-text-secondary: #525252;
  --color-text-muted: #737373;

  --color-border: #e5e7eb;
  --color-border-strong: #d1d5db;

  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-error: #dc2626;
  --color-info: #0284c7;

  --color-sale: #e11d48;
  --color-rating: #f59e0b;
  --color-freeship: #059669;
}
```

Đây chỉ là ví dụ cấu trúc.

AI phải chọn giá trị cuối cùng dựa trên bảng màu thương hiệu đã được phân tích.

# 25. COMPONENT INVENTORY

Tạo file:

```text
.ai/design-system/component-inventory.md
```

Bảng gồm:

| Component | Đường dẫn | Trạng thái | Vấn đề | Hướng xử lý |
| --------- | --------- | ---------- | ------ | ----------- |

Trạng thái:

* Giữ.
* Sửa.
* Gộp.
* Xóa.
* Tạo mới.

Phân loại:

* Primitive UI.
* Layout.
* Navigation.
* Commerce.
* Form.
* Feedback.
* Data display.
* Admin.
* Seller.
* Marketing.

# 26. UI AUDIT

Tạo:

```text
.ai/ui-audit.md
```

Nội dung:

1. Tổng quan.
2. Vấn đề nghiêm trọng.
3. Vấn đề nhận diện thương hiệu.
4. Vấn đề màu sắc.
5. Vấn đề consistency.
6. Vấn đề responsive.
7. Vấn đề accessibility.
8. Vấn đề nội dung tiếng Việt.
9. Component duplication.
10. Design token.
11. Performance.
12. Danh sách ưu tiên.

Mức ưu tiên:

* P0: gây lỗi hoặc chặn người dùng.
* P1: ảnh hưởng UX lớn.
* P2: ảnh hưởng consistency.
* P3: polish.

Mỗi vấn đề cần có:

* File liên quan.
* Hiện trạng.
* Tác động.
* Giải pháp.
* Mức ưu tiên.
* Rủi ro.

# 27. IMPLEMENTATION PLAN

Tạo:

```text
.ai/ui-implementation-plan.md
```

Chia thành:

## Phase 1: Brand foundation

* Phân tích nhận diện.
* Chọn bảng màu.
* Tạo color tokens.
* Typography.
* Spacing.
* Radius.
* Shadow.
* Icon rules.

## Phase 2: UI foundation

* Container.
* Button.
* Input.
* Select.
* Badge.
* Modal.
* Drawer.
* Skeleton.
* Empty state.
* Error state.

## Phase 3: Commerce core

* Product card.
* Product grid.
* Price.
* Discount.
* Rating.
* Voucher.
* Quantity.
* Variant.

## Phase 4: Discovery

* Header.
* Search.
* Category.
* Filter.
* Sort.
* Homepage sections.

## Phase 5: Purchase flow

* Cart.
* Checkout.
* Address.
* Payment.
* Order confirmation.

## Phase 6: Account

* Profile.
* Address.
* Orders.
* Wishlist.
* Notifications.

## Phase 7: Seller và Admin

* Dashboard.
* Table.
* Product management.
* Order management.
* Voucher management.

## Phase 8: Quality

* Responsive.
* Accessibility.
* Performance.
* SEO.
* Testing.
* Polish.

Mỗi task phải có:

* Mục tiêu.
* File liên quan.
* Dependency.
* Acceptance criteria.
* Mức ưu tiên.
* Rủi ro.
* Trạng thái.

# 28. CẤU TRÚC SKILL.MD

Mỗi file `SKILL.md` phải có:

```md
# Tên kỹ năng

## Mục tiêu

## Khi nào áp dụng

## Nguyên tắc bắt buộc

## Quy trình thực hiện

## Checklist trước khi code

## Checklist sau khi code

## Những lỗi phải tránh

## Ví dụ đúng

## Ví dụ sai

## Tiêu chí hoàn thành
```

Các skill cần tập trung:

## ecommerce-ui

* Product card.
* Product grid.
* Price.
* Sale.
* Voucher.
* Cart.
* Checkout.
* Product detail.
* Category.
* Search.

## marketplace-ux

* Mật độ thông tin.
* Nhiều ngành hàng.
* Nhiều seller.
* Trust signal.
* Khuyến mãi.
* Discovery.
* Conversion.
* Navigation.

## responsive-ui

* Breakpoint.
* Mobile layout.
* Table responsive.
* Drawer.
* Bottom navigation.
* Sticky CTA.
* Touch target.

## accessibility

* Keyboard.
* Focus.
* Semantic HTML.
* Contrast.
* Screen reader.
* Form.
* Dialog.
* Kiểm tra màu.

## vietnamese-content

* Việt hóa.
* Microcopy.
* CTA.
* Error message.
* Empty state.
* Tiền tệ.
* Ngày giờ.

## frontend-quality

* TypeScript.
* Component architecture.
* Performance.
* SEO.
* Testing.
* Clean code.
* Production readiness.

# 29. RULE PHẢI NGẮN VÀ CÓ TÍNH BẮT BUỘC

Mỗi rule viết theo cấu trúc:

```md
## Tên rule

### Bắt buộc

- ...

### Không được

- ...

### Ưu tiên

- ...

### Checklist

- [ ] ...
```

Không viết rule dưới dạng lý thuyết dài dòng.

Rule phải đủ rõ để AI agent đọc và thực hiện mà không cần đoán.

# 30. ACCEPTANCE CRITERIA

Chỉ coi nhiệm vụ hoàn thành khi:

* Đã phân tích stack thực tế.
* Đã phân tích màu và nhận diện hiện tại.
* Đã đề xuất ba bảng màu.
* Đã chọn một bảng màu phù hợp.
* Không mặc định dùng màu giống Shopee.
* Có primary, secondary và accent riêng.
* Có semantic color riêng cho sale, voucher, freeship, rating và status.
* Có contrast hợp lý.
* Có design token cụ thể.
* Có typography.
* Có spacing.
* Có radius và shadow.
* Có rule cho product card.
* Có rule cho form.
* Có rule cho table.
* Có loading, empty và error state.
* Có responsive rule.
* Có accessibility rule.
* Có Vietnamese content rule.
* Có component architecture.
* Có component inventory.
* Có UI audit.
* Có implementation plan.
* Không thay đổi business logic.
* Không tạo mock data trong production.
* Không sao chép nhận diện của marketplace khác.
* Các tài liệu không mâu thuẫn nhau.

# 31. THỨ TỰ THỰC HIỆN

Thực hiện lần lượt:

1. Đọc toàn bộ project.
2. Xác định stack và convention.
3. Phân tích giao diện hiện tại.
4. Phân tích logo và màu hiện tại.
5. Đề xuất ba hướng nhận diện màu.
6. Chọn một hướng phù hợp nhất.
7. Tạo design tokens.
8. Tạo brand direction.
9. Tạo các file SKILL.
10. Tạo các file RULE.
11. Tạo component inventory.
12. Tạo UI audit.
13. Tạo implementation plan.
14. Kiểm tra các tài liệu có mâu thuẫn không.
15. Chạy lint hoặc validation nếu có.
16. Tổng kết các file đã tạo.

Không tự ý rebuild toàn bộ giao diện trong nhiệm vụ này.

# 32. KẾT QUẢ CUỐI CÙNG

Sau khi hoàn thành, trả về:

## A. Project analysis

* Stack.
* Cấu trúc frontend.
* Vấn đề chính.
* Những phần có thể giữ lại.

## B. Brand analysis

* Nhận diện hiện tại.
* Ba bảng màu được đề xuất.
* Ưu và nhược điểm.
* Bảng màu được chọn.
* Lý do lựa chọn.

## C. Files created

Liệt kê từng file đã tạo hoặc cập nhật.

## D. Design decisions

* Primary color.
* Secondary color.
* Accent color.
* Semantic colors.
* Font.
* Spacing.
* Radius.
* Shadow.
* Container.
* Grid.
* Product card.
* Responsive approach.

## E. Important rules

Tóm tắt 10–20 rule quan trọng nhất mà AI agent sau phải tuân theo.

## F. Recommended next task

Đề xuất task đầu tiên để triển khai foundation và component dùng chung.

Không chỉ mô tả những file cần tạo.

Hãy thực sự tạo các file trong project.

Không hỏi lại người dùng nếu chỉ thiếu thông tin nhỏ. Hãy đưa ra giả định hợp lý, ghi rõ giả định và tiếp tục thực hiện.
