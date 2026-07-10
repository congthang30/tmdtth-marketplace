Bạn là Principal Frontend Engineer + Product Engineer + Full-stack Integration Engineer.

Nhiệm vụ của bạn là build frontend React/TypeScript chuẩn sản phẩm MVP dựa trên backend NestJS/PostgreSQL hiện có.

Quan trọng: Bắt buộc đọc `@plan_frontend_mvp.md` trước khi code. Đây là tài liệu điều phối chính. Không được bỏ qua plan, không tự làm lệch scope, không build giao diện demo giả.

## 1. Mục tiêu sản phẩm

Xây dựng frontend MVP dùng API thật của backend, có thể demo end-to-end:

Public catalog → Customer cart/checkout/order/review → Seller shop/product/order/shipment → Admin category/shop/shipping.

Frontend phải giống sản phẩm có thể dùng thật, không phải bài tập sinh viên.

## 2. Bối cảnh kỹ thuật

Backend:

* NestJS + PostgreSQL
* API base: `http://localhost:3100/api`
* Docker backend đang expose API ở port `3100`
* Postgres host port `55433`

Frontend:

* Thư mục `frontend/` đã tồn tại nhưng đang rỗng hoặc chưa có `package.json`
* Cần tạo React + TypeScript + Vite app trong `frontend/`
* Không phá backend nếu không cần thiết

Env frontend bắt buộc:

```txt
VITE_API_BASE_URL=http://localhost:3100/api
```

## 3. Stack bắt buộc

Dùng:

* React
* TypeScript
* Vite
* React Router
* Axios
* TanStack Query
* React Hook Form
* Zod
* Zustand
* Tailwind CSS
* Lucide React

Không dùng thư viện nặng nếu không cần. Không dùng mock data nếu backend đã có API thật.

## 4. Luật làm việc cực quan trọng

Trước khi code:

1. Đọc toàn bộ backend controllers/modules/DTO/entities/guards/enums.
2. Đọc kỹ file plan frontend đã có.
3. Xác nhận lại API inventory, roles, màn hình, blocker.
4. Chỉ sau đó mới code.

Trong khi code:

* Làm theo backlog FE-00 → FE-11.
* Sau mỗi task, cập nhật trạng thái trong file plan.
* Chỉ đánh dấu `Hoàn thành` khi đã code xong, build pass, verify flow liên quan.
* Không hardcode business ID.
* Không gọi API trực tiếp lung tung trong component.
* Không bỏ qua loading/error/empty state.
* Không bỏ qua validate form.
* Không bỏ qua route guard và role guard.
* Không tự ý sửa backend trừ khi blocker đã được chứng minh.
* Nếu phải sửa backend, chỉ thêm API tối thiểu và phải chạy test/build.

## 5. API response shape

Backend response chuẩn:

```ts
type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
};
```

Backend error shape:

```ts
type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
};
```

Frontend phải normalize lỗi API để UI hiển thị message rõ ràng.

## 6. Roles

Hệ thống có 3 role chính:

### Customer

Có thể:

* Browse catalog
* Xem product detail
* Quản lý profile
* Quản lý address
* Add/update/delete/select cart item
* Checkout
* Chọn payment method
* Xem order
* Cancel order nếu backend cho phép
* Fake online payment success nếu có payment fake
* Review sản phẩm đã mua

### Seller

Có thể:

* Register shop
* Quản lý product
* Quản lý variant
* Quản lý image
* Quản lý inventory
* Xem seller orders
* Confirm/prepare order
* Create shipment
* Update shipment tracking
* Upload images

### Admin

Có thể:

* Quản lý category
* Approve/reject shop
* Quản lý shipping company
* Quản lý shipping service

Frontend phải có menu, route guard, redirect và UI theo role.

## 7. API inventory cần tích hợp

Public:

* `GET /api/health`
* `GET /api/categories`
* `GET /api/products`
* `GET /api/products/:slug`
* `GET /api/products/:slug/reviews`

Auth:

* `POST /api/auth/register`
* `POST /api/auth/login`
* `POST /api/auth/logout`
* `GET /api/auth/me`
* `GET /api/auth/role-check/customer`
* `GET /api/auth/role-check/seller`
* `GET /api/auth/role-check/admin`

Customer:

* `GET /api/users/me`
* `PATCH /api/users/me`
* `GET /api/addresses`
* `POST /api/addresses`
* `PATCH /api/addresses/:id`
* `DELETE /api/addresses/:id`
* `PATCH /api/addresses/:id/default`
* `GET /api/cart`
* `POST /api/cart/items`
* `PATCH /api/cart/items/:id`
* `PATCH /api/cart/items/:id/select`
* `DELETE /api/cart/items/:id`
* `GET /api/payments/methods`
* `POST /api/orders/checkout-preview`
* `POST /api/orders`
* `GET /api/orders/my`
* `GET /api/orders/:id`
* `PATCH /api/orders/:id/cancel`
* `POST /api/payments/:id/fake-success`
* `POST /api/shipping/quotes`
* `POST /api/reviews/products`

Seller:

* `POST /api/shops`
* `GET /api/seller/products`
* `POST /api/seller/products`
* `PATCH /api/seller/products/:id`
* `DELETE /api/seller/products/:id`
* `GET /api/seller/products/:productId/variants`
* `POST /api/seller/products/:productId/variants`
* `PATCH /api/seller/products/:productId/variants/:variantId`
* `DELETE /api/seller/products/:productId/variants/:variantId`
* `GET /api/seller/products/:productId/images`
* `POST /api/seller/products/:productId/images`
* `PATCH /api/seller/products/:productId/images/:imageId`
* `DELETE /api/seller/products/:productId/images/:imageId`
* `GET /api/seller/products/:productId/variants/:variantId/inventory`
* `PATCH /api/seller/products/:productId/variants/:variantId/inventory`
* `GET /api/seller/orders`
* `GET /api/seller/orders/:id`
* `PATCH /api/seller/orders/:id/confirm`
* `PATCH /api/seller/orders/:id/prepare`
* `POST /api/seller/orders/:shopOrderId/shipments`
* `PATCH /api/seller/orders/:shopOrderId/shipments/:shipmentId/tracking`
* `POST /api/uploads`
* `GET /api/uploads`

Admin:

* `GET /api/admin/categories`
* `POST /api/admin/categories`
* `PATCH /api/admin/categories/:id`
* `DELETE /api/admin/categories/:id`
* `PATCH /api/admin/shops/:id/approve`
* `PATCH /api/admin/shops/:id/reject`
* `GET /api/admin/shipping-companies`
* `GET /api/admin/shipping-companies/:id`
* `POST /api/admin/shipping-companies`
* `PATCH /api/admin/shipping-companies/:id`
* `DELETE /api/admin/shipping-companies/:id`
* `GET /api/admin/shipping-services`
* `GET /api/admin/shipping-services/:id`
* `POST /api/admin/shipping-services`
* `PATCH /api/admin/shipping-services/:id`
* `DELETE /api/admin/shipping-services/:id`

## 8. Backend blockers cần xử lý nếu frontend bị kẹt

Chỉ thêm các API này khi thật sự cần để MVP không phải hardcode:

### BE-FE-01

Vấn đề:
Admin có approve/reject shop theo `shopId`, nhưng chưa có API list pending shops.

Đề xuất:

* `GET /api/admin/shops?page&limit&status`
  hoặc:
* `GET /api/admin/shops/pending`

### BE-FE-02

Vấn đề:
Seller có `POST /api/shops`, nhưng chưa có `GET /api/shops/me`, khiến seller product create sau reload có thể không biết `shopId`.

Đề xuất:

* `GET /api/shops/me`

### BE-FE-03

Vấn đề:
Customer shipping quote cần `shippingServiceId`, nhưng customer chưa có API list active shipping services.

Đề xuất:

* `GET /api/shipping/services?shopId=`

Nếu thêm backend endpoint:

* Phải viết test
* Phải chạy build/test/lint
* Phải update plan
* Không làm rộng scope quá mức

## 9. Kiến trúc thư mục frontend bắt buộc

Tạo cấu trúc:

```txt
frontend/
  .env.example
  package.json
  index.html
  vite.config.ts
  tailwind.config.ts
  postcss.config.js
  src/
    app/
      router.tsx
      providers.tsx
    components/
      ui/
      layout/
      common/
    features/
      auth/
      profile/
      catalog/
      cart/
      checkout/
      orders/
      seller/
      admin/
      shipping/
      reviews/
      uploads/
    services/
      api.ts
      errors.ts
    stores/
      auth.store.ts
    hooks/
    types/
      api.ts
      domain.ts
    utils/
      format.ts
      routes.ts
    constants/
```

Mỗi feature nên có:

* `api.ts`
* `types.ts`
* `hooks.ts`
* `pages/`
* `components/`

Không để một file component quá dài. Tách logic khỏi UI.

## 10. UI/UX chuẩn MVP

Giao diện phải:

* Sạch
* Hiện đại
* Đồng bộ spacing, typography, màu sắc
* Dễ dùng
* Có responsive desktop/mobile
* Có layout public và layout dashboard
* Có sidebar/header/account menu
* Có role-aware menu
* Có toast
* Có modal confirm
* Có table chuẩn
* Có pagination nếu API hỗ trợ
* Có skeleton/loading
* Có empty state
* Có error state
* Có badge status
* Có format money/date/status
* Có button primary/secondary/danger rõ ràng

Không làm UI trắng trơn. Không để raw text lỗi xấu. Không để form xấu như demo.

## 11. Các màn hình phải build

### Public / Customer

* `/` hoặc `/products`
* `/products/:slug`
* `/login`
* `/register`
* `/profile`
* `/addresses`
* `/cart`
* `/checkout`
* `/orders`
* `/orders/:id`

### Seller

* `/seller`
* `/seller/shop/register`
* `/seller/products`
* `/seller/products/create`
* `/seller/products/:id/edit`
* `/seller/products/:id/variants`
* `/seller/products/:id/images`
* `/seller/products/:id/inventory`
* `/seller/orders`
* `/seller/orders/:id`

### Admin

* `/admin`
* `/admin/categories`
* `/admin/shops`
* `/admin/shipping/companies`
* `/admin/shipping/services`

### Shared

* `/forbidden`
* `/not-found`

## 12. Authentication

Triển khai đầy đủ:

* Login
* Register
* Logout
* Load current user
* Persist token ở mức phù hợp MVP
* Axios interceptor gắn `Authorization: Bearer <token>`
* 401 thì logout/redirect login
* 403 thì redirect `/forbidden`
* ProtectedRoute
* RoleRoute
* Account menu
* Role-aware sidebar

Không được chỉ lưu token rồi bỏ đó.

## 13. API layer

Bắt buộc có:

* `services/api.ts`
* Base URL từ `VITE_API_BASE_URL`
* Request interceptor gắn token
* Response interceptor normalize lỗi
* Service riêng từng module
* Type request/response rõ ràng
* TanStack Query hooks cho list/detail/mutation
* Invalidate query sau mutation
* Không gọi axios trực tiếp trong page nếu có thể tách service

## 14. Forms

Mỗi form phải có:

* React Hook Form
* Zod validation
* Inline error
* Submit loading
* Disable button khi submit
* Backend error rendering
* Toast success/error
* Reset hoặc redirect hợp lý sau success

Áp dụng cho:

* Login/register
* Profile
* Address
* Product
* Variant
* Inventory
* Category
* Shipping company
* Shipping service
* Shop registration
* Review
* Shipment/tracking

## 15. Tables / Lists

Mỗi màn list phải có:

* Loading state
* Empty state
* Error state
* Pagination nếu API trả meta
* Search/filter nếu API hỗ trợ
* Status badge
* Action buttons
* Confirm modal cho delete/cancel/reject
* Format date/money/status

## 16. Backlog triển khai đúng thứ tự

### FE-00 - Project bootstrap

* Tạo Vite React TypeScript app
* Cài dependencies
* Configure Tailwind
* Configure alias
* Tạo `.env.example`
* Tạo scripts `dev`, `build`, `lint`, `preview`
* Build pass

### FE-01 - API client, auth store, route guards

* Tạo API client
* Tạo auth store
* Login/register/logout/me
* ProtectedRoute
* RoleRoute
* 401/403 handling
* Role-aware menu

### FE-02 - Layout and shared UI

* Public layout
* Dashboard layout
* Sidebar/header/account menu
* Button/Input/Select/Textarea/Badge/Table/Pagination/Modal/Toast/Skeleton/EmptyState/ErrorState
* Format helpers

### FE-03 - Public catalog and product detail

* Category tree
* Product list
* Product detail
* Product reviews
* Add to cart

### FE-04 - Customer profile and addresses

* Profile update
* Address CRUD
* Set default address

### FE-05 - Cart and checkout

* Cart list
* Quantity update
* Select/unselect item
* Delete item
* Payment methods
* Shipping quote
* Checkout preview
* Create order

### FE-06 - Customer orders, payment, review

* Order history
* Order detail
* Cancel order
* Fake payment success
* Shipment tracking
* Product review

### FE-10 - Backend unblockers if required

* Chỉ làm khi FE chứng minh bị kẹt
* Thêm API tối thiểu
* Test/build/lint pass

### FE-07 - Seller shop and product management

* Seller dashboard
* Register shop
* Product CRUD
* Variant CRUD
* Image upload/list/delete/set thumbnail
* Inventory update

### FE-08 - Seller orders and shipment

* Seller order list/detail
* Confirm order
* Prepare order
* Create shipment
* Update tracking

### FE-09 - Admin management

* Admin dashboard
* Category CRUD
* Shop approval/rejection
* Shipping company CRUD
* Shipping service CRUD

### FE-11 - MVP acceptance and docs

* README
* `.env.example`
* Run instructions
* Build verify
* End-to-end demo verify

## 17. Definition of Done

Frontend MVP chỉ được xem là xong khi:

* Auth hoạt động cho Customer, Seller, Admin
* Role-aware routing và menu hoạt động
* API client dùng `VITE_API_BASE_URL`
* Token interceptor hoạt động
* Không cần hardcode business ID trong flow bình thường
* Public catalog/product detail dùng data thật
* Customer cart/checkout/order/review chạy với backend thật
* Seller shop/product/inventory/order/shipment chạy với backend thật
* Admin category/shop/shipping management chạy với backend thật
* Mọi form có validation và render lỗi backend
* Mọi list có loading/empty/error/pagination nếu hỗ trợ
* Responsive dùng được trên desktop/mobile
* `npm run build` frontend pass
* Nếu sửa backend thì backend build/test/lint pass
* README có hướng dẫn chạy và demo flow

## 18. Quality gates

Frontend:

```bash
cd frontend
npm install
npm run build
npm run lint
npm run dev
```

Backend nếu có sửa:

```bash
cd backend
npm.cmd run build
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
npm.cmd run lint
npm.cmd audit --omit=dev
npm.cmd run prisma:validate
```

Docker/backend runtime:

```bash
docker compose up -d --build
curl http://localhost:3100/api/health
```

## 19. Cách làm khi gặp lỗi

Nếu build lỗi:

* Đọc lỗi
* Sửa import/type/component
* Chạy build lại
* Không bỏ qua lỗi TypeScript

Nếu API lỗi:

* Kiểm tra baseURL
* Kiểm tra token
* Kiểm tra DTO
* Kiểm tra response shape
* Hiển thị lỗi backend rõ ràng trong UI

Nếu thiếu API:

* Không hardcode ID
* Ghi rõ blocker
* Thêm endpoint tối thiểu nếu cần
* Test backend

Nếu UI chưa đủ tốt:

* Thêm spacing
* Thêm state
* Thêm badge
* Thêm table/form polish
* Không để trang trống hoặc raw JSON

## 20. Output cuối cùng phải báo cáo

Sau khi hoàn thành, hãy trả về:

1. Frontend đã build những gì.
2. Danh sách màn hình đã xong.
3. API đã tích hợp.
4. Role/permission đã xử lý.
5. Backend endpoint nào đã thêm nếu có.
6. Command đã chạy và kết quả.
7. Cách chạy frontend.
8. Các flow demo MVP.
9. Những việc còn lại sau MVP.

Hãy bắt đầu bằng việc đọc plan và backend, sau đó triển khai FE-00. Không code lan man. Không hỏi lại nếu có thể tự suy luận từ repo. Mục tiêu là frontend MVP dùng được thật.
