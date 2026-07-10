## Quy tắc nội dung tiếng Việt

### Bắt buộc

- Toàn bộ nội dung hướng người dùng phải là tiếng Việt tự nhiên, nhất quán về thuật ngữ, chính tả và dấu câu; tên kỹ thuật chỉ giữ nguyên khi người dùng thực sự cần biết.
- Dùng câu ngắn, chủ động, nêu rõ hành động/kết quả; sentence case cho tiêu đề, label, button và thông báo.
- Dùng thuật ngữ commerce nhất quán: “Sản phẩm”, “Danh mục”, “Giỏ hàng”, “Thanh toán”, “Đơn hàng”, “Người bán”, “Địa chỉ giao hàng”, “Phí vận chuyển”, “Tổng thanh toán”.
- Định dạng tiền Việt Nam bằng locale `vi-VN` và ký hiệu `₫`; ngày/giờ theo `vi-VN`, ghi rõ múi giờ/ngữ cảnh nếu có thể gây nhầm.
- Thông báo lỗi phải giải thích bằng ngôn ngữ người dùng và đưa cách khắc phục; chi tiết kỹ thuật được ghi log, không đẩy lên UI.
- Nội dung động phải đến từ dữ liệu thật và có fallback an toàn; kiểm tra text dài, số lớn, tên sản phẩm/địa chỉ dài.
- Accessible name, alt, aria-live message và metadata cũng phải được Việt hóa, không chỉ text nhìn thấy.

### Không được

- Không trộn tiếng Anh và tiếng Việt như “Apply”, “Reset filters”, “No products found”, “Login” trong cùng trải nghiệm, trừ tên riêng/thuật ngữ đã được duyệt.
- Không dịch máy cứng nhắc, dùng từ mơ hồ như “Có lỗi xảy ra” khi có thể nói rõ tác vụ nào thất bại.
- Không dùng ALL CAPS cho đoạn dài, quá nhiều dấu chấm than hoặc giọng thúc ép/khẩn cấp giả.
- Không phỏng đoán giới tính, dùng ngôn ngữ đổ lỗi hoặc hứa hẹn kết quả mà hệ thống chưa xác nhận.
- Không viết cứng tên, giá, phần trăm giảm, tồn kho, đánh giá, freeship, voucher, flash sale hoặc notification khi API không cung cấp.
- Không thay đổi giá trị enum/payload backend chỉ để Việt hóa; ánh xạ nhãn hiển thị tách biệt khỏi giá trị kỹ thuật.

### Ưu tiên

- Ưu tiên động từ cụ thể cho CTA: “Thêm vào giỏ hàng”, “Lưu địa chỉ”, “Thử lại”, “Xóa bộ lọc”; tránh “OK”, “Có”, “Gửi” thiếu ngữ cảnh.
- Ưu tiên microcopy trấn an ở điểm rủi ro: tổng tiền, dữ liệu chưa lưu, xóa/hủy, lỗi thanh toán.
- Ưu tiên một glossary/formatter dùng chung thay vì mỗi trang tự đặt tên trạng thái hoặc format tiền/ngày.
- Ưu tiên nội dung có thể mở rộng sang i18n sau này mà không nối chuỗi câu hoặc nhúng markup vào message.

### Checklist

- [ ] Không còn chuỗi tiếng Anh hướng người dùng trong phạm vi thay đổi.
- [ ] Thuật ngữ, viết hoa, dấu câu và giọng văn nhất quán.
- [ ] Tiền, ngày, số và trạng thái được format/ánh xạ tập trung.
- [ ] Error/empty/success nêu rõ ngữ cảnh và bước tiếp theo.
- [ ] Text động dài không vỡ UI và accessible text cũng đã Việt hóa.
- [ ] Không tạo dữ liệu/tính năng commerce giả hoặc đổi enum/payload API.
