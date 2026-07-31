# AI Integration Task: Intelligent Chatbot for E-commerce Marketplace (Monolith)

## Objective

Phân tích toàn bộ hệ thống thương mại điện tử hiện tại và tích hợp một AI Chatbot thông minh vào kiến trúc **Monolith NestJS**.

Chatbot phải hoạt động như một **AI Assistant** có khả năng:

* Hiểu ngôn ngữ tự nhiên.
* Gọi đúng nghiệp vụ của hệ thống thông qua Function Calling.
* Không truy cập trực tiếp database.
* Không chứa business logic.
* Tái sử dụng toàn bộ Service hiện có.
* Không phá vỡ kiến trúc hiện tại.

---

# Phase 1 - Audit Existing System

Trước khi viết bất kỳ dòng code nào, hãy audit toàn bộ project.

Phân tích:

* Folder structure
* Module dependencies
* NestJS Modules
* Controllers
* Services
* Prisma Models
* DTO
* Guards
* Interceptors
* Filters
* Authentication
* Authorization
* Current APIs
* Existing business flow
* Upload module
* Product module
* Category
* Inventory
* Cart
* Wishlist
* Voucher
* Checkout
* Payment
* Order
* Shipping
* Review
* Notification
* User
* Seller
* Admin

Liệt kê:

* module nào có thể tái sử dụng
* service nào chatbot có thể gọi
* API nào đã tồn tại
* business logic nào cần giữ nguyên

Không thay đổi code trong giai đoạn này.

---

# Phase 2 - Design Chat Architecture

Thiết kế module mới:

chat/

Bao gồm:

* ChatModule
* ChatController
* ChatGateway (WebSocket)
* ChatService
* LLMService
* PromptService
* ToolDispatcher
* ConversationService
* RAGService (nếu cần)
* DTO
* Interfaces
* Types
* Prompts
* Tools

Chat module phải độc lập.

Không được đưa business logic vào ChatService.

---

# Phase 3 - Conversation Flow

Thiết kế flow:

User

↓

ChatController

↓

ChatService

↓

LLM

↓

Function Calling

↓

Tool Dispatcher

↓

Existing Service

↓

Result

↓

LLM

↓

Response

↓

User

LLM chỉ quyết định:

* Intent
* Tool
* Parameters

Mọi xử lý nghiệp vụ đều nằm trong các Service hiện có.

---

# Phase 4 - Tool Mapping

Phân tích toàn bộ service hiện tại.

Sinh danh sách Tool.

Ví dụ:

Product

* searchProducts
* getProduct
* compareProducts
* getReviews

Cart

* addToCart
* removeFromCart
* updateQuantity
* getCart

Order

* getOrder
* cancelOrder
* getHistory
* trackOrder

Payment

* createPayment
* paymentStatus

Voucher

* findVoucher
* applyVoucher

Shipping

* calculateFee
* tracking

User

* profile
* address

Seller

* inventory
* products
* dashboard

Admin

* statistics
* reports

Tool chỉ gọi Service.

Không chứa business logic.

---

# Phase 5 - Prompt Engineering

Thiết kế System Prompt.

Yêu cầu:

* Luôn trả lời bằng tiếng Việt.
* Không tự bịa thông tin.
* Nếu cần dữ liệu phải gọi Tool.
* Không truy cập database.
* Không tự tính toán tồn kho.
* Không tự suy luận trạng thái đơn hàng.
* Không trả lời ngoài phạm vi hệ thống.
* Khi không đủ dữ liệu phải yêu cầu thêm thông tin.

---

# Phase 6 - Authentication

Chatbot phải nhận biết:

Guest

Customer

Seller

Admin

Theo JWT hiện tại.

Không tạo cơ chế xác thực mới.

---

# Phase 7 - Function Calling

Thiết kế chuẩn Function Calling.

Ví dụ:

searchProducts()

addToCart()

trackOrder()

cancelOrder()

applyVoucher()

calculateShipping()

Mỗi Tool phải:

* validate input
* gọi đúng Service
* trả dữ liệu chuẩn

Không xử lý business logic.

---

# Phase 8 - Conversation Memory

Thiết kế lưu lịch sử chat.

Bao gồm:

* session
* context
* previous messages

Có thể dùng Redis hoặc PostgreSQL.

Không lưu thông tin nhạy cảm.

---

# Phase 9 - RAG (Optional)

Nếu hệ thống có:

* FAQ
* Chính sách
* Điều khoản
* Hướng dẫn

Hãy thiết kế RAG.

Sử dụng:

* PostgreSQL + pgvector

Embedding:

* BGE-M3 hoặc OpenAI Embedding.

---

# Phase 10 - Error Handling

Thiết kế:

* timeout
* tool error
* invalid parameter
* unauthorized
* forbidden
* LLM unavailable

Chatbot phải trả lời thân thiện.

---

# Phase 11 - Security

Không cho phép chatbot:

* thực thi SQL
* truy cập Prisma trực tiếp
* bypass authentication
* bypass authorization
* gọi service không được phép
* đọc dữ liệu của người khác

Kiểm tra quyền trước khi gọi Tool.

---

# Phase 12 - Implementation

Triển khai từng bước.

Sau mỗi bước:

* Build project.
* Chạy TypeScript compile.
* Chạy ESLint.
* Không tạo lỗi mới.

Không refactor các module không liên quan.

---

# Phase 13 - Testing

Viết test cho:

* ChatService
* ToolDispatcher
* LLMService

Kiểm thử các kịch bản:

* tìm sản phẩm
* thêm giỏ hàng
* xem đơn hàng
* hủy đơn
* hỏi chính sách
* lỗi xác thực
* lỗi tool
* timeout

---

# Constraints

* Không thay đổi business logic hiện có.
* Không sửa Prisma Schema nếu không cần thiết.
* Không phá API đang hoạt động.
* Không đổi cấu trúc module hiện tại.
* Ưu tiên tái sử dụng Service.
* Không duplicate code.
* Tuân thủ SOLID.
* Tuân thủ Clean Architecture.
* Tuân thủ NestJS Best Practices.

---

# Expected Deliverables

1. Báo cáo audit hệ thống.
2. Thiết kế kiến trúc chatbot.
3. Sơ đồ luồng xử lý.
4. Danh sách Function Calling.
5. Thiết kế Prompt.
6. Thiết kế Conversation Memory.
7. Thiết kế bảo mật.
8. Kế hoạch triển khai theo từng phase.
9. Mã nguồn hoàn chỉnh.
10. Unit Test và Integration Test.

Trước khi viết code, hãy hoàn thành phần phân tích kiến trúc và lập kế hoạch triển khai chi tiết. Chỉ bắt đầu cài đặt sau khi xác nhận rằng thiết kế không làm ảnh hưởng đến các chức năng hiện có của hệ thống.
