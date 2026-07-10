# Radius và shadow

## Radius

| Token | Giá trị | Dùng cho |
| --- | ---: | --- |
| `xs` | 4px | badge vuông, chi tiết nhỏ |
| `sm` | 6px | product card, compact control |
| `md` | 8px | button, input, card thường |
| `lg` | 12px | panel, drawer |
| `xl` | 16px | modal lớn/hero có chủ đích |
| `pill` | 999px | chip, status; không dùng cho panel |

Product card ưu tiên `sm` hoặc `md`; button/input `md`; modal `lg` hoặc `xl`. Không bo tròn mọi section và không dùng bán kính lớn để thay hierarchy.

## Shadow

| Token | Giá trị | Dùng cho |
| --- | --- | --- |
| `xs` | `0 1px 2px rgb(18 25 38 / 8%)` | panel hiện tại, card tĩnh |
| `sm` | `0 2px 8px rgb(18 25 38 / 10%)` | product card hover desktop |
| `md` | `0 8px 24px rgb(18 25 38 / 12%)` | popover/dropdown |
| `lg` | `0 16px 40px rgb(18 25 38 / 16%)` | dialog/drawer |
| `focus` | `0 0 0 3px rgb(15 102 173 / 25%)` | hỗ trợ focus ring |

## Quy tắc elevation

- Border nhẹ là mặc định của card; shadow không thay border ở nền phức tạp.
- Chỉ tăng shadow khi hover trên thiết bị có hover; không làm card dịch vị trí.
- Modal, drawer và popover cần overlay/elevation rõ; tránh shadow đậm cho mọi component.
- Focus phải dùng outline/ring có tương phản, không chỉ dùng shadow mờ.
- Giá trị chuẩn duy nhất nằm tại [`design-tokens.md`](design-tokens.md).
