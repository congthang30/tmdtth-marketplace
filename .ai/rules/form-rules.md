## Quy tắc biểu mẫu

### Bắt buộc

- Mọi control phải có label nhìn thấy được; placeholder chỉ gợi ý định dạng, không thay label.
- Dùng React Hook Form và Zod theo pattern hiện tại cho validation; schema phải phản ánh hợp đồng API hiện hữu và thông báo lỗi phải là tiếng Việt dễ sửa.
- Liên kết label bằng `htmlFor`/`id`, lỗi và mô tả bằng `aria-describedby`, đồng thời đặt `aria-invalid` khi trường không hợp lệ.
- Hiển thị lỗi trường gần control và lỗi cấp form ở vị trí dễ thấy; sau submit thất bại phải focus hoặc cuộn đến lỗi đầu tiên một cách có kiểm soát.
- Giữ dữ liệu người dùng khi lỗi mạng/server nếu an toàn; khi submit phải có loading, chặn gửi lặp và phản hồi thành công/thất bại rõ.
- Loại input, `autocomplete`, `inputMode`, required/optional và định dạng phải phù hợp dữ liệu; nhóm radio/checkbox phải dùng `fieldset`/`legend` khi có ý nghĩa.
- Modal chứa form phải tuân thủ quy tắc dialog/focus trong [accessibility](../design-system/components.md) và không tự đóng làm mất dữ liệu chưa lưu.

### Không được

- Không validate chỉ bằng màu, chỉ sau submit toàn form hoặc bằng thông báo chung không chỉ ra cách sửa.
- Không xóa giá trị đã nhập sau lỗi API; không vô hiệu hóa paste, password manager hoặc autofill nếu không có lý do an toàn đã xác minh.
- Không dùng `type="number"` cho số điện thoại, mã bưu chính hoặc dữ liệu định danh.
- Không tự biến đổi payload, quy tắc nghiệp vụ hay điều kiện bắt buộc ngoài hợp đồng backend để “hợp” giao diện.
- Không đặt nút submit chỉ bằng icon; không để nhiều nút cùng kiểu primary trong một form.
- Không dùng disabled để che một trường cần được đọc; dùng readonly khi dữ liệu vẫn cần được submit/tiếp cận.

### Ưu tiên

- Ưu tiên validation khi blur hoặc submit; validation theo từng ký tự chỉ dùng khi phản hồi đó thực sự hữu ích.
- Ưu tiên một cột trên mobile, nhóm trường liên quan trên desktop và thứ tự tab trùng thứ tự trực quan.
- Ưu tiên component TextInput, SelectInput, Textarea và FieldMessage dùng chung theo [components](../design-system/components.md).
- Ưu tiên diễn giải lỗi API cụ thể khi có thể, kèm hành động thử lại; không lộ chi tiết kỹ thuật.

### Checklist

- [ ] Mỗi control có label, id và trạng thái required/optional rõ.
- [ ] Error/help được nối bằng ARIA và lỗi đầu tiên được đưa vào focus hợp lý.
- [ ] Submit có loading, chống gửi lặp và giữ dữ liệu khi lỗi.
- [ ] Keyboard, autofill, paste và password manager hoạt động.
- [ ] Mobile, text dài và lỗi nhiều trường không phá bố cục.
- [ ] Schema/payload/business rule không bị thay đổi vì UI.
