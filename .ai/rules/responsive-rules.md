## Quy tắc responsive

### Bắt buộc

- Thiết kế mobile-first từ 320 px và kiểm tra tối thiểu tại 320, 375, 390, 430, 768, 1024, 1280 và 1440 px theo [layouts](../design-system/layouts.md).
- Nội dung phải nằm trong container nhất quán với padding responsive; không để nội dung chạm mép hoặc tạo cuộn ngang ngoài vùng chủ đích.
- Header công khai phải giữ được đường vào tìm kiếm, danh mục, giỏ hàng và tài khoản trên mobile; điều hướng bị ẩn phải có phương án thay thế tương đương.
- Lưới sản phẩm dùng số cột theo không gian thực và chiều rộng card tối thiểu: 2 cột mobile, 3 tablet, 4 ở desktop vừa, 5 ở 1280 và có thể 6 từ 1440 khi nội dung vẫn đọc được.
- Form, filter, checkout summary và action bar phải đổi bố cục theo viewport; CTA quan trọng phải dễ chạm và không bị bàn phím ảo che.
- Bảng dữ liệu phải có chiến lược mobile rõ: card/list cho tác vụ chính hoặc vùng cuộn ngang có nhãn và cột ưu tiên.

### Không được

- Không chỉ thu nhỏ giao diện desktop hoặc ẩn chức năng thiết yếu ở breakpoint nhỏ.
- Không dùng chiều rộng/chiều cao cố định khiến text tiếng Việt bị cắt hoặc layout vỡ.
- Không dựa vào hover cho thông tin hay hành động bắt buộc.
- Không ép 5–6 cột sản phẩm nếu card nhỏ hơn ngưỡng đọc được; không dùng breakpoint chỉ vì thiết bị cụ thể.
- Không để modal, menu, toast, bảng hoặc sticky footer vượt viewport.
- Không thay đổi dữ liệu/API để giải quyết bài toán bố cục.

### Ưu tiên

- Ưu tiên container query hoặc CSS grid tự thích nghi khi component được dùng trong nhiều vùng có độ rộng khác nhau.
- Ưu tiên hiển thị thông tin và hành động thiết yếu trước; thông tin phụ có thể xuống dòng, thu gọn có chủ đích hoặc chuyển vào disclosure.
- Ưu tiên vùng chạm tối thiểu 44 x 44 px và khoảng cách đủ tránh chạm nhầm.
- Ưu tiên kiểm thử bằng nội dung tiếng Việt dài, dữ liệu rỗng, ảnh lỗi và mức zoom 200%.

### Checklist

- [ ] Đã kiểm tra đủ viewport mục tiêu và không có cuộn ngang ngoài ý muốn.
- [ ] Mobile vẫn truy cập được mọi tác vụ thiết yếu.
- [ ] Lưới/card/form/table đổi bố cục hợp lý, không chỉ co nhỏ.
- [ ] Text dài, zoom 200% và ảnh lỗi không phá layout.
- [ ] Vùng chạm chính đạt ít nhất 44 x 44 px.
- [ ] Sticky/overlay không che nội dung hoặc CTA.
