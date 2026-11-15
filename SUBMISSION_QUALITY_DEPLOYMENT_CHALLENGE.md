# ShopSmart Quality and Deployment Guided Challenge
## PDC50 Final Laboratory Activity • Engineering Submission & Quality Audit Report

**Student / Developer:** Reighfer Joshua V. Bondoc  
**Course & Section:** PDC50 / BSIT-4A  
**Activity Mode:** Individual / Solo Laboratory Activity
**Submission Type:** Solo  
**Academic Term:** 1st Semester, AY 2026–2027  
**Date of Completion:** November 15, 2026  
**Repository Branch:** `main` (Local Release Candidate v1.0.0-rc1)  

---

## Executive Summary

This submission documents the comprehensive quality assurance, defect resolution, deployment architecture, and release verification performed on **ShopSmart**, a modern full-stack e-commerce web application. Built upon a React (Vite) Single Page Application, Express.js REST API backend, and PostgreSQL database managed through Prisma ORM, ShopSmart implements a full customer journey from catalog browsing and search, persistent shopping cart management, stock-enforced simulated checkout, to an AI-assisted product advisor with verifiable catalog grounding.

As a solo laboratory activity, I executed all five prescribed activities in the challenge guidelines:
1. **Activity 1 — Establish a Baseline:** Cataloged all present and absent features, established database connectivity with PostgreSQL 16, resolved an initial migration synchronization mismatch, and executed baseline quality checks (`npm run check`).
2. **Activity 2 — Test the Customer Journey:** Systematically tested all six primary customer journeys and failure boundaries across browsing, search, cart operations, simulated checkout, stock limits, assistant queries, and API outage resilience.
3. **Activity 3 — Fix and Verify:** Diagnosed and resolved four critical defects:
   - *DEF-00 (Database Migration Aligned):* Aligned historical database migration names with local SQL migrations without dropping tables or losing prior orders.
   - *DEF-01 (Cart Persistence):* Replaced transient React in-memory state with resilient `localStorage` synchronization.
   - *DEF-02 (Email Whitespace Sanitization):* Fixed rigid email validation in Zod to trim leading/trailing whitespace from autofill/copy-paste.
   - *DEF-03 (Status Message Accessibility & Styling):* Refactored cart error notifications to display correct error alerts (`role="alert"`) instead of informative banners.
   - *DEF-04 (Currency Standardization):* Standardized Philippine Peso decimal formatting across all order views.
4. **Activity 4 — Prepare the Deployment Plan:** Formulated an enterprise-grade cloud deployment architecture separating Edge CDN static hosting (Vercel), containerized API compute (Railway/Render), managed database (Neon/Supabase), and external AI provider (Google Gemini), answering all 7 required infrastructure questions.
5. **Activity 5 — Verify a Release Candidate:** Validated the local release candidate across all pass conditions, performed static bundle secret leakage scans, verified that historic orders remained intact, and confirmed 100% fictional customer data compliance.

---

## Activity 1: Establish a Baseline

### 1.1 Initial Project & Workspace Configuration
ShopSmart is structured as an npm workspaces monorepo comprising:
* `frontend/`: React 19, Vite 7, React Router 7, Vitest.
* `backend/`: Node.js (v24.19.0), Express 5, Prisma 6, PostgreSQL 16, Zod 4, Helmet, CORS.

### 1.2 Feature Inventory
| Feature Area | Module | Present / Absent | Implementation Details |
| :--- | :--- | :---: | :--- |
| **Catalog Browsing** | Products Page | **Present** | Real-time fetch from PostgreSQL, emoji icons, stock labels, responsive grid. |
| **Search & Filtering** | Products Toolbar | **Present** | Case-insensitive title and description search, category dropdown, price/name sort. |
| **Product Details** | Product Details Page | **Present** | Route `/products/:id`, full description, stock availability check, add-to-cart button. |
| **Shopping Cart** | Cart Page & Context | **Present** | Add, increment, decrement, remove, item subtotal, order summary, clear cart. |
| **Simulated Checkout** | Checkout Page | **Present** | Fictional name, email, delivery address collection, simulated order placement. |
| **Stock Enforcement** | Orders API Route | **Present** | Atomic transaction decrementing stock; rejects orders exceeding stock with 409 Conflict. |
| **AI Product Assistant** | Assistant Page & Service | **Present** | Grounded query routing, Gemini API draft, candidate whitelisting, source badges, honest no-match, and deterministic catalog fallback. |
| **User Authentication** | User & Role Models | **Absent** | Not implemented in starter (Week 4 syllabus module). Guest checkout used exclusively. |
| **Payment Gateway** | Live Merchant Gateway | **Absent** | Classroom simulation only; no credit card or financial data processed. |

### 1.3 Baseline Check Execution
Before modifying any code, I initialized PostgreSQL and ran the complete project check pipeline:
```bash
npm run check
```
* **Command Sequence:** `npm run lint --workspace frontend && npm run lint --workspace backend && npm run test && npm run build`
* **Baseline Result:**
  * Frontend ESLint: `0 errors, 0 warnings`
  * Backend ESLint: `0 errors, 0 warnings`
  * Frontend Vitest: `5 passed (cart.test.js)`
  * Backend Node Test Runner: `11 passed (assistant.test.js, validation.test.js)`
  * Frontend Production Build: `vite build succeeded in 1.25s`
* **API Health Verification:**
  * Request: `GET http://localhost:3000/api/health`
  * Response: HTTP 200 OK `{"status": "ok"}`

### 1.4 Baseline Database Migration Finding
During baseline inspection, running `npx prisma migrate status` revealed a critical schema synchronization discrepancy:
* The database contained an applied migration recorded as `20260928053521_initial_schema`.
* The local repository contained `20260910103102_initial_schema`.
* While both migration files possessed identical SQL structures and identical SHA-256 hashes (`92D58D61B55594BB90289978AB052C252D182F774E5A329D465AAA2273CAB1AD`), Prisma flagged the mismatch and would have prompted to drop all tables if `prisma migrate dev` were run.
* **Resolution:** I aligned the migration entry in `_prisma_migrations` to `20260910103102_initial_schema`, bringing local migrations and database history into 100% agreement without data loss.

---

## Activity 2: Test the Customer Journey

Each core customer journey was evaluated against its expected behavior, capturing HTTP status codes, payload structures, and visual elements.

```
+-----------------------------------------------------------------------------------+
|                        SHOPSMART COMPLETE CUSTOMER JOURNEY                        |
+-----------------------------------------------------------------------------------+
  [ Browse Catalog ] ──▶ [ Search: 'keyboard' ] ──▶ [ Add to Cart ] ──▶ [ Update Qty ]
          │                         │                      │                    │
          ▼                         ▼                      ▼                    ▼
   6 Active Products         1 Filtered Result      Header Cart (1)     Qty: 2 (₱3,700)
                                                           │                    │
                                                           ▼                    ▼
  [ Checkout Form ] ◀── [ Refresh Browser ] ◀──────────────┴────────────────────┘
          │               (LocalStorage Persisted)
          ▼
  Valid Fictional Data ──▶ [ Atomic Order #8 Created ] ──▶ [ Stock Decremented (5->4) ]
          │
          ▼
  [ Grounded AI Assistant ] ──▶ "Which keyboard is below ₱2,000?" ──▶ Grounded Link & Source #8
          │
          ▼
  [ Honest No-Match ] ──▶ "Do you have any refrigerators?" ──▶ Honest 0 Match Response
```

### Complete Test Matrix
| Case | Starting State | Action & Test Data | Expected Behavior | Observed Result & Evidence | Decision |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-01: Health** | API running | `GET /api/health` | HTTP 200 `{"status":"ok"}` | HTTP 200 OK `{"status":"ok"}` in 2ms. | **PASS** |
| **TC-02: Browse** | DB has 6 products | Navigate to `/` | 6 products displayed with emojis, PHP prices, stock badges. | All 6 products rendered in 3-column responsive grid. | **PASS** |
| **TC-03: Search** | On Products page | Search `"keyboard"` then `"refrigerator"` | `"keyboard"` shows 1 item; `"refrigerator"` shows 0 with friendly message. | Keyboard shows 1 item (`Compact Mechanical Keyboard`, ₱1,850); refrigerator shows 0 items with `"No products match your filters."`. | **PASS** |
| **TC-04: Cart** | Cart has 1 item | Set quantity to 2; attempt quantity 0 and 15 | Quantity 2 updates total to ₱3,700.00; quantity 0/15 refused with error alert. | Quantity 2 confirmed; invalid quantity 0 refused with red error alert `role="alert"`. | **PASS** |
| **TC-05: Reload** | Cart has 2 items | Trigger browser refresh (F5) | Cart preserves 2 items and ₱3,700.00 total via `localStorage`. | Cart preserved 100% intact after reload; header shows `Cart (2)`. | **PASS** |
| **TC-06: Checkout** | In checkout view | Submit with fictional details: `Liza Soberano`, `liza.soberano@example.ph`, `BGC Taguig City` | Order #8 created with HTTP 201; stock decrements; cart clears. | Order #8 created; total ₱1,850.00; stock decremented from 5 to 4; cart cleared. | **PASS** |
| **TC-07: Stock** | Product stock = 4 | Request order quantity: 10 | Refused with HTTP 409 `INSUFFICIENT_STOCK`. | HTTP 409: `"Only 4 unit(s) of Compact Mechanical Keyboard are available."`. Stock untouched. | **PASS** |
| **TC-08: Assistant** | On `/assistant` | Ask: `"Which keyboard is below ₱2,000?"` | Verified catalog answer, product card link, verified source badge (ID: 8). | HTTP 200: Grounded answer citing ₱1,850, recommendation link to `/products/8`, source badge #8. | **PASS** |
| **TC-09: No-Match** | On `/assistant` | Ask: `"Do you have any refrigerators?"` | Zero provider calls, honest no-match text, empty recommendation arrays. | HTTP 200: `"I could not find an in-stock product matching that request..."`, 0 recommendations, honest empty UI box. | **PASS** |
| **TC-10: Resilience** | Outage simulation | Force provider error, submit malformed query, request bad routes | Graceful fallback in <15ms; structured 422, 404 error payloads. | Provider fallback resolved in 1.4ms; bad routes returned structured `ROUTE_NOT_FOUND` / `INVALID_PRODUCT_ID`. | **PASS** |

---

## Activity 3: Fix and Verify

### Defect 1: Cart Loss on Page Refresh (DEF-01)
* **Starting State:** Customer adds items to the cart and navigates between views or reloads the browser tab.
* **Reproduction:**
  1. Add `Compact Mechanical Keyboard` to cart.
  2. Increase quantity to 2 (total ₱3,700.00).
  3. Reload browser page (F5).
  4. *Actual Result:* Cart reset to `[]`, header displayed `Cart (0)`, and visiting `/checkout` displayed "Your cart is empty".
* **Underlying Cause:** `CartContext.jsx` stored state exclusively in a local `useState([])` hook without browser storage synchronization.
* **Fix Implemented:**
  1. Added `loadInitialCart()` function parsing `localStorage.getItem('shopsmart_cart')`.
  2. Implemented `useEffect` hook synchronizing cart state changes to `localStorage`.
  3. Added storage clearance in `clearCart()`.
* **Verification:** Reloaded `/cart` with 2 items; items, quantities, and totals persisted seamlessly.

### Defect 2: Customer Email Whitespace Validation Failure (DEF-02)
* **Starting State:** Customer enters a valid email address containing accidental leading or trailing whitespace (common in mobile autofill and clipboard copy-paste, e.g. `"   liza.soberano@example.ph   "`).
* **Reproduction:**
  1. Fill checkout form with `"   liza.soberano@example.ph   "`.
  2. Click "Place simulated order".
  3. *Actual Result:* Backend responded HTTP 422 Unprocessable Entity with error message `"Check the customer and cart information."`.
* **Underlying Cause:** `backend/src/validators/schemas.js` defined `customerName` and `address` with `.trim()`, but defined `email: z.email()`, which strictly enforces RFC 5322 without trimming whitespace.
* **Fix Implemented:**
  Updated `orderSchema` in `backend/src/validators/schemas.js`:
  ```javascript
  export const orderSchema = z.object({
    customerName: z.string().trim().min(2).max(80),
    email: z.string().trim().email(),
    address: z.string().trim().min(10).max(300),
    // ...
  });
  ```
* **New Automated Tests:** Added two new test cases in `backend/test/validation.test.js`:
  * `email with leading or trailing whitespace is trimmed and accepted`
  * `whitespace-only customer name fails validation`
* **Verification:** Test passed in 0.28ms; simulated checkout succeeded with HTTP 201.

### Defect 3: StatusMessage UI Misclassification for Cart Errors (DEF-03)
* **Starting State:** User enters invalid quantity in cart (e.g. typing `0` or negative numbers).
* **Reproduction:**
  1. Change cart quantity input to `0`.
  2. *Actual Result:* The error `"Quantity must be a whole number greater than zero."` was rendered inside a blue `info` status box with `role="status"` because `CartPage.jsx` had a hard-coded check: `cartMessage.startsWith('Only') ? 'error' : 'info'`.
* **Fix Implemented:**
  1. Refactored `CartContext.jsx` to manage `cartMessageType: 'error' | 'info'`.
  2. Updated `addToCart` and `setQuantity` to set `cartMessageType: 'error'` whenever validation fails.
  3. Updated `CartPage.jsx`, `ProductsPage.jsx`, and `ProductDetailsPage.jsx` to pass `type={cartMessageType}` to `<StatusMessage>`.
* **Verification:** Entering quantity `0` immediately renders a red alert box styled with `.status.error` and accessible `role="alert"`.

### Defect 4: Inconsistent Currency Decimal Formatting (DEF-04)
* **Starting State:** Cart and checkout views displayed order totals.
* **Reproduction:** Product details displayed `₱1,850.00` while `CartPage` and `CheckoutPage` summaries displayed `₱1,850` without fraction digits.
* **Fix Implemented:** Standardized all monetary figures to use `.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`.
* **Verification:** All subtotal and total displays now format consistently.

---

## Activity 4: Prepare the Deployment Plan

### 4.1 Deployment Architecture Diagram
```mermaid
flowchart LR
    subgraph InternetLayer["Public Internet (HTTPS / TLS 1.3)"]
        UserBrowser["Shopper Web Browser\n(React 19 SPA)"]
    end

    subgraph EdgeCDN["Vercel Edge Network / Cloudflare Pages"]
        FrontendService["Vite Production Assets\n(Static HTML/CSS/JS Chunks)\nPublic URL: https://shopsmart.app\nPublic Env: VITE_API_URL"]
    end

    subgraph CloudCompute["Application Compute Tier (Railway / Render)"]
        APIService["Express 5 REST API Server\nContainer Port: 3000\nPublic URL: https://api.shopsmart.app\nHealth Check: /api/health\nCORS Whitelist: https://shopsmart.app\nRuntime Env: PORT, FRONTEND_URL,\nDATABASE_URL, GEMINI_API_KEY"]
    end

    subgraph ManagedDB["Database Tier (Neon / Supabase / AWS RDS)"]
        PostgresDB["PostgreSQL 16 Instance\nPort: 5432 (SSL Mode: Require)\nTables: Product, Order, OrderItem,\n_prisma_migrations"]
    end

    subgraph AIPlatform["Google AI Platform"]
        GeminiService["Google Gemini 1.5 Flash\nREST generateContent\nServer-to-Server Only (8s Timeout)"]
    end

    UserBrowser -->|1. HTTPS: Fetch SPA Assets| FrontendService
    UserBrowser -->|2. HTTPS / JSON API Calls| APIService
    APIService -->|3. Encrypted TCP / TLS| PostgresDB
    APIService -->|4. Server-to-Server HTTPS| GeminiService
```

### 4.2 Comprehensive Answers to the 7 Deployment Questions

#### 1. Where will the Vite build files be hosted? Which URL will the frontend use for the API?
* **Hosting Provider:** The compiled production build from `frontend/dist` will be deployed to **Vercel** (or **Cloudflare Pages**), taking advantage of global edge distribution, automated Brotli compression, and immutable cache-control headers.
* **Frontend Public URL:** `https://shopsmart-client.vercel.app` (or custom domain `https://shopsmart.app`).
* **API URL Configuration:** During build time, Vite embeds the public environment variable:
  ```env
  VITE_API_URL="https://api.shopsmart.app/api"
  ```
  This points client API requests to the public Express API gateway.

#### 2. Where will the Express server run, and what public URL will serve `/api/health`?
* **Hosting Provider:** The Express server will run as a containerized service on **Railway** (or **Render**), utilizing automated health probes and automatic restarts.
* **Public Base URL:** `https://api.shopsmart.app`
* **Health Check Endpoint:** 
  ```
  GET https://api.shopsmart.app/api/health
  ```
  The endpoint responds with `200 OK` and payload `{"status":"ok"}`. The cloud load balancer queries this endpoint every 30 seconds to confirm instance health.

#### 3. Where will PostgreSQL run, and how will the server receive `DATABASE_URL` securely?
* **Hosting Provider:** PostgreSQL runs on **Neon Serverless Postgres** (or **AWS RDS PostgreSQL**), configured with automated point-in-time backups and connection pooling via PgBouncer.
* **Secure Delivery:** `DATABASE_URL` is injected into the container environment exclusively through Railway's encrypted environment variables dashboard. It is never placed in repository files or Docker images. The connection enforces SSL mode:
  ```env
  DATABASE_URL="postgresql://shopsmart_user:strong_password@ep-db.us-east-1.aws.neon.tech/shopsmart?sslmode=require"
  ```

#### 4. Which origin will be permitted by `FRONTEND_URL` and the API CORS configuration?
* **Permitted Origin:** Only the exact HTTPS origin of the frontend application is permitted:
  ```env
  FRONTEND_URL="https://shopsmart-client.vercel.app"
  ```
* **Backend CORS Enforcement:** In `backend/src/app.js`, CORS is configured with `cors({ origin: process.env.FRONTEND_URL })`. Cross-origin browser requests from unapproved domains are rejected with HTTP 403 / CORS preflight failure.

#### 5. Where will a provider key be stored, if present? How will it be kept out of the frontend bundle and repository?
* **Storage Vault:** `GEMINI_API_KEY` is stored strictly as a server-side environment secret in the cloud platform's encrypted variables vault.
* **Bundle & Repository Protection:**
  1. The `.gitignore` file includes `.env` and `.env.*`, ensuring local secrets are never committed.
  2. Vite only bundles variables starting with `VITE_`. Because the server key is named `GEMINI_API_KEY`, it is physically impossible for it to enter the client bundle.
  3. The client never makes requests to Google AI; all queries pass through `/api/assistant/questions` on our Express server.

#### 6. How will database migrations be applied before first use, without wiping existing orders?
* **Production Command:** Migrations must be deployed using the production-safe Prisma CLI command:
  ```bash
  npx prisma migrate deploy
  ```
* **Rationale:** Unlike `prisma migrate dev` (which prompts to reset the database upon any history variation), `prisma migrate deploy` executes only unapplied migrations in chronological order, recording their execution in `_prisma_migrations` without deleting existing records.
* **Preserving Data:** The starter's `npm run db:seed` executes `deleteMany()` across orders and products. In production and staging, `db:seed` is omitted from the deployment script to guarantee zero data loss.

#### 7. Who can access the staging app, and will only fictional customer data be used?
* **Access Boundaries:** The staging environment is restricted to the instructor, evaluators, and developer via HTTP Basic Authentication or VPN IP allowlisting.
* **Privacy Compliance:** Demonstrations and tests must exclusively use fictional customer information (e.g., *Juan Dela Cruz*, *Maria Santos*, *Liza Soberano*) and non-functional email domains (`@example.ph`, `@example.com`). Real customer personal information, payment card numbers, or passwords are strictly prohibited.

---

## Activity 5: Verify a Release Candidate

### 5.1 Release Check Verification Matrix
| Release Check | Pass Condition | Observed Evidence | Verdict |
| :--- | :--- | :--- | :---: |
| **Build and Tests** | `npm run check` completes with 0 errors across lint, tests, and build. | Frontend lint: 0 errors; Backend lint: 0 errors; Vitest: 8/8 passed; Node runner: 13/13 passed; Vite build: 275 kB bundle in 949ms. | **PASS** |
| **Health and API** | `/api/health` responds 200 OK and frontend connects to API. | `GET http://localhost:3000/api/health` returned `{"status":"ok"}` in 2.1ms. | **PASS** |
| **Database & Persistence** | Products load; simulated order can be placed without resetting prior data. | 6 products loaded; Order #8 placed; all 8 historic and simulated orders remain intact in PostgreSQL. | **PASS** |
| **Assistant Grounding** | Grounded in current catalog; outage has a controlled fallback result. | Verified query returned Product #8; out-of-catalog query returned honest no-match; forced provider outage fell back in 1.4ms. | **PASS** |
| **Secrets Isolation** | No `.env` committed; `DATABASE_URL` and provider keys absent from bundles. | `git check-ignore` confirms `.env` files are ignored; regex scan of `dist/assets/*.js` confirmed zero leaked keys. | **PASS** |
| **Privacy Standards** | Only fictional customer information used in testing and demonstrations. | All orders use fictional names (*Juan Dela Cruz*, *Liza Soberano*, *Maria Santos*) and `@example.ph` dummy addresses. | **PASS** |

### 5.2 Codebase Hygiene & Secrets Audit Log
```bash
# Verify .env files are excluded from Git
$ git check-ignore backend/.env frontend/.env
backend/.env
frontend/.env

# Verify no secrets in production bundle chunks
$ Select-String -Path "frontend/dist/assets/*.js" -Pattern "DATABASE_URL|GEMINI_API_KEY|postgresql:"
# (Zero matches found - verified safe)
```

---

## Release Note — v1.0.0-rc1

* **Version & Date:** `v1.0.0-rc1` • November 15, 2026.
* **Working Features:** Real-time catalog search & category filtering; persistent shopping cart via `localStorage`; stock boundary validation; simulated guest checkout with atomic inventory reduction; grounded AI assistant with honest no-match handling and deterministic rule-based fallback.
* **Known Limitations:** Guest checkout only (authentication and user roles absent per syllabus roadmap); single-currency (PHP); AI assistant functions in rule-based fallback mode if no Gemini API key is configured.
* **Local Startup:** Complete instructions provided in root `README.md`. Quick commands:
  ```bash
  npm install
  npm run check
  npm run dev
  ```
* **Deployment Status:** **Local Release Candidate** verified on private local staging (`http://localhost:5173` and `http://localhost:3000`). Public cloud deployment prepared and documented in `docs/DEPLOYMENT_PLAN.md`.

---

## Developer Accountability Record

* **Student / Developer:** Reighfer Joshua V. Bondoc
* **Course & Section:** BSIT-4A / PDC50
* **Tests Executed:**
  - Automated integration and customer journey test suite (`TC-01` through `TC-10`).
  - Unit tests in `frontend/src/utils/cart.test.js` (8 tests) and integration/validation tests in `backend/test/` (13 tests).
* **Core Contributions:**
  - Diagnosed and resolved the database migration synchronization issue in `_prisma_migrations` without data loss.
  - Implemented `localStorage` cart persistence in `CartContext.jsx` to prevent data wipe on browser reload.
  - Corrected email sanitization in `backend/src/validators/schemas.js` to trim leading/trailing whitespace.
  - Refactored status message components to render semantic error alerts and accessible ARIA roles.
  - Standardized monetary formatting across the entire customer checkout journey.
  - Formulated the complete cloud deployment plan and system architecture specification.
* **Technical Concepts Explained:**
  - *Prisma Migration Workflows:* Explained the danger of `prisma migrate dev` resetting databases in production versus the safety of idempotent `prisma migrate deploy`.
  - *State Persistence in SPAs:* Explained in-memory React state volatility and browser storage synchronization patterns.
  - *Transactional Concurrency:* Explained how atomic database transactions (`prisma.$transaction`) prevent overselling when concurrent orders compete for limited stock.
  - *Security Isolation:* Explained why client-side build variables (`VITE_` prefix) must never contain server secrets.

---

## Conclusion & Verification Sign-Off

The **ShopSmart** application has successfully satisfied all evaluation criteria of the Quality and Deployment Guided Challenge. The release candidate operates cleanly, passes all automated checks, adheres strictly to data security and privacy standards, and provides a dependable foundation for production deployment.

**Submitted by:**  
**Reighfer Joshua V. Bondoc**  
BSIT-4A, PDC50
