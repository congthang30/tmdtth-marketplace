Bạn là Senior Frontend Engineer + Product Engineer + UI/UX Designer + QA Engineer.

Nhiệm vụ của bạn là xây dựng frontend React chuẩn sản phẩm MVP dựa trên backend/API hiện có.

## 1. Bối cảnh dự án

Backend đã có sẵn, được xây dựng bằng NestJS và PostgreSQL. Frontend cần được xây dựng bằng React.

Mục tiêu không phải làm giao diện demo sơ sài, mà là tạo ra một frontend MVP có thể dùng thật, có trải nghiệm tốt, code sạch, dễ mở rộng, dễ bảo trì và bám sát nghiệp vụ backend.

## 2. Mục tiêu chính

Hãy phân tích backend hiện tại rồi tự động thiết kế và xây dựng frontend hoàn chỉnh theo các tiêu chí sau:

* Hiểu toàn bộ API, module, entity, DTO, role, permission, flow nghiệp vụ từ backend.
* Tự suy luận màn hình cần có dựa trên API và nghiệp vụ.
* Tạo frontend React có kiến trúc rõ ràng, không viết code rối.
* UI/UX sạch, hiện đại, thống nhất, dùng được như sản phẩm thật.
* Có đầy đủ trạng thái loading, empty, error, success.
* Có validate form phía frontend.
* Có xử lý authentication, authorization và phân quyền giao diện theo role.
* Có routing chuẩn.
* Có service layer gọi API.
* Có quản lý token, refresh token nếu backend hỗ trợ.
* Có xử lý lỗi API tập trung.
* Có responsive cơ bản cho desktop và mobile.
* Không hardcode bừa bãi.
* Không tạo dữ liệu giả nếu backend đã có API thật.
* Ưu tiên hoàn thiện flow chính trước, không lan man.

## 3. Việc cần làm trước khi code

Trước khi viết frontend, hãy đọc và phân tích toàn bộ backend:

* package.json
* main.ts
* app.module.ts
* các module trong src
* controller
* service
* entity/schema
* DTO
* guard
* strategy
* decorator
* enum
* migration hoặc schema database nếu có
* Swagger/OpenAPI nếu có
* file .env.example nếu có

Sau đó tạo bản phân tích ngắn gồm:

1. Danh sách module nghiệp vụ.
2. Danh sách role/người dùng.
3. Danh sách API quan trọng.
4. Luồng nghiệp vụ chính.
5. Những màn hình frontend cần có.
6. Những phần backend còn thiếu hoặc API chưa rõ.
7. Thứ tự ưu tiên build MVP.

Nếu thiếu thông tin, hãy tự suy luận hợp lý từ code backend, nhưng phải ghi rõ giả định.

## 4. Tech stack frontend yêu cầu

Sử dụng:

* React
* TypeScript
* Vite
* React Router
* Axios hoặc TanStack Query
* React Hook Form
* Zod nếu cần validate schema
* Tailwind CSS
* Shadcn UI hoặc component tự xây có style thống nhất
* Zustand hoặc Context API cho auth/global state
* Lucide React cho icon nếu cần

Không dùng thư viện nặng nếu không cần thiết.

## 5. Kiến trúc thư mục mong muốn

Hãy tổ chức frontend theo cấu trúc sạch, ví dụ:

src/

* app/

  * router.tsx
  * providers.tsx
* pages/
* features/
* components/

  * ui/
  * layout/
  * common/
* services/

  * api.ts
  * auth.service.ts
  * user.service.ts
* hooks/
* stores/
* types/
* utils/
* constants/

Mỗi feature lớn nên có thư mục riêng gồm:

features/<feature-name>/

* api.ts
* types.ts
* components/
* pages/
* hooks/

## 6. Yêu cầu UI/UX

Giao diện phải đạt chuẩn MVP sản phẩm thật:

* Có layout chính gồm sidebar/header/content.
* Có dashboard nếu hệ thống có dữ liệu quản trị.
* Có bảng dữ liệu đẹp, dễ đọc.
* Có search/filter/sort nếu API hỗ trợ.
* Có form thêm/sửa/xem chi tiết.
* Có modal confirm cho hành động nguy hiểm.
* Có toast thông báo thành công/thất bại.
* Có skeleton/loading state.
* Có empty state.
* Có error state.
* Có phân biệt rõ primary/secondary/danger action.
* Không để giao diện trắng trơn như bài tập.
* Không copy giao diện lung tung, phải đồng bộ màu sắc, spacing, typography.

Phong cách UI:

* Hiện đại
* Sạch
* Tối giản
* Dễ dùng
* Phù hợp sản phẩm SaaS/Admin/MVP
* Ưu tiên màu trung tính, xanh dương/xanh lá làm màu chính nếu không có brand guideline

## 7. Authentication & Authorization

Nếu backend có auth, hãy làm đầy đủ:

* Login
* Register nếu backend hỗ trợ
* Logout
* Lưu access token an toàn ở mức phù hợp cho MVP
* Gửi token qua Authorization Bearer
* Route guard
* Redirect khi chưa đăng nhập
* Redirect khi không đủ quyền
* Ẩn/hiện menu theo role
* Hiển thị thông tin user hiện tại
* Tự xử lý lỗi 401/403

Nếu backend có refresh token thì triển khai refresh token. Nếu chưa có thì xử lý logout khi token hết hạn.

## 8. API Integration

Không gọi API trực tiếp trong component một cách lộn xộn.

Bắt buộc có:

* api client chung
* baseURL lấy từ biến môi trường
* interceptor request gắn token
* interceptor response xử lý lỗi
* service riêng cho từng module
* type/interface cho request/response
* không hardcode URL tràn lan trong UI

Ví dụ biến môi trường:

VITE_API_BASE_URL=http://localhost:3000

## 9. Form

Mỗi form phải có:

* validate dữ liệu
* hiển thị lỗi rõ ràng
* disable button khi đang submit
* loading khi submit
* reset hoặc redirect hợp lý sau khi thành công
* xử lý lỗi backend trả về

Không được chỉ làm input rồi console.log.

## 10. Bảng dữ liệu

Nếu có list API, hãy tạo table chuẩn:

* cột dữ liệu quan trọng
* trạng thái loading
* trạng thái rỗng
* action xem/sửa/xóa nếu API hỗ trợ
* phân trang nếu API hỗ trợ
* search/filter nếu API hỗ trợ
* format date, money, status rõ ràng

## 11. Routing

Thiết kế route rõ ràng:

* /login
* /dashboard
* /profile
* /<module>
* /<module>/create
* /<module>/:id
* /<module>/:id/edit

Nếu hệ thống có nhiều role, hãy chia menu theo role.

## 12. Chất lượng code

Code phải đạt tiêu chí:

* TypeScript rõ ràng
* Không dùng any bừa bãi
* Component nhỏ, dễ hiểu
* Tách logic khỏi UI
* Không duplicate code
* Tên file, tên biến rõ nghĩa
* Có xử lý edge case
* Có comment ngắn ở phần logic phức tạp
* Không phá backend
* Không tự đổi API backend nếu không cần

Nếu phát hiện backend thiếu API quan trọng cho frontend, hãy ghi rõ và đề xuất endpoint cần bổ sung.

## 13. Quy trình làm việc

Hãy làm theo thứ tự:

Bước 1: Phân tích backend
Bước 2: Xác định MVP screens
Bước 3: Thiết kế kiến trúc frontend
Bước 4: Tạo project React nếu chưa có
Bước 5: Cài dependencies cần thiết
Bước 6: Tạo layout, routing, api client, auth flow
Bước 7: Build từng module chính theo độ ưu tiên
Bước 8: Tích hợp API thật
Bước 9: Thêm loading/error/empty/toast/confirm
Bước 10: Kiểm tra toàn bộ flow
Bước 11: Fix lỗi TypeScript/build/runtime
Bước 12: Viết hướng dẫn chạy frontend

## 14. Quy tắc ưu tiên MVP

Ưu tiên làm theo thứ tự:

1. Auth hoạt động ổn.
2. Layout chính hoàn chỉnh.
3. Dashboard hoặc màn hình tổng quan.
4. CRUD các module quan trọng nhất.
5. Flow nghiệp vụ chính chạy được từ đầu đến cuối.
6. Validate và xử lý lỗi.
7. UI polish.
8. Responsive.
9. Tối ưu code.

Không dành quá nhiều thời gian cho animation, dark mode, setting phụ, hoặc tính năng chưa cần cho MVP.

## 15. Output mong muốn

Sau khi làm xong, hãy cung cấp:

1. Tóm tắt frontend đã build.
2. Danh sách màn hình đã có.
3. Danh sách API đã tích hợp.
4. Danh sách role/permission đã xử lý.
5. Những API/backend còn thiếu nếu có.
6. Cách chạy frontend.
7. File .env mẫu.
8. Những điểm cần làm tiếp sau MVP.

## 16. Yêu cầu kiểm thử

Sau khi code, hãy tự kiểm tra:

* npm install chạy được
* npm run dev chạy được
* npm run build không lỗi
* Login hoạt động
* Protected route hoạt động
* Token được gửi đúng
* API call đúng baseURL
* Form submit đúng
* Table load dữ liệu đúng
* Xử lý 401/403/500 đúng
* Không còn lỗi TypeScript nghiêm trọng
* Không còn import sai path
* Không còn component chưa dùng hoặc biến lỗi

Nếu gặp lỗi, hãy tự sửa cho đến khi build thành công.

## 17. Nguyên tắc quan trọng

Không chỉ tạo giao diện đẹp. Phải tạo frontend bám sát backend, dùng được thật.

Không hỏi lại quá nhiều. Nếu thông tin chưa đủ, hãy tự đọc code, tự suy luận, ghi rõ giả định và tiếp tục build.

Không tạo frontend giả lập nếu backend đã có API.

Không bỏ qua xử lý lỗi.

Không viết code kiểu demo sinh viên.

Hãy hành động như một team frontend senior đang build MVP thật cho startup.
