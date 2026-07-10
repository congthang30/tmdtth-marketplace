## Quy tắc component

### Bắt buộc

- Kiểm tra [component-inventory](../design-system/component-inventory.md) trước khi tạo component; tái sử dụng hoặc mở rộng primitive hiện có nếu cùng trách nhiệm.
- Component dùng chung phải có API nhỏ, tên prop theo ý nghĩa, kiểu TypeScript rõ ràng, trạng thái mặc định hợp lý và không chứa business logic của riêng một feature.
- Variant phải được định nghĩa tập trung; Button và ButtonLink phải chia sẻ cùng recipe thị giác thay vì sao chép class.
- Mỗi component tương tác phải hỗ trợ keyboard, focus-visible, disabled, loading và accessible name khi phù hợp.
- Component phải cho phép truyền `className` có kiểm soát hoặc composition mà không phá token, đồng thời forward ref khi consumer cần focus/đo kích thước.
- Tách component khi một khối có trách nhiệm riêng, tái sử dụng thực tế hoặc giúp trang lớn dễ kiểm thử; đối chiếu hướng dẫn trong [components](../design-system/components.md).

### Không được

- Không tạo wrapper một lần dùng chỉ để che một thẻ HTML mà không thêm semantics, hành vi hoặc recipe có giá trị.
- Không copy-paste chuỗi Tailwind dài giữa nhiều trang; không tạo variant bằng điều kiện class phân tán ở consumer.
- Không đặt gọi API, điều phối quyền hoặc cập nhật store vào primitive UI.
- Không dùng `div`/`span` giả button/link; không lồng phần tử tương tác vào nhau.
- Không tạo component “đa năng” với quá nhiều prop boolean xung đột.
- Không tự tạo ProductCard, badge khuyến mại hay widget cho tính năng chưa có dữ liệu backend.

### Ưu tiên

- Ưu tiên composition, children và semantic HTML hơn cấu hình prop phức tạp.
- Ưu tiên các khối lặp có giá trị cao: PageHeader, Panel/Card, StatusBadge, FieldMessage, IconButton, PriceDisplay, QuantitySelector và ResponsiveDataView theo inventory.
- Ưu tiên colocate component đặc thù trong feature; chỉ nâng lên `components/ui` hoặc `components/common` khi thật sự dùng chung.
- Ưu tiên refactor theo lát dọc nhỏ và giữ giao diện/logic hiện hữu trong mỗi bước.

### Checklist

- [ ] Đã tra inventory và không tạo bản sao component đã có.
- [ ] Props/type/variant có trách nhiệm rõ, không xung đột.
- [ ] Không chứa business logic hoặc hợp đồng API trong primitive.
- [ ] Keyboard, focus, disabled, loading và accessible name hoạt động.
- [ ] Recipe/token được dùng tập trung, không lặp class đáng kể.
- [ ] Có tiêu chí kiểm thử cho hành vi và trạng thái chính.
