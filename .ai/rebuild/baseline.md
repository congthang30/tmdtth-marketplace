# Frontend rebuild baseline

Snapshot cho `FE-RB-001`, ghi nhận lúc **2026-07-10T20:46:18+07:00** trên working tree hiện tại.

> Trạng thái task: **Đang thực hiện**. Baseline source/build và checkpoint đã hoàn tất; visual screenshots còn bị chặn vì in-app browser chưa khả dụng. Không có thao tác `stash`, `reset`, `checkout`, đổi branch hoặc thay đổi index/worktree nào được thực hiện khi tạo checkpoint.

## 1. Git baseline

| Thuộc tính | Giá trị |
| --- | --- |
| Branch | `main` |
| HEAD | `3eece60fda16ec23521dbd987e5e2340d4c0d3bf` |
| Staged changes | Không có |
| Tracked files modified | 56 |
| Untracked status entries | 5 (`.ai/`, `AGENTS.md`, `frontend/src/services/system.ts`, `plan_frontend_rebuild.md`, `promt_skill.md`) |
| Tracked diff | 56 files, 3.187 insertions, 1.777 deletions |

Working tree chứa thay đổi frontend/backend từ các nhiệm vụ trước. Chúng thuộc về người dùng và phải được giữ nguyên. HEAD chỉ là mốc commit gần nhất, **không chứa** các thay đổi chưa commit hiện tại.

### Checkpoint rollback

Đã tạo checkpoint bằng temporary Git index sau khi người dùng yêu cầu tiếp tục triển khai:

| Thuộc tính | Giá trị |
| --- | --- |
| Ref | `refs/codex/checkpoints/frontend-rebuild-before-p0-20260710-205524` |
| Commit | `6e05682ca47ed64a3a7ab84c48cdff9b098907c2` |
| Parent | `3eece60fda16ec23521dbd987e5e2340d4c0d3bf` |

Checkpoint chứa trạng thái tracked và untracked không bị ignore trước `FE-RB-003/004`. Sau khi tạo, đã so sánh và xác nhận branch, HEAD, real Git index và porcelain status không đổi. Ref này không thay branch hiện tại và không tự động đưa thay đổi của người dùng vào lịch sử `main`.

Khi cần rollback phải so sánh checkpoint và phục hồi có chọn lọc; không dùng reset/checkout phá hủy toàn worktree khi chưa kiểm tra thay đổi mới hơn.

## 2. Stack đã cài đặt

| Package | Phiên bản thực tế |
| --- | --- |
| React / React DOM | 19.2.7 |
| React Router DOM | 7.18.1 |
| TypeScript | 6.0.3 |
| Vite | 8.1.3 |
| Tailwind CSS | 3.4.17 |
| TanStack Query | 5.101.2 |
| React Hook Form | 7.80.0 |
| Zod | 4.4.3 |
| Zustand | 5.0.14 |
| Axios | 1.18.1 |
| Lucide React | 1.23.0 |
| oxlint | 1.72.0 |

Không có frontend unit/component/browser test runner trong `package.json` tại snapshot này.

## 3. Source shape

| Hạng mục | Số lượng |
| --- | ---: |
| `.tsx` files | 53 |
| `.ts` files | 27 |
| Feature pages | 24 |
| Shared components dưới `src/components` | 18 |

### Page lớn cần characterization trước khi tách

| Lines | File |
| ---: | --- |
| 578 | `frontend/src/features/checkout/pages/CheckoutPage.tsx` |
| 563 | `frontend/src/features/seller/pages/SellerOrderDetailPage.tsx` |
| 489 | `frontend/src/features/orders/pages/OrderDetailPage.tsx` |
| 431 | `frontend/src/features/admin/pages/AdminShippingServicesPage.tsx` |
| 425 | `frontend/src/features/seller/pages/SellerProductImagesPage.tsx` |
| 421 | `frontend/src/features/account/pages/AddressesPage.tsx` |
| 407 | `frontend/src/features/admin/pages/AdminShippingCompaniesPage.tsx` |
| 375 | `frontend/src/features/seller/pages/SellerProductVariantsPage.tsx` |
| 343 | `frontend/src/features/admin/pages/AdminCategoriesPage.tsx` |
| 329 | `frontend/src/features/catalog/pages/ProductDetailPage.tsx` |
| 324 | `frontend/src/features/catalog/pages/CatalogPage.tsx` |

## 4. Quality baseline

Chạy tại `frontend/` ngày 2026-07-10:

| Gate | Kết quả |
| --- | --- |
| `npm.cmd run lint` | Pass |
| `npm.cmd run build` | Pass |
| Modules transformed | 2.032 |
| `dist/index.html` | 0,59 kB; gzip 0,40 kB |
| Main CSS | 18,29 kB; gzip 4,50 kB |
| Main JS | 649,32 kB; gzip 184,97 kB |

Vite cảnh báo main chunk lớn hơn 500 kB. Đây là baseline cho lazy-route/performance work, không phải build failure.

## 5. Visual baseline

Chưa chụp được vì in-app browser không có phiên browser khả dụng tại thời điểm kiểm tra. Không dùng browser automation khác để lách quy định của project browser skill.

Khi browser khả dụng, cần chụp ít nhất:

- Public: `/products`, `/products/:slug` với dữ liệu thật.
- Purchase: `/cart`, `/checkout` sau đăng nhập.
- Account: `/orders`, `/orders/:id`.
- Seller: `/seller/products`, `/seller/orders/:id`.
- Admin: `/admin/categories`, `/admin/shipping/services`.
- Viewport đại diện: 390px, 768px và 1440px; full matrix để Phase `FE-RB-09`.

Ảnh baseline phải lưu ngoài production assets và gắn route, viewport, auth role, data state, thời điểm chụp.

## 6. Contract snapshot

Route, API, query, auth và status contract được khóa trong [`contract-manifest.md`](contract-manifest.md). SHA-256 của các source contract quan trọng nằm trong [`contract-hashes.md`](contract-hashes.md).

## 7. Acceptance FE-RB-001

- [x] Ghi HEAD, branch, dirty-worktree state và diff summary.
- [x] Ghi stack/package versions và source counts.
- [x] Chạy lint/build và ghi bundle baseline.
- [x] Không thay đổi hoặc làm mất user worktree.
- [x] Tạo checkpoint rollback chứa cả tracked/untracked changes với lựa chọn của người dùng.
- [ ] Chụp visual baseline khi in-app browser khả dụng.

`FE-RB-001` chưa được đánh dấu hoàn thành cho đến khi visual baseline được chụp hoặc người dùng chấp nhận loại mục này khỏi acceptance.
