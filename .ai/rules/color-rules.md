## Quy tắc màu sắc

### Bắt buộc

- Dùng palette Azure được chọn và các token vai trò trong [colors](../design-system/colors.md); khi triển khai, ánh xạ token CSS sang Tailwind thay vì rải mã hex trong TSX.
- Dùng `background` cho nền ứng dụng, `surface`/`surface-elevated` cho bề mặt, `text-primary`/`text-secondary`/`text-muted` cho chữ và `border`/`border-strong` cho phân tách.
- Dùng màu semantic đúng nghĩa: success, warning, error, info; các vai trò commerce như sale, voucher, freeship, rating, official, new và best-seller chỉ xuất hiện khi có dữ liệu tương ứng.
- Văn bản thường phải đạt WCAG AA: tối thiểu 4.5:1; chữ lớn tối thiểu 3:1; thành phần tương tác và focus indicator tối thiểu 3:1 so với màu kề.
- Trạng thái không được truyền đạt chỉ bằng màu; kết hợp chữ, icon, hình dạng hoặc mô tả.
- Trạng thái hover, active, disabled và focus phải dùng cùng thang màu và được định nghĩa có hệ thống.

### Không được

- Không dùng trực tiếp `blue-*`, `red-*`, `green-*`, `emerald-*` hoặc mã hex rời rạc trong feature/page khi đã có token ngữ nghĩa.
- Không dùng primary cho mọi badge/trạng thái; không dùng warning hoặc màu sao vàng làm màu chữ nhỏ nếu chưa đủ tương phản.
- Không đặt chữ trắng trên màu nhạt hoặc chữ muted hiện tại trên nền trang nếu tỷ lệ tương phản không đạt.
- Không dùng opacity để “sửa nhanh” trạng thái disabled nếu kết quả làm mất khả năng đọc.
- Không thêm biến thể màu commerce khi API không có trạng thái thật để kích hoạt nó.

### Ưu tiên

- Ưu tiên token theo vai trò hơn token theo tên màu; feature chỉ biết `error`, không cần biết đó là sắc đỏ nào.
- Ưu tiên nền semantic nhẹ với chữ semantic đậm cho badge/alert; dùng màu fill đậm cho CTA hoặc điểm nhấn cần thiết.
- Ưu tiên kiểm tra cặp màu thực tế bằng công cụ contrast, gồm cả hover/focus/disabled và nền `#F6F8FB`.
- Ưu tiên di chuyển dần từ class màu cũ qua primitive dùng chung để hạn chế rủi ro hồi quy.

### Checklist

- [ ] Mọi màu mới có tên vai trò và nguồn trong design system.
- [ ] Không có hex/class màu ngữ nghĩa rải trực tiếp trong page/feature.
- [ ] Tất cả cặp chữ/nền đạt WCAG AA.
- [ ] Hover, active, disabled và focus vẫn phân biệt rõ.
- [ ] Ý nghĩa vẫn hiểu được khi không nhận biết màu.
- [ ] Badge commerce chỉ hiển thị theo dữ liệu thật.
