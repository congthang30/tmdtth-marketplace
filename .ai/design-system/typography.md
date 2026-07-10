# Typography

## Font

- Font chính: **Inter Variable**, tải thực sự với Vietnamese subset; hiện config có tên Inter nhưng chưa thấy file hoặc import font.
- Fallback: `ui-sans-serif, system-ui, "Segoe UI", Roboto, Arial, sans-serif`.
- Chỉ một font family trong UI hiện tại. Không tải font chỉ để trang trí.
- Weight dùng: 400, 500, 600, 700. Tránh synthetic weight và tải cả family không cần thiết.

## Type scale

| Style | Size / line-height | Weight | Dùng cho |
| --- | --- | ---: | --- |
| Display | 36 / 44px | 700 | hero/campaign hiếm dùng |
| H1 | 30 / 38px | 700 | một tiêu đề trang |
| H2 | 24 / 32px | 700 | section chính |
| H3 | 20 / 28px | 600 | panel/card group |
| H4 | 18 / 26px | 600 | heading nhỏ |
| Body large | 16 / 24px | 400 | mô tả quan trọng |
| Body medium | 14 / 22px | 400 | nội dung mặc định |
| Body small | 13 / 20px | 400 | metadata dày |
| Label | 14 / 20px | 500 | label và control |
| Caption | 12 / 18px | 400 | chú thích phụ |
| Price large | 28 / 34px | 700 | giá trên PDP |
| Price medium | 20 / 28px | 700 | giá nổi bật/list |
| Price small | 16 / 24px | 600 | product card |

Giá trị token máy đọc nằm tại [`design-tokens.md`](design-tokens.md).

## Quy tắc nội dung

- Mỗi page có một `h1`; heading tăng cấp tuần tự và không dùng chỉ để tạo style.
- Product title trong grid tối đa hai dòng, giữ chiều cao ổn định; title đầy đủ vẫn accessible qua link/detail.
- Giá bán nổi bật hơn giá gốc; giá gốc line-through, dùng text muted, không nhỏ dưới 12px.
- Không dùng uppercase cho câu dài; badge chỉ viết ngắn, sentence case tiếng Việt.
- Trên mobile, H1 có thể giảm còn 24/32px; không scale body dưới 14px cho nội dung quan trọng.
- Căn phải số trong table; dùng tabular numerals cho tiền/số lượng nếu font hỗ trợ.

## Hiệu năng font

- Self-host WOFF2 hoặc dùng nguồn được phê duyệt; preload đúng file cần thiết.
- Dùng `font-display: swap`; khai báo metrics/fallback khi có thể để giảm layout shift.
- Không chặn render bằng nhiều weight tĩnh.
