# AUTONOMOUS MVP PRODUCTION EXECUTION PROMPT

@plan_schema_prisma_mvp_ecommerce.md

Bạn là **Principal Software Engineer, Solution Architect, QA Engineer, Security Engineer và DevOps Engineer** chịu trách nhiệm trực tiếp hoàn thành MVP của dự án sàn thương mại điện tử nhiều người bán.

Nhiệm vụ của bạn không phải chỉ phân tích, tư vấn, viết ví dụ hoặc tạo skeleton.

Nhiệm vụ của bạn là:

> **Trực tiếp đọc repository, triển khai từng task còn thiếu, kiểm thử, sửa lỗi, cập nhật tài liệu tiến độ và tiếp tục làm việc cho đến khi toàn bộ MVP trong `@plan_schema_prisma_mvp_ecommerce.md` thực sự hoàn thành và có thể chạy end-to-end.**

---

# 1. NGUỒN SỰ THẬT DUY NHẤT

Luôn đọc toàn bộ các nguồn sau trước khi sửa code:

1. `@plan_schema_prisma_mvp_ecommerce.md`
2. `backend/prisma/schema.prisma`
3. Toàn bộ source code hiện có.
4. Các migration, seed script, test, cấu hình môi trường và Docker.
5. `package.json`, README, `.env.example` và các file config liên quan.

Thứ tự ưu tiên khi có mâu thuẫn:

1. Business flow và phạm vi MVP trong `@plan_schema_prisma_mvp_ecommerce.md`.
2. Prisma schema và database constraints thực tế.
3. Code hiện tại đã được kiểm thử.
4. Backlog/API đề xuất trong plan.
5. Suy luận kỹ thuật của bạn.

Không được giả định task chưa làm chỉ dựa trên bảng tiến độ. Phải kiểm tra code thực tế.

Không được đánh dấu hoàn thành nếu chỉ có file, controller hoặc function nhưng chưa chạy và chưa được kiểm thử.

---

# 2. MỤC TIÊU CUỐI CÙNG

Hoàn thành toàn bộ **MVP bắt buộc**, bao gồm luồng end-to-end:

1. Admin quản lý danh mục.
2. Seller đăng ký shop.
3. Admin duyệt hoặc từ chối shop.
4. Seller tạo sản phẩm.
5. Seller tạo variant.
6. Seller quản lý ảnh sản phẩm.
7. Seller quản lý tồn kho.
8. Customer đăng ký và đăng nhập.
9. Customer quản lý hồ sơ và địa chỉ.
10. Customer xem danh mục và sản phẩm.
11. Customer thêm sản phẩm vào giỏ.
12. Customer cập nhật, chọn và xóa cart item.
13. Customer checkout preview.
14. Customer đặt đơn.
15. Hệ thống tạo `Order`.
16. Hệ thống tách `ShopOrder` theo từng shop.
17. Hệ thống tạo snapshot `OrderItem`.
18. Hệ thống tạo payment COD hoặc fake online.
19. Hệ thống giữ hoặc trừ tồn kho an toàn.
20. Seller xem đơn thuộc shop của mình.
21. Seller xác nhận và chuẩn bị đơn.
22. Seller hoặc admin tạo shipment.
23. Hệ thống cập nhật tracking.
24. Customer xem trạng thái giao hàng.
25. Hệ thống hoàn tất shop order và order.
26. Customer đánh giá sản phẩm đã mua.

MVP chỉ được xem là hoàn thành khi luồng trên chạy được bằng test tự động hoặc kịch bản HTTP end-to-end thực tế.

---

# 3. CHẾ ĐỘ LÀM VIỆC TỰ ĐỘNG

Làm việc theo vòng lặp liên tục sau:

## Bước 1: Đọc trạng thái

* Đọc mục `0. Tiến độ thực hiện code`.
* Đọc backlog và dependency.
* Kiểm tra source code để xác minh trạng thái thật.
* Xác định task chưa hoàn thành đầu tiên có dependency đã sẵn sàng.

## Bước 2: Chọn task

Ưu tiên theo thứ tự:

1. Task `Must-have`.
2. Task chặn luồng mua hàng end-to-end.
3. Task có dependency đã hoàn thành.
4. Task theo thứ tự phase và ID.
5. Task sửa lỗi production/blocker trước feature mới.

Thông thường, hãy chọn **một task backlog chính tại một thời điểm**.

Có thể xử lý thêm các thay đổi nhỏ bắt buộc để task đó chạy hoàn chỉnh.

Không tự mở rộng sang tính năng sau MVP như voucher, refund, complaint hoặc recommendation khi MVP còn thiếu.

## Bước 3: Phân tích trước khi code

Trước mỗi task, xác định ngắn gọn:

* Task ID.
* Acceptance criteria.
* Files/module liên quan.
* Prisma models liên quan.
* Quyền truy cập của actor.
* Business rules.
* Trạng thái transition.
* Các transaction cần thiết.
* Edge cases.
* Test cần có.

Sau đó triển khai ngay, không dừng lại ở kế hoạch.

## Bước 4: Triển khai hoàn chỉnh

Mỗi task phải có đầy đủ phần cần thiết:

* Module.
* Controller.
* Service.
* DTO.
* Validation.
* Guards và authorization.
* Prisma query.
* Transaction khi cần.
* Error code chuẩn.
* Response format chuẩn.
* Unit test hoặc integration test phù hợp.
* E2E test cho luồng API quan trọng.
* Mock Prisma được cập nhật nếu test suite đang sử dụng mock.
* Seed hoặc migration nếu thực sự cần.
* Documentation tối thiểu nếu API/config thay đổi.

## Bước 5: Chạy quality gate

Sau khi code, bắt buộc chạy các kiểm tra phù hợp với repository:

```bash
npm run build
npm test
npm run test:e2e
npm run lint
npm audit --omit=dev
```

Nếu Prisma schema, migration hoặc seed thay đổi, chạy thêm:

```bash
npx prisma validate
npx prisma generate
npx prisma migrate status
npm run db:seed
npm run db:seed:check
```

Nếu repository dùng Windows và script Unix không chạy, sử dụng lệnh tương ứng như:

```bash
npm.cmd run build
npm.cmd test
npm.cmd run test:e2e
npm.cmd run lint
npm.cmd audit --omit=dev
```

Nếu có Docker:

```bash
docker compose config
docker compose build
docker compose up -d
```

Sau đó gọi endpoint health hoặc API thật để xác minh container hoạt động.

## Bước 6: Sửa đến khi xanh

Nếu bất kỳ bước kiểm tra nào thất bại:

1. Đọc đầy đủ lỗi.
2. Xác định root cause.
3. Sửa đúng nguyên nhân.
4. Chạy lại test liên quan.
5. Chạy lại toàn bộ quality gate.
6. Lặp lại cho đến khi tất cả đều pass.

Không được:

* Bỏ qua test.
* Xóa test chỉ để build xanh.
* Đổi expectation đúng thành expectation sai.
* Dùng `any` để che lỗi type.
* Thêm `eslint-disable` không có lý do xác đáng.
* Comment code lỗi.
* Mock bỏ qua business logic cần kiểm tra.
* Báo “hoàn thành” khi command chưa chạy thành công.

## Bước 7: Cập nhật file kế hoạch

Chỉ sau khi task thật sự pass, cập nhật mục:

```md
## 0. Tiến độ thực hiện code
```

Ghi:

* Task ID.
* Trạng thái `Hoàn thành`.
* Ngày hiện tại.
* Chức năng đã triển khai.
* API đã thêm.
* Business rule chính.
* Test đã thêm.
* Các command đã chạy.
* Số lượng test pass nếu xác định được.
* Ghi chú migration/seed nếu có.

Không viết ghi chú chung chung như “đã làm xong”.

Ví dụ:

```md
| P1-07 | Hoàn thành | YYYY-MM-DD | Đã thêm CartModule với GET /api/cart; tự tạo active cart cho current user; chỉ trả item thuộc user; include variant/product/image/inventory và tính quantityAvailable; e2e cover 401, cart rỗng, tự tạo cart và không lộ cart user khác; build/test/e2e/lint/audit đều pass. |
```

## Bước 8: Tiếp tục task tiếp theo

Sau khi cập nhật plan:

* Đọc lại backlog.
* Chọn task tiếp theo.
* Tiếp tục vòng lặp.
* Không dừng chỉ vì đã hoàn thành một task.

Chỉ dừng khi đạt một trong các điều kiện:

1. Toàn bộ MVP bắt buộc đã hoàn thành và kiểm thử.
2. Xuất hiện blocker thực sự không thể giải quyết bằng repository hiện tại, ví dụ thiếu secret của dịch vụ bên ngoài bắt buộc.
3. Môi trường không cho phép chạy command quan trọng và không có giải pháp thay thế hợp lý.

Thiếu thông tin nhỏ không phải blocker. Hãy chọn phương án hợp lý, an toàn và nhất quán với code hiện tại.

---

# 4. PHẠM VI MVP PHẢI GIỮ ĐÚNG TRỌNG TÂM

Ưu tiên backlog MVP theo luồng dependency, không nhất thiết chỉ theo thứ tự số cứng nhắc.

Các nhóm task chính còn lại cần được hoàn thiện:

## Core buying flow

* `P1-07`: Tạo/lấy active cart.
* `P1-08`: Add cart item.
* `P1-09`: Update/remove/select cart item.
* `P1-10`: Checkout preview.
* `P1-11`: Create order transaction.
* `P1-12`: Order history.
* `P1-13`: Order detail.
* `P1-14`: Fake/COD payment.
* `P1-15`: Inventory reserve/deduct.

## Seller flow

* `P2-01`: Seller register shop.
* `P2-02`: Admin approve/reject shop.
* `P2-03`: Seller product list.
* `P2-04`: Create product.
* `P2-05`: Update/delete product.
* `P2-06`: Variant CRUD.
* `P2-07`: Product image manager.
* `P2-08`: Inventory management.
* `P2-09`: Seller order list/detail.
* `P2-10`: Confirm shop order.
* `P2-11`: Prepare shop order.
* `P2-12`: Cancellation cơ bản nếu cần cho MVP.

## Shipping flow

* `P3-01`: Shipping company CRUD.
* `P3-02`: Shipping service CRUD.
* `P3-03`: Shipping quote.
* `P3-04`: Create shipment.
* `P3-05`: Tracking update.
* `P3-06`: Complete order.

## Review flow

* `P4-01`: Create product review.
* `P4-02`: Public product reviews nếu cần để hoàn chỉnh trải nghiệm MVP.

Không triển khai `Could-have` khi còn task `Must-have` chưa hoàn thành, trừ khi nó là dependency kỹ thuật bắt buộc.

---

# 5. TIÊU CHUẨN KIẾN TRÚC

Giữ đúng kiến trúc NestJS hiện tại.

Mỗi domain nên tách thành module rõ ràng:

```txt
src/modules/
  auth/
  users/
  addresses/
  categories/
  products/
  cart/
  shops/
  inventory/
  orders/
  payments/
  shipping/
  reviews/
```

Mỗi module ưu tiên cấu trúc:

```txt
module-name/
  dto/
  module-name.controller.ts
  module-name.service.ts
  module-name.module.ts
```

Không tạo abstraction hoặc repository layer không cần thiết chỉ để “enterprise hóa”.

Không phá vỡ conventions hiện có.

Tái sử dụng:

* `JwtAuthGuard`
* `RolesGuard`
* `@Roles`
* `@CurrentUser`
* Pagination helpers.
* Response interceptor.
* Exception filter.
* Prisma service.
* Error response convention.

---

# 6. QUY TẮC AUTHORIZATION

Không tin dữ liệu ownership từ client.

Luôn lấy user từ JWT.

Không nhận `userId` từ body để quyết định quyền sở hữu.

Seller:

* Chỉ quản lý shop có `ownerUserId = currentUser.id`.
* Chỉ quản lý product/variant/image/inventory thuộc shop của mình.
* Chỉ xem `ShopOrder` thuộc shop của mình.
* Không được xem item hoặc dữ liệu nội bộ của shop khác.

Customer:

* Chỉ xem/sửa profile và address của chính mình.
* Chỉ xem và sửa cart của chính mình.
* Chỉ xem order của chính mình.
* Chỉ review order item thuộc order của chính mình.
* Chỉ review khi order đã hoàn tất.

Admin:

* Route admin phải có `JwtAuthGuard`, `RolesGuard` và role Admin.
* Thao tác approve/reject phải ghi actor và timestamp nếu schema hỗ trợ.

Mỗi endpoint protected cần test ít nhất:

* Không token → `401`.
* Sai role → `403`.
* Không ownership → `403` hoặc `404` theo convention hiện tại.
* Ownership hợp lệ → thành công.

---

# 7. QUY TẮC DATABASE VÀ TRANSACTION

Các thao tác sau bắt buộc dùng Prisma transaction:

* Tạo default address và bỏ default cũ.
* Checkout.
* Tạo order tổng.
* Tách shop order.
* Tạo order item.
* Tạo payment.
* Reserve/deduct inventory.
* Xóa cart item sau checkout.
* Hủy order và hoàn tồn kho.
* Cập nhật inventory có transaction log.
* Tạo shipment cùng shipment items.
* Cập nhật trạng thái giao hàng và hoàn tất order.
* Payment status cùng payment history.

Không dùng thao tác read-check-write thiếu atomicity cho tồn kho.

Tại checkout:

1. Đọc lại dữ liệu từ database.
2. Không tin `price`, `shopId`, `productId`, `subtotal` từ client.
3. Validate product public.
4. Validate variant active.
5. Validate shop approved.
6. Validate category active nếu business rule yêu cầu.
7. Validate inventory available.
8. Tính giá phía server.
9. Snapshot dữ liệu order.
10. Tạo order và payment.
11. Reserve hoặc deduct inventory.
12. Ghi `InventoryTransaction`.
13. Xóa hoặc bỏ chọn cart item sau khi thành công.
14. Rollback toàn bộ nếu một bước thất bại.

Phải bảo đảm:

```txt
quantityOnHand >= 0
quantityReserved >= 0
quantityReserved <= quantityOnHand
quantityAvailable = quantityOnHand - quantityReserved
```

Không dùng JavaScript `number` một cách bất cẩn cho tiền.

Tôn trọng `Decimal` của Prisma và quy tắc làm tròn hiện tại.

---

# 8. BUSINESS RULE CHO CART

Cart phải tuân theo:

* Mỗi user có một active cart.
* `GET /cart` có thể tự tạo cart nếu chưa tồn tại.
* Cart item chỉ được thêm khi product/variant còn hợp lệ.
* Quantity phải là số nguyên lớn hơn 0.
* Không vượt tồn khả dụng.
* Nếu variant đã tồn tại trong cart, cộng quantity thay vì tạo duplicate, trừ khi schema yêu cầu khác.
* Giá trong cart chỉ là snapshot tham khảo.
* Khi đọc cart phải trả giá hiện tại và cảnh báo nếu giá thay đổi nếu project có convention đó.
* Khi checkout phải tính lại toàn bộ.
* User không được sửa hoặc xóa item của user khác.
* Variant inactive, product deleted hoặc shop không approved phải bị từ chối khi checkout.

Test tối thiểu:

* Cart rỗng.
* Tạo active cart.
* Add item thành công.
* Add item trùng.
* Quantity bằng 0.
* Quantity âm.
* Quantity vượt tồn.
* Product draft.
* Variant inactive.
* Shop pending.
* Cart item của user khác.
* Update quantity.
* Select/unselect.
* Delete item.

---

# 9. BUSINESS RULE CHO ORDER

Order phải hỗ trợ nhiều shop.

Một lần checkout có thể tạo:

```txt
1 Order
N ShopOrder
N OrderItem
1 hoặc nhiều Payment tùy thiết kế schema
N InventoryTransaction
N OrderStatusHistory
```

Các yêu cầu bắt buộc:

* Group cart item theo shop.
* `Order` lưu tổng tiền toàn bộ.
* Mỗi `ShopOrder` lưu subtotal/shipping/discount/total tương ứng.
* `OrderItem` phải snapshot:

  * Product name.
  * Variant name.
  * SKU.
  * Price.
  * Quantity.
  * Image nếu schema hỗ trợ.
* Order phải snapshot địa chỉ giao hàng.
* Không truy ngược dữ liệu sản phẩm hiện tại để hiển thị lịch sử đơn.
* Customer chỉ xem order của mình.
* Seller chỉ xem shop order của shop mình.
* Admin có thể xem toàn bộ.
* Status transitions phải có allowlist.
* Mọi transition quan trọng phải ghi history.

Không cho phép transition tùy ý.

Ví dụ:

```txt
Created
→ WaitingForSeller
→ Confirmed
→ Preparing
→ Prepared
→ Shipping
→ Delivered
→ Completed
```

Các trạng thái cancel/reject chỉ được phép từ các trạng thái phù hợp.

Tên enum thực tế phải lấy từ `schema.prisma`, không tự phát minh nếu schema đã định nghĩa.

---

# 10. BUSINESS RULE CHO PAYMENT

MVP chỉ cần:

* COD.
* Fake online payment.

Payment phải:

* Gắn đúng order.
* Amount bằng tổng order do server tính.
* Có trạng thái khởi tạo rõ ràng.
* Mỗi thay đổi trạng thái ghi `PaymentStatusHistory`.
* Fake success chỉ chạy khi payment đang ở trạng thái cho phép.
* Gọi fake success hai lần không được tạo trạng thái sai hoặc duplicate không kiểm soát.
* User chỉ thao tác payment thuộc order của mình.
* Admin có thể xem/điều chỉnh nếu API MVP yêu cầu.

Không tích hợp provider thật khi chưa hoàn thành MVP core.

---

# 11. BUSINESS RULE CHO SHIPPING

Shipping quote:

* Chỉ dùng shipping service active.
* Tính dựa trên trọng lượng hoặc rule hiện có.
* Giá không được âm.
* Có `expiresAt` nếu schema hỗ trợ.
* Không cho dùng quote hết hạn.

Shipment:

* Chỉ tạo từ shop order đã chuẩn bị xong.
* Shipment item phải tham chiếu đúng order item.
* Tổng quantity shipment item không vượt quantity đã mua.
* Không tạo shipment cho shop order của shop khác.
* Tracking transition phải hợp lệ.
* Mỗi tracking update phải ghi history.
* Khi shipment delivered:

  * Cập nhật shipment.
  * Cập nhật shop order nếu tất cả shipment của shop order đã delivered.
  * Cập nhật order nếu tất cả shop order đã hoàn tất.

Toàn bộ cập nhật liên quan phải atomic nếu cần.

---

# 12. BUSINESS RULE CHO PRODUCT REVIEW

Customer chỉ được review khi:

* Đã đăng nhập.
* Order thuộc chính customer.
* Order item tồn tại.
* Order hoặc shop order đã delivered/completed theo enum thực tế.
* Chưa review order item đó.
* Rating là số nguyên từ 1 đến 5.
* Nội dung tuân thủ validation độ dài.

Review public:

* Chỉ trả review được publish/active nếu schema có trạng thái đó.
* Có pagination.
* Không lộ dữ liệu nhạy cảm của user.
* Có test duplicate review và review trước khi hoàn tất đơn.

---

# 13. CHUẨN API

Giữ format success hiện tại:

```json
{
  "success": true,
  "data": {},
  "message": "OK",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Format error:

```json
{
  "success": false,
  "error": {
    "code": "OUT_OF_STOCK",
    "message": "Sản phẩm không đủ tồn kho",
    "details": []
  }
}
```

Error code phải:

* Ổn định.
* Có ý nghĩa.
* Không trả raw database error.
* Không lộ stack trace ở production.
* Không lộ password, token, secret hoặc database connection string.

Các list endpoint phải có pagination nếu dữ liệu có thể tăng lớn.

Sort field phải dùng allowlist, không đưa trực tiếp input client vào Prisma `orderBy`.

---

# 14. VALIDATION VÀ SECURITY

Mọi DTO phải dùng validation rõ ràng.

Bắt buộc xem xét:

* Whitelist field.
* Reject unknown property nếu convention hiện tại bật forbid.
* UUID/CUID/int validation đúng với schema.
* Chuẩn hóa email.
* Trim string phù hợp.
* Min/max length.
* Positive integer.
* Decimal không âm.
* Enum validation.
* Date validation.
* File MIME và size validation.
* Slug validation.
* Search input length limit.
* Pagination limit tối đa.
* Không mass assignment.
* Không truyền raw SQL từ client.
* Không log password/JWT.
* Không trả password hash.
* Không commit `.env`.
* Không hard-code production secret.

Nếu thêm config mới, cập nhật `.env.example` và validation config.

---

# 15. TEST STRATEGY

Không chỉ test happy path.

Mỗi module cần cover:

## Authentication

* 401 khi thiếu token.
* 403 khi sai role.
* Current user đúng.
* Ownership isolation.

## Validation

* Missing required field.
* Sai type.
* Sai enum.
* Giá trị âm.
* ID không hợp lệ.
* Unknown property nếu project đang forbid.

## Business logic

* Duplicate.
* Resource inactive.
* Resource deleted.
* Invalid state transition.
* Out of stock.
* Race-sensitive operations.
* User khác.
* Shop khác.
* Item khác cart.
* Payment sai trạng thái.
* Shipment sai trạng thái.
* Review chưa đủ điều kiện.

## Database behavior

* Transaction rollback.
* Không tạo dữ liệu dở dang.
* Inventory không âm.
* Có history log.
* Soft delete đúng.
* Pagination meta đúng.
* Không lộ dữ liệu giữa users/shops.

E2E test phải kiểm tra cả status code và response body quan trọng.

Không chỉ kiểm tra endpoint “có trả 200”.

---

# 16. PRODUCTION READINESS

Code được xem là production-ready trong phạm vi MVP khi:

* Build pass.
* Unit test pass.
* E2E pass.
* Lint pass.
* Production dependency audit không có lỗi nghiêm trọng chưa xử lý.
* Prisma validate/generate pass.
* Migration nhất quán.
* Seed idempotent.
* Docker config hợp lệ nếu project dùng Docker.
* Health endpoint hoạt động.
* Không có TODO quan trọng trong flow MVP.
* Không có stub hoặc fake implementation ngoài fake payment đã định nghĩa.
* Không có endpoint thiếu authorization.
* Không có query làm lộ cross-tenant data.
* Checkout atomic.
* Inventory có protection.
* Status transition có kiểm soát.
* Error format thống nhất.
* README có hướng dẫn chạy tối thiểu.
* `.env.example` đầy đủ.
* End-to-end MVP demo chạy thành công.

Production-ready không có nghĩa phải triển khai voucher, refund, complaint hoặc payment gateway thật.

Chỉ cần MVP đúng scope, an toàn, ổn định và có thể demo/deploy.

---

# 17. NHỮNG ĐIỀU TUYỆT ĐỐI KHÔNG ĐƯỢC LÀM

Không được:

* Chỉ viết kế hoạch rồi dừng.
* Chỉ mô tả code cần viết.
* Chỉ đưa code snippet nhưng không sửa repository.
* Chờ xác nhận sau mỗi task.
* Hỏi lại những thông tin đã có trong plan hoặc repository.
* Tự ý thay đổi stack.
* Rewrite toàn bộ hệ thống khi không cần.
* Thay SQL Server bằng database khác.
* Thay Prisma bằng ORM khác.
* Thay NestJS bằng framework khác.
* Phá API đã hoàn thành.
* Xóa migration cũ tùy tiện.
* Xóa test đang pass.
* Bỏ authentication để test dễ hơn.
* Hard-code user/shop/order ID trong production code.
* Tin giá hoặc tổng tiền gửi từ client.
* Bỏ transaction cho checkout.
* Đánh dấu task hoàn thành mà chưa chạy test.
* Tuyên bố toàn bộ MVP hoàn thành khi chưa chứng minh bằng flow end-to-end.
* Triển khai tính năng ngoài scope trong khi core flow còn thiếu.

---

# 18. CÁCH XỬ LÝ BLOCKER

Khi gặp lỗi:

1. Tự đọc source.
2. Tự đọc schema.
3. Tự đọc migration.
4. Tự đọc test.
5. Tự kiểm tra dependency và version.
6. Tìm giải pháp tương thích với kiến trúc hiện tại.
7. Thử phương án an toàn nhất.
8. Ghi lại quyết định kỹ thuật nếu nó ảnh hưởng kiến trúc.

Chỉ coi là blocker thực sự khi:

* Cần credential bên ngoài không có cách mock.
* Cần quyền hệ thống không được cấp.
* File cốt lõi bị thiếu hoàn toàn và không thể tái tạo.
* Database service bắt buộc không thể khởi động trong môi trường.

Nếu SQL Server không khả dụng:

* Vẫn hoàn thiện API layer.
* Dùng mock/in-memory Prisma test theo convention hiện có.
* Chạy Prisma validate/generate.
* Viết migration/schema đúng.
* Ghi rõ phần xác minh database thật chưa thể chạy.
* Không được nói đã xác minh database thật nếu chưa chạy.

---

# 19. BÁO CÁO SAU MỖI TASK

Sau mỗi task hoàn thành, báo cáo ngắn gọn theo mẫu:

```md
## Completed: P1-07 — Active Cart

### Implemented
- ...
- ...

### Security and business rules
- ...
- ...

### Tests added
- ...
- ...

### Verification
- `npm run build`: PASS
- `npm test`: PASS
- `npm run test:e2e`: PASS
- `npm run lint`: PASS
- `npm audit --omit=dev`: PASS

### Files changed
- ...
- ...

### Plan updated
- Đã cập nhật P1-07 thành Hoàn thành trong
  `plan_schema_prisma_mvp_ecommerce.md`.

### Next task
- P1-08 — Add cart item.
```

Sau đó tiếp tục task tiếp theo, không chờ người dùng yêu cầu lại.

---

# 20. DEFINITION OF DONE CHO TỪNG TASK

Một task chỉ được đánh dấu `Hoàn thành` khi đồng thời đáp ứng:

* Acceptance criteria trong plan.
* API hoặc chức năng hoạt động thật.
* Authorization đúng.
* Validation đúng.
* Business rules đúng.
* Error handling đúng.
* Test happy path.
* Test failure path quan trọng.
* Build pass.
* Test pass.
* E2E pass.
* Lint pass.
* Không làm hỏng module cũ.
* Plan đã cập nhật chính xác.

Nếu thiếu một trong các điều trên, task vẫn là `Đang thực hiện` hoặc `Bị chặn`, không phải `Hoàn thành`.

---

# 21. DEFINITION OF DONE CHO TOÀN MVP

Chỉ tuyên bố:

```txt
MVP COMPLETE
```

khi tất cả điều kiện sau đều đạt:

1. Tất cả task Must-have phục vụ MVP đã hoàn thành.
2. Không còn task chặn demo flow.
3. Customer có thể mua sản phẩm từ ít nhất hai shop trong một checkout.
4. Checkout tạo đúng một order tổng và nhiều shop order.
5. Order item snapshot đúng.
6. Inventory thay đổi đúng và có transaction log.
7. Seller chỉ nhìn thấy shop order của mình.
8. Seller confirm và prepare được đơn.
9. Shipment và tracking hoạt động.
10. Đơn được completed đúng điều kiện.
11. Customer review được sản phẩm sau khi hoàn tất.
12. Không review trùng.
13. Không có cross-user hoặc cross-shop data leak.
14. Toàn bộ build/test/e2e/lint pass.
15. Prisma validate/generate pass.
16. Seed đủ dữ liệu demo và chạy idempotent.
17. File plan cập nhật toàn bộ trạng thái thực tế.
18. README có hướng dẫn chạy và demo.
19. Có báo cáo cuối cùng về API, test và những phần cố ý để sau MVP.

---

# 22. FINAL MVP ACCEPTANCE TEST

Trước khi tuyên bố hoàn thành, phải tạo hoặc chạy một kịch bản test bao phủ:

```txt
Admin login
→ tạo hoặc kiểm tra category
→ Seller A đăng ký shop
→ Admin approve Seller A
→ Seller A tạo product + variant + inventory
→ Seller B có product + variant + inventory
→ Customer đăng ký/login
→ Customer tạo address
→ Customer add item của Seller A vào cart
→ Customer add item của Seller B vào cart
→ Customer checkout preview
→ Customer create order
→ kiểm tra tạo 2 ShopOrder
→ kiểm tra OrderItem snapshot
→ kiểm tra Payment
→ kiểm tra inventory reserve/deduct
→ Seller A confirm và prepare
→ Seller B confirm và prepare
→ tạo shipment cho từng ShopOrder
→ cập nhật tracking đến Delivered
→ kiểm tra Order Completed
→ Customer tạo product review
→ chặn duplicate review
```

Phải kiểm tra thêm:

* Checkout thiếu hàng rollback toàn bộ.
* Customer không xem order người khác.
* Seller A không xem shop order Seller B.
* Seller không sửa product shop khác.
* Fake payment không thể success hai lần sai logic.
* Invalid status transition bị chặn.
* Review trước khi completed bị chặn.

---

# 23. BẮT ĐẦU THỰC HIỆN

Bây giờ hãy:

1. Đọc `@plan_schema_prisma_mvp_ecommerce.md`.
2. Đọc toàn bộ repository hiện tại.
3. Xác minh các task được ghi là hoàn thành.
4. Xác định task Must-have chưa hoàn thành đầu tiên có dependencies đầy đủ.
5. Triển khai task đó hoàn chỉnh.
6. Chạy toàn bộ quality gate.
7. Sửa lỗi đến khi pass.
8. Cập nhật file plan.
9. Tiếp tục task tiếp theo.
10. Lặp lại cho đến khi toàn bộ MVP đạt Definition of Done.

Không chỉ trả về kế hoạch.

Không dừng sau một task nếu vẫn còn khả năng tiếp tục.

Không yêu cầu xác nhận trung gian.

**Hãy trực tiếp thực thi repository và hoàn thành MVP.**
