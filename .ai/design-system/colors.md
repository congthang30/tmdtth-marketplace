# Hệ thống màu

## Nguồn chuẩn

Toàn bộ giá trị hex nằm tại [`design-tokens.md`](design-tokens.md). File này quy định vai trò và cách dùng; không tạo lại một bảng hex thứ hai.

## Phân vai

| Nhóm | Dùng cho | Không dùng cho |
| --- | --- | --- |
| Primary | CTA chính, link quan trọng, active tab, tiến trình, focus | mọi icon, mọi heading, toàn bộ section |
| Secondary | CTA phụ đậm, navigation phụ, trạng thái trung tính mạnh | thay thế mọi neutral |
| Accent | campaign nhỏ, highlight, icon trang trí | CTA mua hàng mặc định, lỗi |
| Background | nền trang | card hoặc dialog nổi |
| Surface/elevated | card, form panel, popover, dialog | tạo nhiều lớp trắng không có hierarchy |
| Border/strong | phân cách thường/nhấn cấu trúc | biểu thị lỗi hoặc focus |
| Sale/flash sale | giá giảm, % giảm, campaign sale có dữ liệu | brand navigation, lỗi hệ thống |
| Voucher | ưu đãi voucher có dữ liệu thật | warning, sale, error |
| Freeship | miễn phí vận chuyển có dữ liệu thật | success chung hoặc trạng thái kho |
| Rating | điểm và số đánh giá; star dùng `rating-star` | button, warning |
| Official/new/best seller | badge tương ứng khi API cung cấp | suy đoán từ tên hoặc hard-code |

Các feature marketing không có trong response hiện tại chỉ là target state. Không mock voucher, freeship, official store, flash sale hoặc rating để “lấp” giao diện.

## Interaction

- Primary: default `primary` → hover `primary-hover` → active `primary-active`.
- Focus: luôn có outline/ring nhìn thấy được, không thay bằng hover.
- Disabled: giảm prominence bằng token disabled, vẫn giữ label đọc được; không chỉ dùng opacity quá thấp.
- Error/success/warning/info: luôn kết hợp icon hoặc text, không chỉ đổi màu.
- Text trên nền màu đặc phải dùng foreground đã định nghĩa; không tùy ý dùng trắng.

## Contrast đã kiểm tra

| Cặp màu | Tỷ lệ xấp xỉ | Mục đích | Kết quả |
| --- | ---: | --- | --- |
| Trắng / Primary `#0F66AD` | 5.96:1 | CTA chữ thường | Đạt AA |
| Text primary `#17202F` / trắng | 16.35:1 | nội dung chính | Đạt AAA |
| Text muted `#667085` / trắng | 4.97:1 | metadata nhỏ | Đạt AA |
| Text muted `#667085` / background | 4.68:1 | metadata trên nền trang | Đạt AA |
| Success text / success soft | 6.81:1 | alert/badge | Đạt AA |
| Warning text / warning soft | 6.84:1 | alert/badge | Đạt AA |
| Error / error soft | 5.91:1 | alert/badge | Đạt AA |
| Info / info soft | 5.57:1 | alert/badge | Đạt AA |

Tỷ lệ là kiểm tra sRGB tính trước; khi triển khai phải chạy axe/contrast checker trên tổ hợp thực tế, kể cả opacity, font size và trạng thái hover.

## Vấn đề hiện tại cần migration

- `muted: #697386` chỉ khoảng 4.49:1 trên `#F6F8FB`; target đổi thành `#667085`.
- `success: #198754` trên nền green-50 và `warning: #B7791F` trên trắng không đạt cho chữ nhỏ trong một số tổ hợp.
- Màu Tailwind `red-*`, `green-*`, `emerald-*` đang xuất hiện ngoài theme; thay theo semantic token theo từng bước, không rewrite mù.
- `surface` hiện trỏ tới nền trang `#F6F8FB`; target tách `background` và `surface: #FFF`.

Quy tắc bắt buộc: [`../rules/color-rules.md`](../rules/color-rules.md).
