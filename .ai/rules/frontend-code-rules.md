## Quy tắc mã nguồn frontend

### Bắt buộc

- Giữ stack hiện tại: React 19, TypeScript, Vite, React Router, TanStack Query, Zustand, React Hook Form, Zod, Axios, Tailwind và Lucide; thay đổi dependency cần lý do, đánh giá bundle và phê duyệt riêng.
- Tôn trọng ranh giới hiện có giữa app/router/layout, components dùng chung và feature; UI primitive không phụ thuộc feature, page điều phối thay vì ôm mọi chi tiết.
- Dữ liệu server đi qua lớp API/query hiện hữu, cache/query key nhất quán; state cục bộ hoặc URL dùng cho UI state, Zustand chỉ cho client state thật sự dùng chung.
- TypeScript phải mô tả rõ props, response và trạng thái; không dùng `any` để bỏ qua lỗi kiểu, không dùng non-null assertion nếu chưa chứng minh invariant.
- Dùng token/component/rule trong `.ai`; class Tailwind phải có thứ tự và recipe tập trung khi lặp. `primary-300` hoặc token chưa được cấu hình phải được bổ sung có chủ đích trước khi dùng.
- Trang lớn khoảng trên 300 dòng phải được xem xét tách theo trách nhiệm, nhưng refactor phải giữ nguyên hành vi, route, quyền, business logic và hợp đồng API.
- Trước khi hoàn tất phải chạy các kiểm tra sẵn có phù hợp: typecheck, lint, test và build; sửa lỗi do thay đổi gây ra, không che lỗi bằng cấu hình.

### Không được

- Không rebuild ứng dụng, đổi kiến trúc/router/state library hoặc viết lại feature ngoài phạm vi tác vụ UI.
- Không gọi API trực tiếp từ primitive, không sao chép endpoint/type/formatter và không lưu server state trùng trong nhiều store.
- Không dùng `useEffect` để đồng bộ state có thể suy ra trong render; không bỏ dependency, tắt lint hoặc dùng key index cho danh sách có thể thay đổi.
- Không sửa business rule ở client, hardcode role/status/payload hoặc mock tính năng chưa có API như wishlist, voucher, flash sale và notifications.
- Không đưa secret vào `VITE_*`, source code, log hoặc error UI; chỉ biến môi trường công khai mới được đưa vào bundle frontend.
- Không tối ưu sớm bằng memoization phức tạp; không thêm abstraction khi chưa có ít nhất một nhu cầu rõ ràng.

### Ưu tiên

- Ưu tiên thay đổi nhỏ, có thể review và kiểm chứng theo từng lớp: token → primitive → pattern → page.
- Ưu tiên URL cho state catalog chia sẻ được, TanStack Query cho server state, React Hook Form cho form và native semantics cho interaction.
- Ưu tiên lazy loading ở ranh giới route/feature lớn khi đo được lợi ích; tối ưu ảnh và tránh import barrel gây kéo code không cần thiết.
- Ưu tiên test hành vi người dùng, trạng thái query/form và regression ở component dùng chung hơn snapshot chi tiết class.
- Ưu tiên tài liệu hóa quyết định/rủi ro trong [ui-implementation-plan](../ui-implementation-plan.md) thay vì thay đổi vượt phạm vi.

### Checklist

- [ ] Ranh giới module/state/query/form đúng trách nhiệm.
- [ ] TypeScript không có `any`/assertion né tránh và props/API type rõ.
- [ ] Không có class/token/formatter/endpoint lặp hoặc chưa định nghĩa.
- [ ] Không đổi business logic, API, route, role hoặc thêm mock feature.
- [ ] Component/page có kích thước và trách nhiệm hợp lý.
- [ ] Typecheck, lint, test và build liên quan đều đạt hoặc lỗi nền đã được ghi rõ.
