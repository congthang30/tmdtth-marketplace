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

## Seller finance and SePay reconciliation

Completed shop orders accrue an append-only seller ledger with a seven-day hold.
After deploying finance migrations, reconcile historical completed orders before
allowing payouts:

```bash
# Dry-run (default): prints missing orders, entries and expected totals
npm run db:backfill:seller-ledger

# Apply, then repeat the dry-run; the second run must report no missing accruals
npm run db:backfill:seller-ledger -- --apply
npm run db:backfill:seller-ledger
```

A seller can save one encrypted payout account and request at least `100,000 VND`
without choosing a shop ID; the backend resolves the authenticated seller's
approved shop. Active payout requests reserve matured ledger balance. Admins
approve/reject requests, then start processing with a mandatory bank reference.
There is no admin "mark paid" endpoint: only an exact bank transaction match
moves `Processing` to `Paid` and appends the negative `PayoutDebit` entry.

SePay reconciliation is disabled by default. To enable it, generate a dedicated
secret and configure both values in `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
SEPAY_WEBHOOK_ENABLED=true
SEPAY_WEBHOOK_SECRET=<generated-secret>
```

Configure the provider callback URL as `POST /api/webhooks/sepay`. Each request
must include:

- `X-SePay-Timestamp`: Unix milliseconds or seconds, within five minutes.
- `X-SePay-Signature`: `sha256=<hex>`, where the digest is
  `HMAC_SHA256(secret, timestamp + "." + exactRawBody)`.

The callback acknowledges accepted events with exactly `{"success":true}`.
Every provider transaction ID is idempotent. Automatic payout reconciliation
requires all of these conditions: transfer direction `out`, exact `PAY-...`
content/code, exact amount, and payout status `Processing`. Inbound, unknown,
wrong-amount or wrong-direction events are stored without changing seller funds;
account numbers and saved payloads are masked.

Admin reconciliation endpoints are under `/api/admin/finance`:

- `GET /bank-transactions` filters by match status, direction or search text.
- `GET /bank-transactions/:id` shows the masked payload and linked payout.
- `PATCH /bank-transactions/:id/match` requires exact amount/direction and an
  audit reason; it only accepts `Unmatched` or `AmountMismatch` records.

For unmatched events, verify the bank statement, payout code, amount and
transfer direction before manual match. Never edit provider transaction IDs or
amounts. A repeated provider ID with different bytes becomes
`IntegrityConflict` and must be investigated instead of retried manually.
Rotate the webhook secret in SePay and backend together during a maintenance
window; in-flight callbacks signed with the old secret will be rejected.

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
