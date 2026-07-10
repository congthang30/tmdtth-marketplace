## Quy tắc bảng dữ liệu

### Bắt buộc

- Chỉ dùng table cho dữ liệu có quan hệ hàng–cột; dùng list/card cho nội dung không cần so sánh theo cột.
- Table phải có caption hoặc accessible name, header dùng `th` với `scope`, tiêu đề cột rõ và thứ tự đọc hợp lý.
- Căn trái nội dung chữ, căn phải số/tiền; dùng định dạng ngày, tiền, trạng thái thống nhất và không dựa chỉ vào màu.
- Có trạng thái loading, empty, error và pagination phù hợp; empty không được render một bảng trống khó hiểu.
- Hành động mỗi hàng phải có accessible name chứa ngữ cảnh bản ghi; thao tác phá hủy cần xác nhận phù hợp.
- Chọn chiến lược responsive trước khi triển khai: `ResponsiveDataView` dạng card/list cho mobile hoặc scroll ngang có cột ưu tiên, theo [layouts](../design-system/layouts.md).
- Sorting/filtering/pagination phải gửi đúng tham số API hiện hữu và giữ trạng thái query; header sortable phải thông báo `aria-sort`.

### Không được

- Không tạo bảng bằng chuỗi `div` nếu dữ liệu thực sự là bảng.
- Không nhồi quá nhiều cột, text dài không kiểm soát hoặc nhiều icon hành động không nhãn vào một hàng.
- Không làm toàn bộ hàng clickable nếu bên trong còn link/button gây xung đột tương tác.
- Không chỉ bọc `overflow-x-auto` rồi coi như đã hoàn tất UX mobile khi tác vụ chính vẫn khó dùng.
- Không sắp xếp hoặc phân trang dữ liệu trên client trái với nguồn sự thật của API nếu backend đang đảm nhiệm việc đó.
- Không thêm dữ liệu, cột hoặc trạng thái giả để lấp đầy bảng.

### Ưu tiên

- Ưu tiên cột định danh và trạng thái ở đầu, hành động ở cuối; ẩn/chuyển thông tin phụ trước trên màn hình hẹp.
- Ưu tiên menu hành động có nhãn khi số action lớn, nhưng để action chính thường dùng hiển thị trực tiếp.
- Ưu tiên skeleton giữ đúng độ rộng cột, sticky header chỉ khi không che focus và không gây lỗi viewport.
- Ưu tiên pattern Table dùng chung trong [components](../design-system/components.md), không tự tạo recipe ở từng trang admin/seller.

### Checklist

- [ ] Dữ liệu phù hợp với table và có caption/accessible name.
- [ ] Header/scope/aria-sort/căn lề và định dạng đúng.
- [ ] Loading, empty, error và pagination được xử lý.
- [ ] Action có nhãn theo ngữ cảnh và xác nhận khi cần.
- [ ] Mobile có chiến lược rõ, không chỉ co hoặc cuộn khó dùng.
- [ ] Sort/filter/page giữ đúng hợp đồng API và nguồn sự thật.
