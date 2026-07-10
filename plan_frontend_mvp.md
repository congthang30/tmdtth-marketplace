# Frontend MVP Execution Plan

Ngay tao: 2026-07-03

Nguon yeu cau chinh: `build_fe.md`

Muc tieu: xay dung frontend React/TypeScript dung API that cua backend NestJS/PostgreSQL hien co, co the demo luong MVP end-to-end: public catalog -> customer cart/checkout/order/review, seller shop/product/order/shipment, admin category/shop/shipping.

Ghi chu trang thai hien tai:
- `frontend/` da ton tai nhung dang rong, chua co `package.json`.
- Backend dang chay Docker o `http://localhost:3100/api`.
- Root Docker expose API `3100:3100`, Postgres host `55433:5432`.
- Backend da co MVP API va test/acceptance truoc do, nhung frontend can mot so API doc/list bo sung de dung san pham that.

---

## 0. Tien do thuc hien frontend

| Task ID | Trang thai | Ngay | Ghi chu |
| --- | --- | --- | --- |
| FE-PLAN | Hoan thanh | 2026-07-03 | Da doc `build_fe.md`, ra soat backend modules/controllers, xac dinh roles/API/screens, lap backlog frontend MVP va backend unblockers trong file nay. |
| FE-00 | Hoan thanh | 2026-07-03 | Scaffold Vite React TypeScript trong `frontend/`; cai dependencies bat buoc `react-router-dom`, `axios`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers`, `zustand`, `lucide-react`, `tailwindcss`; cau hinh Tailwind/PostCSS, alias `@/*`, `.env.example`, Vite dev port 5173; tao base app providers, router, public/dashboard layout, placeholder pages, UI link button, API/domain types va format helpers. Verify: `npm.cmd install` pass 0 vulnerabilities, `npm.cmd run build` pass, `npm.cmd run lint` pass. |
| FE-01 | Hoan thanh | 2026-07-10 | Tao Axios API client doc `VITE_API_BASE_URL`, unwrap backend response, normalize API error, intercept Bearer token/401/403; tao token storage va Zustand auth store; them auth service login/register/logout/me va role-check customer/seller/admin; them Login/Register/Profile pages, AuthSessionProvider, ProtectedRoute, RoleRoute goi role-check that, LogoutButton; gan provider/router/layout voi session va role menu. Verify: `npm.cmd run build` pass, `npm.cmd run lint` pass. |
| FE-02 | Hoan thanh | 2026-07-03 | Bo sung shared UI primitives: Button/TextInput/SelectInput/Textarea/Badge/Table/Pagination/Modal/Skeleton, EmptyState/ErrorState, Zustand toast store va ToastViewport; cai thien public/dashboard responsive header; them formatDate/formatStatus helpers. Verify: `npm.cmd run build` pass, `npm.cmd run lint` pass. |
| FE-03 | Hoan thanh | 2026-07-03 | Xay public catalog dung API that: categories tree, product list pagination/search/category/price/sort, product card/detail, media URL normalize theo API origin, variant selector, quantity selector, public reviews list va add-to-cart mutation cho user da login; homepage `/` va `/products` deu mo catalog that. Verify: `npm.cmd run build` pass, `npm.cmd run lint` pass; build co canh bao Vite chunk >500kB nhung khong fail. |
| FE-04 | Hoan thanh | 2026-07-03 | Them account feature cho `/users/me` va `/addresses`; profile page load/update thong tin ca nhan, sync lai auth store; addresses page CRUD, set default, delete confirm modal, inline validation theo DTO backend; them route/nav `/addresses`. Verify: `npm.cmd run build` pass, `npm.cmd run lint` pass; build co canh bao Vite chunk >500kB nhung khong fail. |
| FE-05 | Hoan thanh | 2026-07-10 | Them cart va checkout: cart load/update quantity/select/delete, summary va route `/cart`; checkout load addresses/payment methods, list active shipping services, tao shipping quote tung shop bang `/shipping/quotes`, server-side preview `/orders/checkout-preview` voi `shippingSelections`, create order `/orders` co quote/service, toast va navigate `/orders/:id`. Backend da nhan shipping quote vao preview/order va ghi shippingCompany/service/quote vao shop order. Verify: `npm.cmd run build` pass, `npm.cmd run lint` pass; build co canh bao Vite chunk >500kB nhung khong fail. |
| FE-06 | Hoan thanh | 2026-07-10 | Them customer orders flow: `/orders` history pagination, `/orders/:id` detail, cancel order voi reason, fake online payment success, shipment tracking display, product review modal voi React Hook Form + Zod va backend error rendering. Verify: `npm.cmd run lint` pass; `npm.cmd run build` pass khi redirect npm cache/temp sang `D:\TMDTTH\.npm-cache` va `D:\TMDTTH\.tmp` do C: het dung luong; build co canh bao Vite chunk >500kB nhung khong fail. |
| FE-10 | Hoan thanh | 2026-07-10 | Them backend unblockers toi thieu: `GET /api/shops/me`, `GET /api/admin/shops?page&limit&status`, `GET /api/shipping/services?shopId=` cho customer/seller; bo sung seller order response tra `shipments` de cap nhat tracking sau reload. Verify backend: `npm.cmd run build`, `npm.cmd test -- --runInBand`, `npm.cmd run test:e2e -- --runInBand`, `npm.cmd run lint`, `npm.cmd audit --omit=dev`, `npm.cmd run prisma:validate` deu pass khi redirect npm cache/temp sang D:. |
| FE-07 | Hoan thanh | 2026-07-10 | Them seller shop/product management: dashboard, shop registration, product list/create/edit/delete, variant CRUD, image upload/list uploaded files/edit/delete/set thumbnail, inventory per variant; route guard Seller va menu seller. Verify frontend: `npm.cmd run build` pass, `npm.cmd run lint` pass; build co canh bao Vite chunk >500kB nhung khong fail. |
| FE-08 | Hoan thanh | 2026-07-10 | Them seller order/shipment flow: seller order list/detail, confirm, prepare, create shipment voi active shipping services, update tracking PickedUp/InTransit/Delivered, hien tracking history. Verify frontend/backend gates pass nhu FE-07/FE-10. |
| FE-09 | Hoan thanh | 2026-07-10 | Them admin management: dashboard, category CRUD/deactivate, shop approval/rejection, shipping company CRUD/delete co GET detail truoc edit, shipping service CRUD/deactivate co GET detail truoc edit; route guard Admin va role-aware nav. Verify frontend/backend gates pass nhu FE-07/FE-10. |
| FE-11 | Hoan thanh | 2026-07-10 | Update `frontend/README.md`, `.env.example` co san, frontend build/lint pass va backend gates pass. Runtime verify truoc do bang local NestJS API port `3100` + embedded PostgreSQL port `55432` vi Docker daemon pipe khong kha dung; `npm.cmd run test:mvp` pass voi order Completed va duplicate review blocked; smoke frontend `/products` 200, admin/seller/customer API smoke pass. Lan verify moi nhat: frontend `npm.cmd run build`, `npm.cmd run lint`; backend `npm.cmd run build`, `npm.cmd test -- --runInBand`, `npm.cmd run test:e2e -- --runInBand`, `npx.cmd eslint "{src,test}/**/*.ts"`, `npm.cmd run prisma:validate`, `npm.cmd audit --omit=dev` deu pass. |

Quy tac cap nhat:
- Moi task chi duoc danh dau `Hoan thanh` khi da code, build pass va verify luong lien quan.
- Sau moi task cap nhat bang tren voi command da chay va ket qua.
- Khong danh dau MVP complete neu chua chay duoc acceptance flow that voi backend.

---

## 1. Backend analysis

### 1.1 Modules nghiep vu

- Auth: register, login, logout, current user, role-check.
- Users: profile current user.
- Addresses: customer address CRUD va set default.
- Categories: public category tree, admin category CRUD.
- Products: public catalog/detail/reviews; seller product, variant, image, inventory management.
- Cart: active cart, add/update/select/delete item.
- Orders: customer checkout preview/create/history/detail/cancel; seller shop order list/detail/confirm/prepare.
- Payments: active payment methods, fake online success.
- Shops: seller register shop; admin approve/reject shop.
- Shipping: customer quote; seller shipment create/tracking; admin shipping company/service CRUD.
- Reviews: customer create product review; public product reviews.
- Uploads: seller image upload/list.
- Health: API health.

### 1.2 Roles

- `Customer`: browse public catalog, manage profile/address/cart, checkout, pay fake online, view orders, cancel eligible order, review purchased items.
- `Seller`: register shop, manage products/variants/images/inventory, view/confirm/prepare shop orders, create shipment, update tracking, upload images.
- `Admin`: manage categories, approve/reject shops, manage shipping companies and services.

Backend role source: `backend/src/modules/auth/app-role.enum.ts`

### 1.3 API base and response shape

Base URL for frontend env:

```txt
VITE_API_BASE_URL=http://localhost:3100/api
```

Expected response shape:

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

Error shape:

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

### 1.4 API inventory

Public:
- `GET /api/health`
- `GET /api/categories`
- `GET /api/products`
- `GET /api/products/:slug`
- `GET /api/products/:slug/reviews`

Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/role-check/customer`
- `GET /api/auth/role-check/seller`
- `GET /api/auth/role-check/admin`

Customer/authenticated:
- `GET /api/users/me`
- `PATCH /api/users/me`
- `GET /api/addresses`
- `POST /api/addresses`
- `PATCH /api/addresses/:id`
- `DELETE /api/addresses/:id`
- `PATCH /api/addresses/:id/default`
- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/:id`
- `PATCH /api/cart/items/:id/select`
- `DELETE /api/cart/items/:id`
- `GET /api/payments/methods`
- `POST /api/orders/checkout-preview`
- `POST /api/orders`
- `GET /api/orders/my`
- `GET /api/orders/:id`
- `PATCH /api/orders/:id/cancel`
- `POST /api/payments/:id/fake-success`
- `POST /api/shipping/quotes`
- `POST /api/reviews/products`

Seller:
- `POST /api/shops`
- `GET /api/seller/products`
- `POST /api/seller/products`
- `PATCH /api/seller/products/:id`
- `DELETE /api/seller/products/:id`
- `GET /api/seller/products/:productId/variants`
- `POST /api/seller/products/:productId/variants`
- `PATCH /api/seller/products/:productId/variants/:variantId`
- `DELETE /api/seller/products/:productId/variants/:variantId`
- `GET /api/seller/products/:productId/images`
- `POST /api/seller/products/:productId/images`
- `PATCH /api/seller/products/:productId/images/:imageId`
- `DELETE /api/seller/products/:productId/images/:imageId`
- `GET /api/seller/products/:productId/variants/:variantId/inventory`
- `PATCH /api/seller/products/:productId/variants/:variantId/inventory`
- `GET /api/seller/orders`
- `GET /api/seller/orders/:id`
- `PATCH /api/seller/orders/:id/confirm`
- `PATCH /api/seller/orders/:id/prepare`
- `POST /api/seller/orders/:shopOrderId/shipments`
- `PATCH /api/seller/orders/:shopOrderId/shipments/:shipmentId/tracking`
- `POST /api/uploads`
- `GET /api/uploads`

Admin:
- `GET /api/admin/categories`
- `POST /api/admin/categories`
- `PATCH /api/admin/categories/:id`
- `DELETE /api/admin/categories/:id`
- `PATCH /api/admin/shops/:id/approve`
- `PATCH /api/admin/shops/:id/reject`
- `GET /api/admin/shipping-companies`
- `GET /api/admin/shipping-companies/:id`
- `POST /api/admin/shipping-companies`
- `PATCH /api/admin/shipping-companies/:id`
- `DELETE /api/admin/shipping-companies/:id`
- `GET /api/admin/shipping-services`
- `GET /api/admin/shipping-services/:id`
- `POST /api/admin/shipping-services`
- `PATCH /api/admin/shipping-services/:id`
- `DELETE /api/admin/shipping-services/:id`

---

## 2. Backend gaps / frontend blockers

Nhung API sau co the can them de frontend MVP khong phai hardcode ID:

| Gap ID | Muc do | Mo ta | De xuat |
| --- | --- | --- | --- |
| BE-FE-01 | Da xu ly | Admin chi co approve/reject theo `shopId`, chua co list pending shops. | Da them `GET /api/admin/shops?page&limit&status`. |
| BE-FE-02 | Da xu ly | Seller co `POST /api/shops` nhung chua co `GET /api/shops/me` de lay shop cua minh, trong khi product create can `shopId`. | Da them `GET /api/shops/me` tra shop moi nhat cua current user hoac `null`. |
| BE-FE-03 | Da xu ly | Customer quote can `shippingServiceId`, nhung customer khong co API list active shipping services va order DTO ban dau chua nhan quote. | Da them `GET /api/shipping/services?shopId=` cho Customer/Seller, chi tra service active cua company approved; checkout/order nhan `shippingSelections` de dung quote fee va luu shippingCompany/service/quote vao shop order. |
| BE-FE-06 | Da xu ly | Seller order detail chua tra shipments, nen sau reload khong biet `shipmentId` de update tracking. | Da bo sung `shipments` trong seller shop order response. |
| BE-FE-04 | Nice-have Admin shop dashboard | Khong co admin dashboard/stat endpoint. | Frontend co the dung card tinh tu list API hien co, hoac de dashboard tinh tinh. |
| BE-FE-05 | Nice-have Seller shop status | Seller khong xem duoc trang thai shop pending/rejected sau dang ky neu mat response. | Giai quyet chung voi `GET /api/shops/me`. |

Quy tac: chi sua backend khi gap la blocker that cho frontend MVP. Moi backend change phai co test va khong pha flow da pass.

---

## 3. MVP screens

### 3.1 Public / Customer

- `/` hoac `/products`: Product catalog with category filter, search, pagination.
- `/products/:slug`: Product detail, variant info, images, inventory, reviews, add to cart.
- `/login`: Login form.
- `/register`: Register form.
- `/profile`: Profile read/update.
- `/addresses`: Address list/create/edit/default/delete.
- `/cart`: Active cart, quantity update, select/unselect, delete.
- `/checkout`: Address/payment/shipping quote selection, checkout preview, create order.
- `/orders`: Customer order history.
- `/orders/:id`: Order detail, payment status, shipment tracking, cancel when allowed, fake payment success, review action after completed.

### 3.2 Seller

- `/seller`: Seller dashboard / quick status.
- `/seller/shop/register`: Register shop.
- `/seller/products`: Product list.
- `/seller/products/create`: Create product.
- `/seller/products/:id/edit`: Update/delete product.
- `/seller/products/:id/variants`: Variant list/create/edit/delete.
- `/seller/products/:id/images`: Upload/list/set thumbnail/delete images.
- `/seller/products/:id/inventory`: Inventory view/update per variant.
- `/seller/orders`: Seller shop order list.
- `/seller/orders/:id`: Shop order detail, confirm, prepare, create shipment, update tracking.

### 3.3 Admin

- `/admin`: Admin dashboard.
- `/admin/categories`: Category list/create/edit/deactivate.
- `/admin/shops`: Pending/all shop approvals. Requires BE-FE-01.
- `/admin/shipping/companies`: Shipping company CRUD.
- `/admin/shipping/services`: Shipping service CRUD.

### 3.4 Shared

- `/forbidden`: 403 page.
- `/not-found`: 404 page.
- Authenticated app layout: header, sidebar, responsive mobile nav, role-aware menus.
- Public layout: simple store nav, cart link, account menu.

---

## 4. Frontend architecture decision

### 4.1 Stack

- React + TypeScript + Vite.
- React Router for routing and guards.
- Axios for API client.
- TanStack Query for server state, cache, mutations and invalidation.
- React Hook Form + Zod for form validation.
- Zustand for auth/global UI state.
- Tailwind CSS for styling.
- Lucide React for icons.
- Custom UI components first; add shadcn-style primitives only if needed.

### 4.2 Folder structure

```txt
frontend/
  .env.example
  package.json
  index.html
  vite.config.ts
  tailwind.config.ts
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

### 4.3 UI principles

- Dense, clean, SaaS/admin style for dashboard areas.
- Product/customer pages practical and catalog-focused, not marketing hero.
- Cards only for repeated product/order items or real panels, not nested decorative cards.
- Every data screen has loading, empty, error, success states.
- Destructive actions need confirm modal.
- Forms show inline validation and disable submit during mutation.
- Buttons use lucide icons where appropriate.
- Responsive: desktop sidebar + mobile drawer/top nav.

---

## 5. Backlog

### FE-00 - Project bootstrap

Status: Hoan thanh

Scope:
- Create Vite React TypeScript app in `frontend/`.
- Install dependencies: `react-router-dom`, `axios`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers`, `zustand`, `lucide-react`, `tailwindcss`.
- Configure Tailwind, path aliases, env example.
- Add npm scripts: `dev`, `build`, `lint`, `preview`.
- Add base layout shell and design tokens.

Acceptance:
- `npm install` pass.
- `npm run build` pass.
- Blank app runs at a stable dev port.

### FE-01 - API client, auth store, route guards

Status: Hoan thanh

Scope:
- `services/api.ts` with base URL from `VITE_API_BASE_URL`.
- Request interceptor attaches Bearer token.
- Response interceptor normalizes API errors.
- Auth service: login, register, logout, me, role checks.
- Token persistence suitable for MVP.
- ProtectedRoute and RoleRoute components.
- Login/register/profile bootstrap.

Acceptance:
- Login stores token and loads current user.
- 401 logs out or redirects to login.
- 403 redirects to `/forbidden`.
- Role menus show only allowed areas.

### FE-02 - Layout and shared UI

Status: Hoan thanh

Scope:
- Public layout and app dashboard layout.
- Sidebar/header/account menu/cart link.
- UI primitives: Button, Input, Select, Textarea, Badge, Table, Pagination, Modal, Toast, Skeleton, EmptyState, ErrorState.
- Format helpers for money/date/status.

Acceptance:
- Layout responsive desktop/mobile.
- Components are reusable and typed.
- No page has raw unstyled loading/error text.

### FE-03 - Public catalog and product detail

Status: Hoan thanh

Scope:
- Category tree load.
- Product list with pagination/filter/search according to API support.
- Product detail with images, variants, current price/inventory signals.
- Public product reviews list.
- Add to cart action for authenticated customer.

Acceptance:
- Public user can browse products without login.
- Customer can add purchasable variant to cart.
- Error states cover inactive/out-of-stock responses.

### FE-04 - Customer profile and addresses

Status: Hoan thanh

Scope:
- `/profile` view/update.
- `/addresses` CRUD and set default.
- Address form validation.

Acceptance:
- Customer can create/update/delete/default addresses.
- Forms handle backend validation errors.
- No cross-user data visible because all endpoints use current token.

### FE-05 - Cart and checkout

Status: Hoan thanh

Scope:
- Cart list with quantity update, select/unselect, delete.
- Payment methods load.
- Shipping quote selection. Depends on BE-FE-03 unless using known service from admin setup.
- Checkout preview server-side totals.
- Create order and route to order detail.

Acceptance:
- Customer can buy selected cart items.
- Preview totals match create order response expectation.
- Invalid stock/product/shop errors render clearly.

### FE-06 - Customer orders, payment, review

Status: Hoan thanh

Scope:
- Order history and detail.
- Shipment tracking display.
- Cancel eligible order.
- Fake online success action for fake payment.
- Create product review from completed order item.
- Duplicate review error handled.

Acceptance:
- Customer can follow order lifecycle from created to completed.
- Review only appears when backend allows it.
- Payment and cancellation state transitions update UI after mutation.

### FE-07 - Seller shop and product management

Status: Hoan thanh

Scope:
- Seller dashboard.
- Register shop.
- Product list/create/update/delete.
- Variant CRUD.
- Image manager with upload.
- Inventory view/update.
- Depends on BE-FE-02 for reload-safe shop ownership.

Acceptance:
- Seller can create a product with variant/image/inventory without hardcoded IDs.
- Seller cannot access admin/customer-only screens.
- Product forms validate price, status, SKU, image URL/file.

### FE-08 - Seller orders and shipment

Status: Hoan thanh

Scope:
- Seller shop order list/detail.
- Confirm and prepare shop order.
- Create shipment.
- Update tracking to picked up/in transit/delivered.

Acceptance:
- Seller can progress own shop order through shipping flow.
- Invalid transitions show backend error message.
- Cross-shop data is not displayed.

### FE-09 - Admin management

Status: Hoan thanh

Scope:
- Admin layout/dashboard.
- Category CRUD.
- Shop approval/rejection screen. Depends on BE-FE-01.
- Shipping company CRUD.
- Shipping service CRUD.

Acceptance:
- Admin can complete setup required for seller/customer flow.
- Admin-only routes reject non-admin in UI and backend.
- Tables have pagination/loading/empty/error states.

### FE-10 - Backend unblockers if required

Status: Hoan thanh

Scope:
- Add minimal backend APIs listed in section 2 only when frontend cannot meet MVP otherwise.
- Add unit/e2e coverage for any new endpoint.
- Update backend plan if changed.

Acceptance:
- Backend `npm run build`, `npm test -- --runInBand`, `npm run test:e2e -- --runInBand`, `npm run lint` pass.
- New endpoints documented in this plan.

### FE-11 - MVP acceptance and docs

Status: Hoan thanh

Scope:
- End-to-end manual or automated script with backend Docker running.
- Update `frontend/README.md`.
- Add `.env.example`.
- Verify production build.

Acceptance:
- `npm run build` in frontend pass.
- User can run backend + frontend locally.
- Demo flow covers:
  1. Admin login/setup category/shipping and approve shop.
  2. Seller register shop, create product/variant/image/inventory.
  3. Customer register/login, address, cart, checkout, order.
  4. Seller confirm/prepare/ship/tracking delivered.
  5. Customer sees completed order and reviews product.

---

## 6. Definition of Done for frontend MVP

Frontend MVP is complete only when:

- Auth works for Customer, Seller, Admin.
- Role-aware routing and menus work.
- API client uses `VITE_API_BASE_URL` and token interceptor.
- No hardcoded business IDs are required in normal use.
- Public catalog/product detail works with real backend data.
- Customer cart/checkout/order/review flow works against backend.
- Seller shop/product/inventory/order/shipment flow works against backend.
- Admin category/shop/shipping management works against backend.
- Every form has validation and backend error rendering.
- Every list has loading, empty, error and pagination where supported.
- Responsive layout is usable on mobile and desktop.
- Frontend `npm run build` passes.
- Backend remains green if any backend unblocker is added.
- README contains run instructions and demo credentials/seed notes.

---

## 7. Quality gates

Frontend commands:

```bash
cd frontend
npm install
npm run build
npm run lint
npm run dev
```

Backend commands when frontend integration or unblockers touch backend:

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

---

## 8. Implementation order

1. FE-00 bootstrap app.
2. FE-01 auth/API foundation.
3. FE-02 layout/shared UI.
4. FE-03 public catalog.
5. FE-04 profile/address.
6. FE-05 cart/checkout.
7. FE-06 customer orders/payment/review.
8. FE-10 backend unblockers as soon as a blocker is proven.
9. FE-07 seller shop/product management.
10. FE-08 seller order/shipping.
11. FE-09 admin management.
12. FE-11 MVP acceptance/docs.

Rationale:
- Auth, API client and UI primitives unlock all screens.
- Customer buying flow proves marketplace value early.
- Seller/Admin screens then complete operational flow.
- Backend unblockers are delayed until proven necessary by frontend implementation, but BE-FE-01/02/03 are expected to be needed for a polished MVP.
