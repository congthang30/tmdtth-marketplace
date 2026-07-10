# Spacing

## Hệ 4px

Scale cho phép: `0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64px`. Token chuẩn nằm tại [`design-tokens.md`](design-tokens.md).

| Ngữ cảnh | Khoảng cách khuyến nghị |
| --- | --- |
| icon ↔ label | 6–8px |
| label ↔ control | 6–8px |
| các field trong form | 16–20px |
| nội dung trong control | 8px dọc, 12–16px ngang |
| nội dung product card | 8–12px |
| nội dung panel/card | 16–24px |
| khoảng giữa section | 24–40px |
| page top/bottom | 24px mobile, 32–48px desktop |

## Quy tắc

- Chọn token gần nhất; không sinh giá trị 13, 17, 19, 27 hoặc 29px chỉ để khớp mắt.
- Khoảng trắng phải hỗ trợ hierarchy nhưng không làm giảm mật độ product grid.
- Dùng `gap` cho layout; tránh margin chồng chéo giữa child.
- Không dùng spacing để sửa lỗi cấu trúc hoặc bù cho element position sai.
- Touch target tối thiểu 44×44px; icon có thể 18–20px bên trong target lớn hơn.
- Padding container responsive quy định tại [`layouts.md`](layouts.md).
