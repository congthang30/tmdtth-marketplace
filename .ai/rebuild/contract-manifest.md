# Frontend route and data contract manifest

Snapshot cho `FE-RB-002`, đối chiếu working tree ngày **2026-07-10**. File này khóa các behavior cần bảo tồn khi rebuild; các mục ghi rõ là defect/gap **không phải** behavior mục tiêu.

Nguồn:

- `frontend/src/app/router.tsx`
- `frontend/src/features/*/api.ts`
- `frontend/src/features/*/types.ts`
- `frontend/src/features/*/pages/*.tsx`
- `frontend/src/services/api.ts`, `errors.ts`
- `frontend/src/types/api.ts`, `domain.ts`
- `backend/src/modules/**/*controller.ts`, DTO và service liên quan
- SHA-256 snapshot tại [`contract-hashes.md`](contract-hashes.md)

## 1. Transport và response contract

| Hạng mục | Contract hiện tại |
| --- | --- |
| Frontend base URL | `VITE_API_BASE_URL`, fallback `http://localhost:3100/api` |
| Authentication | `Authorization: Bearer <token>` |
| Token storage | `localStorage`, key `tmdtth.accessToken` |
| BigInt IDs | Serialize thành string; nhiều response có cả `id` và `idString` là string |
| Money/Decimal | String; UI format bằng `Intl.NumberFormat('vi-VN')` |
| Pagination | `page`, `limit`, `total`, `totalPages`; backend mặc định thường `1/20`, limit tối đa 100 |
| Query defaults | `staleTime=30s`, `retry=1`, `refetchOnWindowFocus=false` |

Success envelope:

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

Error envelope:

```ts
type ApiErrorPayload = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
};
```

Frontend phải tiếp tục unwrap envelope, normalize error code sang tiếng Việt và không hiển thị backend stack/message thô.

## 2. Auth và authorization contract

### Roles

```ts
type AppRole = 'Customer' | 'Seller' | 'Admin';
```

- User có thể có nhiều role.
- Backend luôn cấp `Customer`; `Admin` dựa trên cấu hình `ADMIN_EMAILS`; `Seller` dựa trên `SELLER_EMAILS` hoặc ownership của shop chưa xóa.
- Role được tính lại qua `/auth/me`; frontend không được hard-code nâng quyền.

### Session lifecycle

- `AuthSessionProvider` có token thì gọi `GET /auth/me` với key `['auth','me']`, `retry:false`.
- Query lỗi sẽ clear token/user.
- `ProtectedRoute`: không token → `/login` với `state.from = location.pathname`; session loading → blocking loading.
- `RoleRoute`: chọn role được phép trong `user.roles`, gọi role-check API; thiếu role hoặc lỗi → `/forbidden`.
- API interceptor gặp 401: clear auth và hard navigate `/login`; 403: hard navigate `/forbidden`.
- Logout backend stateless; frontend clear auth trong `onSettled`.

### Contract conflict cần quyết định

`POST /shops` chỉ cần JWT và backend cho Customer tạo shop, nhưng route `/seller/shop/register` đang bọc `RoleRoute(['Seller'])`. Customer chưa có shop và không nằm trong `SELLER_EMAILS` không thể vào màn hình tạo shop.

- Không tự sửa trong `FE-RB-002`.
- Trước khi rebuild seller onboarding, cần Product/Auth decision: cho mọi authenticated Customer mở đăng ký, hay giữ pre-provisioned Seller.
- Theo dõi bằng `DEC-FE-10` trong plan rebuild.

## 3. Route contract

### Public và purchase shell

| Route | Access | Data/API | State/action hiện có | Invariant cần giữ |
| --- | --- | --- | --- | --- |
| `/`, `/products` | Public | Categories, product list; URL `page,q,categoryId,minPrice,maxPrice,sortBy,sortOrder` | Product loading/error/empty; category partial error; apply/reset/pagination | URL là source of truth; invalid page → 1; chỉ filter/sort backend hỗ trợ |
| `/products/:slug` | Public | Product detail, reviews page 1/5; add cart nếu login | Gallery, variant, quantity, review states, add/login CTA | Giá/stock từ response; add payload `{productVariantId,quantity}`; out-of-stock bug không được bảo tồn |
| `/cart` | JWT | Cart GET/update/select/delete | Loading/error/empty; quantity/select/delete/checkout | Totals/selection từ server; checkout khi selected count >0; invalidate `['cart']` |
| `/checkout` | JWT | Cart, addresses, payment methods, services, quotes, preview, create order | Combined/partial states; quote từng shop; submit | Selected items only; preview là source totals; đủ quote cho mỗi shop; success invalidate cart và tới order detail |
| `/login` | Public; token thì dashboard | Login mutation, `location.state.from` | Validation/API error/pending | Payload email/password; success store token/user; return path hiện chỉ giữ pathname |
| `/register` | Public; token thì dashboard | Register mutation | Validation/API error/pending | Phone rỗng → `undefined`; success store token/user và dashboard |
| `/forbidden` | Public | Không page API; hiện thừa hưởng health call từ PublicLayout | Static 403 | Đích của RoleRoute/API 403 |
| `/not-found`, `*` | Public | Không API | Static 404 / redirect | Canonical fallback; hiện 404 nằm ngoài branded shell |

### Customer/account routes

| Route | Access | Data/API | State/action hiện có | Invariant cần giữ |
| --- | --- | --- | --- | --- |
| `/dashboard` | JWT | Shared auth only | Placeholder | Target chỉ là role-aware hub; không fake analytics |
| `/profile` | JWT | `GET/PATCH /users/me` | Loading/error/edit/pending | Success sync auth store; nullable field giữ đúng `null`; email/phone/status/roles read-only |
| `/addresses` | JWT | Address list 1/100, create/update/delete/default | Loading/error/empty; form/delete dialogs | Default dùng endpoint riêng; invalidate `['account','addresses']` |
| `/orders` | JWT | Orders page/10, page local | Loading/error/empty/pagination | Server snapshots/status/totals authoritative |
| `/orders/:id` | JWT | Detail, cancel, fake payment, create review | Detail/action/dialog states | Cancel UI chỉ Created+Pending; fake payment chỉ pending `FAKE_ONLINE`; review chỉ trạng thái reviewable; hiển thị snapshots |

### Seller routes

| Route | Access | Data/API | State/action hiện có | Invariant cần giữ |
| --- | --- | --- | --- | --- |
| `/seller` | JWT + Seller | Own shop, products 1/5, orders 1/5 | Shop states, recent lists/stats | `shop=null` là valid empty; query error không được giả thành 0 |
| `/seller/shop/register` | JWT + Seller hiện tại | Create shop | Form states | Approval do backend/Admin; xem auth conflict ở section 2 |
| `/seller/products` | JWT + Seller | Products page/10, delete | List/table/delete confirm | Ownership backend; invalidate seller product prefix |
| `/seller/products/create` | JWT + Seller | Own shop, categories, create | Combined states/form | `shopId` từ own shop; status `Draft|Published`; money giữ string |
| `/seller/products/:id/edit` | JWT + Seller | Own shop, categories, list tối đa 100 để lookup, update | Combined/not-found/form | Không gửi `shopId` khi update; lookup 100 là defect, không phải target contract |
| `/seller/products/:id/variants` | JWT + Seller | Variant CRUD | List/form/delete states | `Active|Inactive`; SKU/price/weight; giữ `variantOptionJson` round-trip |
| `/seller/products/:id/images` | JWT + Seller | Images, variants, uploads | Upload/save/thumbnail/delete | Upload file và image record là hai bước; optional variant/sort/alt giữ nguyên |
| `/seller/products/:id/inventory` | JWT + Seller | Variants + inventory per variant | Per-card query/mutation states | On-hand/threshold nonnegative; reserved/available server-derived |
| `/seller/orders` | JWT + Seller | Orders page/10 | List/table/pagination | Shop-order snapshot/status/payment/totals authoritative |
| `/seller/orders/:id` | JWT + Seller | Detail, services, confirm/prepare/shipment/tracking | Detail/action/dialog states | UI gates theo status; backend transition là authority; invalidate list+detail |

### Admin routes

| Route | Access | Data/API | State/action hiện có | Invariant cần giữ |
| --- | --- | --- | --- | --- |
| `/admin` | JWT + Admin | Categories, pending shops, companies, services | Combined loading/stats | Partial query error phải khác zero thật |
| `/admin/categories` | JWT + Admin | Category CRUD/deactivate | List/form/deactivate | Deactivate, không hard-delete; parent cycle backend authority |
| `/admin/shops` | JWT + Admin | Paged/status list, approve/reject | List/filter/dialog | Status filter chỉ supported allowlist; action chỉ PendingApproval |
| `/admin/shipping/companies` | JWT + Admin | List/detail/create/update/delete | List/edit-load/dialog | Preserve company statuses; endpoint quyết định delete semantics |
| `/admin/shipping/services` | JWT + Admin | Company options, service list/detail/CRUD/deactivate | List/filter/dialog | Filter chỉ company; deactivate không hard-delete |

## 4. Endpoint inventory và quyền

### Public

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /categories`
- `GET /products`
- `GET /products/:slug`
- `GET /products/:slug/reviews`

### JWT, không có role guard riêng

- `POST /auth/logout`, `GET /auth/me`
- `GET/PATCH /users/me`
- `GET/POST /addresses`
- `PATCH/DELETE /addresses/:id`, `PATCH /addresses/:id/default`
- `GET /cart`, `POST /cart/items`
- `PATCH /cart/items/:id`, `PATCH /cart/items/:id/select`, `DELETE /cart/items/:id`
- `GET /payments/methods`, `POST /payments/:id/fake-success`
- `POST /orders/checkout-preview`, `POST /orders`
- `GET /orders/my`, `GET /orders/:id`, `PATCH /orders/:id/cancel`
- `GET /shops/me`, `POST /shops`

Ownership của address/cart/order/shop phải tiếp tục do backend kiểm tra; UI guard không thay backend authorization.

### Customer/Seller restricted

- `GET /shipping/services`: Customer hoặc Seller.
- `POST /shipping/quotes`: Customer.
- `POST /reviews/products`: Customer.

### Seller

- `/seller/products`: list/create/update/delete.
- `/seller/products/:productId/variants`: list/create/update/delete.
- `/seller/products/:productId/images`: list/create/update/delete.
- `/seller/products/:productId/variants/:variantId/inventory`: get/set.
- `/seller/orders`: list/detail/confirm/prepare.
- `/seller/orders/:shopOrderId/shipments`: create/update tracking.
- `/uploads`: multipart upload field `file`, list.

### Admin

- `/admin/categories`: list/create/update/deactivate.
- `/admin/shops`: list/approve/reject.
- `/admin/shipping-companies`: list/detail/create/update/delete.
- `/admin/shipping-services`: list/detail/create/update/deactivate.

`PATCH /admin/shops/:id/reject` nhận `reason` từ frontend nhưng controller/service hiện không lưu hoặc dùng reason. UI không được thông báo “đã lưu lý do”; cần backend/product decision trước khi thiết kế reason như dữ liệu bền vững.

## 5. Query key registry hiện tại

| Domain | Query keys |
| --- | --- |
| System/Auth | `['system','health']`; `['auth','me']`; `['auth','role-check',role]` |
| Account | `['account','me']`; `['account','addresses']` |
| Catalog | `['catalog','categories']`; `['categories']`; `['catalog','products',query]`; `['catalog','product',slug]`; `['catalog','product',slug,'reviews']` |
| Cart/Checkout | `['cart']`; `['checkout','payment-methods']`; `['checkout','shipping-services',firstShopId]`; `['checkout','preview',addressId,paymentMethodId,cartItemIds,quoteIds]` |
| Orders | `['orders','my',page]`; `['orders','detail',id]` |
| Seller shop/products | `['seller','shop','me']`; `['seller','products',page]`; `['seller','products','lookup']`; variants/images/inventory keys dưới product id; `['seller','uploads']` |
| Seller orders/shipping | `['seller','orders',page]`; `['seller','orders','detail',id]`; `['shipping','services',shopId]` |
| Admin | Categories; shops by page/status; companies by page/options; services by page/company dưới prefix `['admin', ...]` |

Chỉ `cartQueryKey` được export thành constant. Các key khác đang inline; không đổi key trong cùng PR với visual rewrite nếu chưa có cache regression test.

## 6. Mutation/invalidation contract

| Mutation group | Invalidation hiện tại |
| --- | --- |
| Address create/update/default/delete | `['account','addresses']` |
| Cart update/select/delete | `['cart']` |
| Checkout create order | Cart, rồi navigate order detail |
| Customer cancel/fake payment | Orders prefix + detail |
| Seller create shop | Seller shop prefix |
| Seller product create/update/delete | Seller products prefix |
| Variant CRUD | Variants của product |
| Inventory update | Inventory + variants + seller products |
| Image CRUD/thumbnail | Images của product |
| Upload | Seller uploads |
| Seller order/shipment/tracking | Seller orders + detail |
| Admin category/shop/company/service mutation | Domain prefix tương ứng |

### Cache gaps đã biết — không được bảo tồn như target behavior

1. Add-to-cart tại PDP không invalidate cart.
2. Profile update chỉ set Zustand user, không invalidate account/auth query.
3. Create review không invalidate order detail hoặc public reviews.
4. Admin category mutation không invalidate catalog/seller category keys.
5. Seller product/variant/image/inventory mutation không invalidate public catalog/detail.
6. Company update/delete không invalidate dependent admin services.
7. Cùng `/categories` dùng hai key namespace.
8. Cùng `/shipping/services` dùng hai namespace.
9. Admin detail GET đang dùng mutation thay vì cached query.
10. Seller edit lookup tải tối đa 100 product rồi tìm local.

Mỗi gap phải được sửa ở phase liên quan với test; không “tiện tay” đổi toàn bộ cache trong foundation PR.

## 7. Query/filter contract

| List | Backend thực sự hỗ trợ |
| --- | --- |
| Catalog | `page`, `limit`, `q`, `categoryId`, `minPrice`, `maxPrice`, `sortBy`, `sortOrder` |
| Catalog `q` | Product name, brand, description |
| Catalog sort | `createdAt`, `basePrice`, `soldCount`, `viewCount`, `productName`; `asc|desc` |
| Admin shops | `page`, `limit`, status `PendingApproval|Approved|Rejected` |
| Admin shipping services | `page`, `limit`, `shippingCompanyId` |
| Active shipping services | `page`, `limit`, `shopId?`; shopId kiểm tra quotable, không giới hạn catalog service theo shop |
| Orders/seller orders/seller products/companies | Hiện chỉ page/limit ở service dù DTO nền có thể có field khác |

Không tạo search/sort/filter UI nếu service không xử lý tham số.

## 8. Status và transition contract

| Domain | Status/transition |
| --- | --- |
| User | Register tạo Active; PendingVerification có trong schema; Suspended/Deleted bị chặn login |
| Shop | `PendingApproval → Approved | Rejected` |
| Product | `Draft | Published → Deleted` |
| Variant | `Active | Inactive` |
| Cart | `Active` |
| Parent order | `Created → Confirmed → Prepared → Shipping → Delivered → Completed`; có Cancelled theo điều kiện |
| Shop order | `WaitingForSeller → Confirmed → Prepared → Shipping → Delivered → Completed` |
| Payment | `Pending → Paid | Cancelled` |
| Shipment | `Pending → PickedUp | InTransit`; `PickedUp → InTransit | Delivered`; `InTransit → Delivered` |
| Review | `Published` |
| Shipping company | `PendingApproval | Approved | Rejected | Suspended | Inactive` |
| Shipping service | `isActive: boolean` |

UI guard chỉ điều khiển affordance; backend vẫn là authority của transition. Generic `formatStatus` hiện dịch `Published` thành “Đã đăng bán”, không phù hợp mọi domain; target mapping phải theo domain mà không đổi enum.

## 9. Data invariants

- Public catalog chỉ trả product Published, shop Approved, category active, không deleted/violation, có variant Active còn hàng.
- Public product response chỉ chứa variant Active có quantity available >0 theo backend hiện tại; UI vẫn phải defensive với zero/missing data.
- Cart snapshot price chỉ tham khảo; checkout tính lại current price và báo `priceChanged`.
- Checkout preview không tạo side effect; create order là server transaction và source of truth.
- Order/detail dùng snapshots; không thay bằng product/shop hiện tại.
- Inventory `reserved`/`available` là server-derived; seller chỉ gửi on-hand/threshold theo DTO.
- Review chỉ hợp lệ cho owned delivered/completed order item và không duplicate.
- Seller/admin ownership/role luôn phải được backend thực thi kể cả khi UI ẩn route/action.

## 10. Capability chưa có contract

Không tạo route, CTA hoặc production mock cho:

- Wishlist, notification, loyalty.
- Voucher/coupon management hoặc redeem; checkout trả `VOUCHER_NOT_SUPPORTED`, preview `voucher:null`.
- Flash sale/countdown, official store, freeship flag.
- Q&A, related products, search suggestion/history, buy-now.
- Product aggregate rating/histogram.
- Public shop detail.
- Dashboard/seller/admin analytics.
- Return/refund/complaint.
- Brand/rating/location/freeship/official catalog filters.
- Seller product detail endpoint riêng.

`soldCount`/`viewCount` có thể display/sort nhưng không đủ để tự gắn “best seller”. Cart không có atomic select-all endpoint.

## 11. Current defects không được freeze làm target

1. Public shell health polling/technical badge.
2. Eager import toàn bộ routes.
3. PDP auto-select/cho add variant hết hàng.
4. Dashboard query errors hiển thị như zero/empty.
5. Login return path làm mất search/hash.
6. Seller product edit lookup giới hạn 100.
7. Checkout service query key/dữ liệu dựa vào shop đầu tiên rồi reuse cho mọi shop.
8. Inventory N+1 query per variant.
9. 404 ngoài branded shell.
10. Các cache gaps tại section 6.

Defect chỉ được sửa trong task có acceptance/test tương ứng; không đổi âm thầm khi rebuild visual.

## 12. Change control

Khi route/API/type/query contract thay đổi:

1. Xác nhận thay đổi có thuộc scope task hay cần backend/Product decision.
2. So contract source với [`contract-hashes.md`](contract-hashes.md).
3. Cập nhật manifest, hash và impacted task trong cùng PR.
4. Thêm regression test cho permission, payload, cache và state bị ảnh hưởng.
5. Không đánh dấu route parity nếu manifest và implementation lệch nhau.

## 13. Acceptance FE-RB-002

- [x] Lập route manifest cho public, account, seller và admin.
- [x] Ghi access/role guards, APIs, params, states, actions và invariants.
- [x] Ghi API envelope, ID/money/pagination contract.
- [x] Ghi query keys, mutations, invalidations và cache gaps.
- [x] Ghi status/transition và query/filter support thật.
- [x] Đánh dấu capability chưa có contract.
- [x] Đánh dấu current defects không được xem là target behavior.
- [x] Ghi SHA-256 của source contract quan trọng.

`FE-RB-002` hoàn thành về mặt tài liệu; implementation phải dùng manifest này làm parity source.
