# TMDTTH Backend

NestJS API for the multi-seller household ecommerce marketplace MVP.

## Local development

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run db:seed
npm run start:dev
```

Health check:

```bash
curl http://localhost:3100/api/health
```

## Docker

Copy `.env.example` to `.env`, then run:

```bash
docker compose up --build
```

The compose file starts PostgreSQL, applies Prisma migrations, and then starts the
NestJS API.

If Docker/PostgreSQL is unavailable, start the workspace-local embedded server:

```bash
npm run db:embedded
```

It listens on port `55432` by default. In another terminal, point
`DATABASE_URL` at
`postgresql://postgres:postgres@localhost:55432/tmdtth?schema=public`, then run
the migration and seed commands above.

## Quality gates

```bash
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run lint
npm audit --omit=dev
npm run prisma:validate
npm run db:seed:check
npm run test:mvp
```

## Seller verification module

Seller verification (legal profile, payout account, document upload, admin
review) requires a data-at-rest encryption key for PII fields. The API fails
fast on boot if it is missing:

```bash
# Generate a 32-byte base64 key locally, never commit the output
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Set either `SELLER_DATA_ENCRYPTION_KEYS=current:<base64Key>` (preferred,
supports rotation) or the legacy single-value `SELLER_DATA_ENCRYPTION_KEY` in
`.env`. See `.env.example` for the full list of seller-verification variables
(document storage folder, max upload size, signed URL TTL).

After seeding, demo accounts are available with password `Demo@123456`:

| Role     | Email                  |
| -------- | ----------------------- |
| Admin    | admin@example.com       |
| Seller   | seller@example.com      |
| Customer | customer@example.com    |

Admin review queue: `GET /api/admin/seller-verifications`. Every document
access and review transition (start review, request revision, approve,
reject) is recorded in an immutable audit table.

## Order cancellation

`PATCH /api/orders/:id/cancel` allows the authenticated customer who owns an
order to cancel it while every shop order is still waiting for seller
confirmation and payment is still pending.

```json
{
  "reason": "Changed my mind"
}
```

The cancellation, payment status change, inventory reservation release, and all
history records are committed in one database transaction.
