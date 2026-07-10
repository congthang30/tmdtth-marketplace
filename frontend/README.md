# TMDTTH Marketplace Frontend

React + TypeScript + Vite frontend for the multi-vendor household ecommerce
marketplace MVP.

## Requirements

- Backend API available at `http://localhost:3100/api`
- Node dependencies installed in `frontend/`
- Frontend env:

```txt
VITE_API_BASE_URL=http://localhost:3100/api
```

## Local Development

```bash
npm install
cp .env.example .env
npm run dev
```

Backend can run with Docker when Docker Desktop is available. On this machine,
the verified fallback is embedded PostgreSQL:

```powershell
cd D:\TMDTTH\backend
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:55432/tmdtth?schema=public'
$env:EMBEDDED_POSTGRES_DATA_DIR='D:\TMDTTH\.tmp\embedded-postgres'
$env:EMBEDDED_POSTGRES_PORT='55432'
npm.cmd run db:embedded
```

In another shell:

```powershell
cd D:\TMDTTH\backend
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:55432/tmdtth?schema=public'
npm.cmd run prisma:migrate:deploy
npm.cmd run db:seed
npm.cmd run start
```

If the Windows user profile drive is full, redirect npm cache and temp to the
workspace before running npm commands:

```powershell
$env:npm_config_cache='D:\TMDTTH\.npm-cache'
$env:TEMP='D:\TMDTTH\.tmp'
$env:TMP='D:\TMDTTH\.tmp'
```

## Quality Gates

```bash
npm run build
npm run lint
```

## Main Routes

- Public/customer: `/products`, `/products/:slug`, `/cart`, `/checkout`, `/orders`, `/orders/:id`, `/profile`, `/addresses`
- Seller: `/seller`, `/seller/shop/register`, `/seller/products`, `/seller/products/create`, `/seller/products/:id/edit`, `/seller/products/:id/variants`, `/seller/products/:id/images`, `/seller/products/:id/inventory`, `/seller/orders`, `/seller/orders/:id`
- Admin: `/admin`, `/admin/categories`, `/admin/shops`, `/admin/shipping/companies`, `/admin/shipping/services`

## Demo Flow

1. Admin creates categories and shipping setup, then approves a pending shop.
2. Seller registers a shop, creates products, variants, images, and inventory.
3. Customer browses catalog, adds items to cart, gets shipping quotes, checks out, pays fake online if applicable, and reviews completed items.
4. Seller confirms, prepares, creates shipment, and updates tracking to delivered.

Seeded demo users use password `Demo@123456`:

- Admin: `admin@example.com`
- Seller: `seller@example.com`
- Customer: `customer@example.com`

## Current Verification Note

Frontend build/lint and backend build/test/e2e/lint/audit/prisma validation pass.
Runtime acceptance was verified against local NestJS API on port `3100` with
embedded PostgreSQL on port `55432`. Docker Desktop was installed but its daemon
pipe was unavailable in this session.
