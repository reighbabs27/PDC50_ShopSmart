# ShopSmart Hosted Verification Record

**Release:** v1.1.0 · **Commit:** `7331c33` (from `/api/health`) · **Layout:** single EC2 host · **Region:** ap-southeast-2 (Sydney)
**Frontend URL:** https://shopsmart-13-210-209-254.sslip.io · **API URL:** same origin `/api`
**Release type:** ☑ Hosted ☐ Local

Rules followed (from the guide): expected results were written **before** running each check; each check starts in a fresh browser (private window) on the actual deployment URL; exact URLs, status codes, code version and **redacted** evidence are kept for failed cases.

---

## A. Automated checks (`npm run smoke -- <frontend-url>`)

Run from the repository root on your laptop. The script writes `docs/evidence/smoke-<timestamp>.md` with every URL, status code and the commit it tested. Paste the summary line here and commit the evidence file.

- Run 1 (first deploy, 15:12 UTC): **27/27 passed** → `docs/evidence/smoke-2026-11-20T15-12-37-381Z.md`
- Run 2 (after process restart **and** instance reboot, 15:17 UTC): **27/27 passed** → `docs/evidence/smoke-2026-11-20T15-17-00-726Z.md`

| Guide check | Smoke rows that prove it | Expected observation (written in advance) |
|---|---|---|
| Frontend and direct route | Home page loads; Direct visit `/assistant`, `/account`, `/orders/1` | 200 and the React root on every path |
| API connection | Frontend and API use HTTPS; HTTP redirects to HTTPS; `/api/health`; Ports 3000/5432 closed | HTTPS only; 301 to https; health `ok` + `database: ok`; internal ports unreachable |
| Catalog and cart (API part) | Products load; Search filters | ≥1 product; every search result contains the term |
| Account and order | Guest refused; Guest cannot order; Register A and B; Owner reads; Other customer denied; Other's list excludes; Guest refused the order; Sign-out | 401 for guest, 200 for owner, **404 for another customer by direct request**, session ends on sign-out |
| Simulated checkout | Excess quantity refused; Invalid order refused; Valid fictional order saved | 409/422 for bad input, 201 with total equal to the catalog price |
| Assistant | Supported question grounded; No match clear; Invalid input refused | Recommended IDs and prices equal catalog records; 0 products for "refrigerators"; 422 for 2 characters |
| Secrets (browser files) | No secret in browser bundle | No `postgresql://`, `DATABASE_URL`, `GEMINI_API_KEY`, `AIza…`, private keys in served JS |

---

## B. Manual browser checks (fresh private window, real URL)

| # | Check | Expected (written in advance) | Actual | Evidence file | Pass |
|---|---|---|---|---|---|
| B1 | Open home page | Product grid with current names/prices; no console errors; padlock shown | Hero, search, category/sort and product grid rendered; console had no errors; HTTPS | `docs/evidence/b1-home.png` | ✅ |
| B2 | Refresh on `/assistant` | App renders (not an nginx 404) | Direct load of `/assistant` rendered the assistant page | `docs/evidence/b8-assistant-grounded.jpg` | ✅ |
| B3 | DevTools → Network on home | Requests go to `https://<domain>/api/products`, status 200, no mixed-content warning | `GET https://shopsmart-13-210-209-254.sslip.io/api/products → 200` and `/api/auth/me → 200`; no console warnings | browser network log | ✅ |
| B4 | Search "keyboard", change quantity, check totals | Only keyboard shown; total = price × qty; qty above stock shows an error | Only Compact Mechanical Keyboard shown; qty 2 → ₱3,700.00; typing 9 shows "Only 8 unit(s) are available." and keeps 2 | `docs/evidence/b4-cart-stock-limit.jpg` | ✅ |
| B5 | Checkout while signed out | "Sign in to place your order"; cart kept | "Sign in to place your order … Your cart is kept."; Cart (2) still shown | `docs/evidence/b5-checkout-signed-out.jpg` | ✅ |
| B6 | Create fictional account → checkout → place order | Order number shown; "View order" opens `/orders/<id>` | Customer A registered (201), order #3 saved (201, ₱1,850), owner reads `/api/orders/3` (200) | `docs/evidence/b6-b7-b11-signin-ownership.md` | ✅ |
| B7 | Sign out, sign in as a **second** fictional customer, open `/orders/<id>` of B6 | "No order with this number exists for your account." | Customer B gets 404 `ORDER_NOT_FOUND` "No order with this number exists for your account."; B's list is empty | `docs/evidence/b6-b7-b11-signin-ownership.md` | ✅ |
| B8 | Assistant: "Which keyboard is below ₱2,000?" | Badge "Simulated provider (mock adapter)…"; product links open the same product and price | Badge shown; Compact Mechanical Keyboard ₱1,850, source ID 2 = catalog | `docs/evidence/b8-assistant-grounded.jpg` | ✅ |
| B9 | Assistant: "Do you have any refrigerators?" | Clear no-match message, no product links | "I could not find an in-stock product matching that request in our catalog." No products | `docs/evidence/b9-assistant-no-match.jpg` | ✅ |
| B10 | Provider failure rehearsal: set `MOCK_PROVIDER_BEHAVIOR=timeout` in `api.env`, `sudo systemctl restart shopsmart-api`, ask B8 again, then remove the line and restart | Notice "did not answer in time; the verified catalog answer is shown instead"; no endless spinner | `provider.status=fallback`, `reason=timeout`, notice "The AI provider did not answer in time; the verified catalog answer is shown instead."; verified keyboard ₱1,850 returned; setting removed and API restarted | `docs/evidence/server-checks-2026-11-20.md` | ✅ |
| B11 | DevTools → Application → Cookies | `shopsmart_session` is HttpOnly, Secure, SameSite=Lax | `shopsmart_session=…; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800; Secure` | `docs/evidence/b6-b7-b11-signin-ownership.md` | ✅ |

---

## C. Restart and logs

| # | Check | Command | Expected (written in advance) | Actual | Pass |
|---|---|---|---|---|---|
| C1 | API recovers after process restart | `sudo systemctl restart shopsmart-api` then smoke test | Health ok within ~5 s; B6 order still listed | Health ok at 6 s; order #1 still in PostgreSQL (count 1) | ✅ |
| C2 | Everything recovers after instance reboot | `sudo reboot`, wait 1–2 min, smoke test (Run 2) | All services start at boot; same products and orders as before | shopsmart-api, nginx, postgresql all `enabled`; site healthy ~25 s after reboot; smoke Run 2 27/27; next order id was #2, so order #1 survived | ✅ |
| C3 | Errors can be traced | Trigger a 422 checkout, note `traceId`, then `sudo journalctl -u shopsmart-api --since "10 min ago" \| grep <traceId-or-path>` | Log line with method, path, status and request id | `… d5538b88-100d-4ced-8aa9-5c0de6c50486 POST /api/orders 401 0.608 ms` | ✅ |
| C4 | No secrets in logs | `sudo journalctl -u shopsmart-api --since today \| grep -Ei "password\|postgresql://\|api_key\|AIza" \| wc -l` | `0` | `0` | ✅ |
| C5 | Migration history | `cd /opt/shopsmart && sudo -u shopsmart bash -c 'set -a; . /etc/shopsmart/api.env; npm run db:status'` | "2 migrations found … Database schema is up to date!" | "2 migrations found in prisma/migrations … Database schema is up to date!" | ✅ |

---

## D. Secrets and credits

| # | Check | Expected (written in advance) | Actual | Pass |
|---|---|---|---|---|
| D1 | Repository: `git ls-files \| grep -E "(^\|/)\.env$"` | No output (only `.env.example` files tracked) | No output | ✅ |
| D2 | Repository history: `git log -p --all \| grep -Ei "postgresql://[^ ]*:[^@ ]*@" \| grep -v example \| grep -v "<generated-password>"` | No real connection string | Matches are documentation placeholders only (`shopsmart_dev`@localhost, `strong_password`@fictional `ep-db` host in commit 07096de). No real credential | ✅ |
| D3 | Screenshots reviewed before commit | No account ID, IP of my home, password, connection string or key visible | Screenshots in `docs/evidence/` show only the public site | ✅ |
| D4 | Billing → credits | Credits remaining within plan | US$110.23, 171 days remaining (ends about 10 May 2027); Free plan, not charged | `docs/evidence/account-free-plan-credits.jpg` | ✅ |

---

## E. Failed cases log

Use one row per failure. Keep the exact URL, status, commit and a redacted screenshot or log excerpt.

| Date/time | URL | Status / code | Commit | First failed connection (browser → nginx → Express → PostgreSQL → provider) | Change made (old → new) | Retest result |
|---|---|---|---|---|---|---|
| 2026-11-20 15:11 UTC | https://shopsmart-13-210-209-254.sslip.io/api/health | 502 (nginx) | 7331c33 | nginx → Express: API not started yet while the first release was still building | none; waited for setup to finish | 200 ok at next poll |

---

## F. The two improvements and their retests

> Confirm these match the two improvements named in your exam. If your instructor named different ones, replace them here.

### Improvement 1: Server-enforced ownership of private order records
- **Before:** guest checkout only; no way to read an order; the starter left `// WEEK 4 IMPROVEMENT: Associate orders with authenticated users and add a protected GET route.`
- **After:** customer accounts (scrypt hashes, server sessions, HttpOnly cookie); checkout requires sign-in; `GET /api/orders` and `GET /api/orders/:id` return only the caller's own orders (401 guest, 404 other customer); additive migration keeps old orders.
- **Unit retest:** `backend/test/auth.test.js` (owner allowed, other and guest denied, legacy order unreadable, cookie flags) — `npm run check` on v1.1.0: 39/39 backend, 8/8 frontend, lint and build OK.
- **Hosted retest:** smoke rows 12–15 and 19–22 passed in both runs; B5, B6, B7, B11 ✅.

### Improvement 2: Assistant trust boundary and labeled provider
- **Before:** live provider draft text passed through unchanged once its IDs matched; provider failures were indistinguishable from normal answers; API key in the request URL.
- **After:** price claims in the draft are checked against current records; timeout / rate limit / malformed / provider error are classified and shown as a notice; every answer carries a provider badge (live vs. simulated); a labeled mock adapter can rehearse each failure on the hosted app; descriptions are wrapped as untrusted data; key moved to a header.
- **Unit retest:** `backend/test/assistant-provider.test.js` (mock label, each failure kind, hallucinated ID, wrong price, prompt-injection description) — passed in `npm run check` (39/39).
- **Hosted retest:** smoke rows 23–25 passed in both runs; B8, B9, B10 ✅.
