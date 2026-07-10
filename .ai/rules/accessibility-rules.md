## Quy tắc khả năng tiếp cận

### Bắt buộc

- Mục tiêu tối thiểu WCAG 2.2 AA; ưu tiên semantic HTML trước ARIA và tuân theo [components](../design-system/components.md), [colors](../design-system/colors.md).
- Mọi chức năng phải dùng được bằng bàn phím với thứ tự focus hợp lý và focus-visible rõ; không có keyboard trap ngoài focus trap có chủ đích trong dialog.
- Nút/link/icon-only control phải có accessible name; vùng chạm mục tiêu tối thiểu 44 x 44 px khi khả thi, đặc biệt trên mobile.
- Modal/dialog phải có tên/mô tả liên kết, focus ban đầu, giữ focus bên trong, Escape, trả focus về trigger và khóa cuộn nền phù hợp.
- Form tuân theo [form-rules](form-rules.md); table theo [table-rules](table-rules.md); status/toast theo [feedback-state-rules](feedback-state-rules.md).
- Ảnh sản phẩm có alt mô tả ngắn theo dữ liệu; ảnh trang trí dùng alt rỗng; icon trang trí phải ẩn khỏi accessibility tree.
- Heading theo thứ bậc, landmark/nav có nhãn khi lặp, link có mục đích rõ và ngôn ngữ tài liệu đặt là tiếng Việt.
- Tôn trọng zoom 200%, text reflow, high contrast hợp lý và `prefers-reduced-motion`.

### Không được

- Không dùng `div`/`span` có click thay button/link hoặc dùng positive `tabIndex` để ép thứ tự.
- Không xóa outline nếu chưa có focus indicator thay thế đạt tương phản.
- Không truyền đạt lỗi, trạng thái, lựa chọn hoặc dữ liệu chỉ bằng màu/icon.
- Không đặt `aria-label` trùng hoặc mâu thuẫn với label nhìn thấy; không thêm ARIA thừa để bù semantic sai.
- Không auto-focus gây bất ngờ, tự động chuyển trang hoặc animation nhấp nháy.
- Không chấp nhận component dùng chung chưa đáp ứng bàn phím/focus rồi để từng consumer tự vá.

### Ưu tiên

- Ưu tiên khắc phục primitive dùng chung trước để lan tỏa cải thiện đến mọi màn hình.
- Ưu tiên test thủ công bằng keyboard và screen reader tối thiểu cho login, catalog, product detail, cart, checkout và thao tác quản trị chính.
- Ưu tiên text link/nút mô tả hành động; tooltip chỉ bổ trợ, không chứa thông tin thiết yếu duy nhất.
- Ưu tiên test tự động như axe kết hợp kiểm tra thủ công; không xem điểm tự động là bằng chứng hoàn tất duy nhất.

### Checklist

- [ ] Hoàn thành toàn bộ luồng bằng keyboard, focus luôn nhìn thấy và hợp lý.
- [ ] Tên/role/value của control, dialog, form và table đúng.
- [ ] Contrast chữ, UI state và focus đạt chuẩn.
- [ ] Ảnh, icon, heading, landmark và live region có semantics phù hợp.
- [ ] Zoom 200%, reflow, reduced motion và mobile vẫn sử dụng được.
- [ ] Đã test primitive và luồng chính bằng công cụ tự động lẫn thủ công.
