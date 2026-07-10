# Layout marketplace

## Container

- Max width chuẩn: 1280px (`80rem`), căn giữa.
- Desktop ≥1024px: padding ngang 24–32px.
- Tablet 768–1023px: 20–24px.
- Mobile <768px: 12–16px.
- Trang quản trị có thể dùng viewport rộng hơn nếu table cần, nhưng giữ padding và line length đọc được.

## Breakpoint kiểm thử

Luôn kiểm tra `320, 375, 390, 430, 768, 1024, 1280, 1440px`. Breakpoint implementation có thể theo Tailwind; acceptance dựa trên hành vi, không dựa riêng tên breakpoint.

## Product grid

| Viewport | Mục tiêu mặc định |
| --- | --- |
| <480px | 2 cột |
| 480–767px | 2 cột |
| 768–991px | 3 cột, có thể 4 nếu card vẫn ≥180px |
| 992–1199px | 4 cột |
| 1200–1439px | 5 cột |
| ≥1440px | 6 cột khi container/card cho phép |

Không áp dụng máy móc: search result có sidebar có thể giảm một cột; seller catalog và card có action dài cần chiều rộng lớn hơn. Dùng CSS grid và minmax có giới hạn rõ, không để cột co dưới ngưỡng đọc được.

## Public shell

- Desktop: brand → search nổi bật → tài khoản/đơn/giỏ; category/navigation ở hàng riêng khi đủ dữ liệu.
- Mobile: logo hoặc back, search, cart; menu phải có lối truy cập thay vì chỉ `hidden` nav desktop.
- Sticky header/action không che anchor, toast, keyboard hoặc nội dung cuối trang.
- Homepage section (hero, category, campaign, recommendation) chỉ xuất hiện khi có dữ liệu thật.

## Catalog/filter

- Desktop: toolbar hoặc sidebar tùy số filter; active filter hiện chip và có clear.
- Mobile: filter/sort mở drawer/bottom sheet; CTA áp dụng/đặt lại dễ chạm.
- Breadcrumb và search suggestion/history chỉ triển khai khi route/data hỗ trợ.

## Purchase flow

- Cart/checkout nhóm theo hierarchy, tổng kết rõ; desktop có summary column sticky nếu không che footer.
- Mobile dùng một cột, CTA cuối luồng có thể sticky với safe-area; nội dung vẫn truy cập được khi zoom/keyboard mở.
- Không thu nhỏ desktop table/form nguyên xi.

## Dashboard và table

- Ưu tiên 5–7 cột quan trọng; action ở cuối, số/tiền căn phải.
- Tablet có horizontal scroll với chỉ báo; mobile chuyển row thành card hoặc disclosure khi việc đọc table không khả thi.
- Navigation dashboard có label và `aria-label`; không để horizontal scroll là lối duy nhất tới mục quan trọng mà không có affordance.

## Constraint responsive

- Không tràn ngang ở body, modal vượt viewport hoặc control nhỏ hơn 44px trên touch.
- Text truncation có chủ đích; dữ liệu quan trọng có cách xem đầy đủ.
- Image có kích thước/tỷ lệ dự phòng để tránh layout shift.
- Hover enhancement chỉ bật với `@media (hover: hover)`; mọi action hoạt động không cần hover.
