# ShopSmart Release Note — v1.1.0 (AWS deployment release)

**Date:** 20 November 2026 · **Developer:** Reighfer Joshua V. Bondoc (solo) · **Course:** PDC50 / BSIT-4A
**Previous release:** v1.0.0-rc1 (local release candidate, 15 November 2026)
**Target:** single EC2 host in ap-southeast-1 (see `docs/AWS_DEPLOYMENT_PLAN.md`)
**Release type:** ☐ Hosted at ☐ FILL URL · ☐ Local only (state why)
**Commit / tag:** ☐ FILL (`git tag v1.1.0` before deploying; `/api/health` reports it)

## What is new

**Customer accounts and private orders**
- Register, sign in and sign out with a fictional test account. Passwords are scrypt-hashed. Sessions are random tokens stored hashed in PostgreSQL, sent as an HttpOnly cookie (Secure and SameSite=Lax in production), valid 8 hours.
- Checkout requires sign-in; every new order is saved with its owner.
- New "My account" page lists your own orders; `/orders/:id` shows one order.
- The API enforces ownership: guests get 401; any other customer gets 404 for your order, including by a direct API request.
- Sign-in and registration are refused over plain HTTP when `REQUIRE_HTTPS=true`.
- State-changing requests must be JSON from an allowed origin (request-forgery guard).

**Assistant trust boundary**
- Each answer shows whether a live provider or the labeled mock adapter produced the draft.
- Prices stated in a draft are checked against current records; wrong wording is replaced.
- Timeout, rate limit, malformed response and provider errors end in a verified catalog answer with a visible notice. The frontend also stops waiting after 20 seconds.
- Catalog descriptions are passed as untrusted data; the provider key is sent in a header.

**Operations**
- `/api/health` checks the database and reports version, commit and provider mode; `/api/health/live` checks only the process.
- systemd unit, nginx config (HTTPS, SPA rewrite, internal ports), setup, release and backup scripts in `deploy/`.
- `npm run smoke -- <url>` verifies the hosted customer journey and writes evidence to `docs/evidence/`.
- Logs record method, path, status, timing and request id, never request bodies or cookies.

## Database changes
- Migration `20261120090000_add_customer_accounts`: adds `Customer`, `Session` and nullable `Order.customerId`. **Additive.** Existing orders are kept without an owner and are not readable through the API.
- Apply with `npm run db:deploy` (`prisma migrate deploy`). Do **not** use `db:seed` on a deployed database: it deletes all data and now refuses to run with `NODE_ENV=production`. Use `npm run db:seed:catalog` (adds missing products only).

## Upgrade steps (from v1.0.0-rc1, local)
1. `npm install`
2. `npm run db:deploy` (or `npm run db:migrate` in development)
3. `npm run check`
4. `npm run dev`, then create a test account at `/account`

## Tests
- Backend: assistant (8), assistant provider (13), auth and ownership (9), validation (9). Frontend: cart (8).
- ☐ FILL: result of `npm run check` on the release commit.
- ☐ FILL: hosted smoke result `__/26` (`docs/evidence/…`).

## Known limitations
- Single EC2 host: one point of failure; backups are on the same instance.
- No password reset or email verification (fictional demo accounts only).
- The assistant runs the **mock** provider in the hosted demo; a live provider needs instructor approval and a key.
- Orders from before v1.1.0 have no owner and cannot be viewed through the API.
- Rate limits are kept in process memory and reset when the API restarts.

## Safe boundaries
Fictional customer names, `@example.com` emails and fictional addresses only. Simulated checkout: no payment is collected. Never reuse a real password on the demo.
