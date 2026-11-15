# ShopSmart Release Note — v1.0.0-rc1

**Version:** 1.0.0-rc1 (Local Release Candidate)  
**Release Date:** November 15, 2026  
**Artifact Archive:** `PDC50_ShopSmart_Release_v1.0.0-rc1.zip`  
**Repository Branch:** `main` (Commit: Local Release Candidate Baseline)  
**Student / Developer:** Reighfer Joshua V. Bondoc  
**Activity Mode:** Individual / Solo Laboratory Activity  
**Course & Section:** PDC50 / BSIT-4A  

---

## 1. Working Features

The following end-to-end customer journeys and platform capabilities have been verified and confirmed functional in this release candidate:

* **Product Catalog Browsing & Real-Time Filtering:**
  * Active products load dynamically from PostgreSQL via Express REST API (`GET /api/products`).
  * Real-time search query filtering by product name and description with responsive no-results feedback.
  * Category filtering (Accessories, Study, Video, Audio) and multi-option price/alphabetical sorting.
  * Individual product details pages (`/products/:id`) with stock indicators and formatted PHP prices.
* **Shopping Cart with Persistent State:**
  * Adding in-stock products with quantity bounds enforcement (`addProductToCart`).
  * Incrementing, decrementing, and removing items in the shopping cart view (`CartPage.jsx`).
  * **LocalStorage Persistence:** Cart items, quantities, and calculated totals survive browser page reloads (F5) and cross-session navigation via `shopsmart_cart`.
  * Proper error styling and ARIA `alert` roles for stock-exceeded and invalid quantity actions.
* **Stock-Controlled Simulated Checkout:**
  * Delivery information form validating full name (2–80 chars), email format, and delivery address (10–300 chars).
  * Automatic whitespace trimming and sanitization on customer email inputs (`z.string().trim().email()`).
  * Atomic database transaction (`prisma.$transaction`) enforcing concurrency stock decrements; orders exceeding remaining stock are rejected with HTTP 409 Conflict.
  * Simulated order receipt with unique order ID, customer greeting, itemized breakdown, and formatted PHP currency.
* **Grounded AI Product Assistant:**
  * Question routing through Express (`POST /api/assistant/questions`) with Zod character limits (3–300) and sliding window rate limiting (20 req/min).
  * Server-side catalog ranking and candidate fact extraction (transmitting only public attributes: id, name, category, description, price, stock).
  * Candidate whitelist verification stripping hallucinated IDs and verifying prices.
  * Transparent UI featuring clickable recommended product links (`/products/:id`) and verified database source badges (`ID: 8`).
  * Honest no-match handling when queries fall outside the catalog (zero external LLM calls).
  * Resilient deterministic rule-based fallback when Gemini API key is absent or provider encounters latency/quotas.
* **Platform Security & Resilience:**
  * Route not found (404) and bad parameter (400) handling with structured JSON error responses.
  * Complete isolation of secrets (`DATABASE_URL`, `GEMINI_API_KEY`) from version control and client bundles.
  * Preserved order history and database records across migration status checks.

---

## 2. Known Limitations & Safe Boundaries

* **Authentication & Authorization (Absent by Design):**
  * Per the modular syllabus (Roadmap Week 4), user login, account registration, password hashing (`bcrypt`), and role-based access control (`User` / `Role` models) are not implemented in this starter branch. Orders are placed as simulated guest checkout.
  * **Safe Boundary:** Evaluators and shoppers must only use fictional names, emails (`@example.ph`), and simulated addresses. No real personal data or payment credentials should be submitted.
* **Live AI Provider Quota & Fallback Mode:**
  * When `GEMINI_API_KEY` is not supplied or experiences network interruption, the assistant functions in deterministic rule-based mode. This provides 100% grounded, truthful catalog recommendations without external dependencies.
* **Single Store Location / Local Currency:**
  * Currency is fixed to Philippine Pesos (PHP / ₱) with 2 decimal places. Multicurrency exchange and cross-border shipping calculation are not in scope.

---

## 3. Local Startup & Evaluator Guide

Complete instructions are documented in the root `README.md`. Quick verification sequence:

1. **Start PostgreSQL:** Ensure PostgreSQL 16 is listening on port `5432`.
2. **Apply Migrations:** Run `npm run db:migrate --workspace backend` (or `npx prisma migrate deploy`). Do NOT run `db:seed` against preserved work.
3. **Execute Baseline Checks:** Run `npm run check` in the project root. Confirms ESLint, Vitest (8 unit tests), Node test runner (13 integration tests), and Vite production build pass with 0 errors.
4. **Launch Dev Application:** Run `npm run dev`. Access the frontend at `http://localhost:5173` and API health at `http://localhost:3000/api/health`.

---

## 4. Deployment Status & Smoke Test Record

* **Target Classification:** **Local Release Candidate** (Private Local Staging Environment).
* **Live Cloud Deployment Status:** Staging configuration prepared and validated locally; public live deployment deferred until institutional hosting approval and dedicated database provisioning are granted.
* **Smoke Test Verification (Executed Nov 15, 2026):**
  * `/api/health`: HTTP 200 `{"status": "ok"}`.
  * Products API: 6 active products returned; Search for `"keyboard"` returned ID 8 (`Compact Mechanical Keyboard`).
  * Cart & Refresh: Keyboard added, quantity set to 2, page reloaded; cart persisted 2 items at ₱3,700.00.
  * Simulated Checkout: Order #8 successfully created for fictional customer *Liza Soberano* (`liza.soberano@example.ph`); stock decremented from 5 to 4.
  * Assistant Query: `"Which keyboard is below ₱2,000?"` returned grounded recommendation and source badge #8; `"Do you have any refrigerators?"` returned honest no-match.
  * Data Preservation: 8 historic and simulated orders remain intact in PostgreSQL.

---

## 5. Developer Record & Individual Accountability

As a solo laboratory activity, all tasks, tests, defect resolutions, and architecture designs were executed by **Reighfer Joshua V. Bondoc**:

* **Tests Executed:**
  * Full customer journey automated test suite (`TC-01` to `TC-10`), including API health, search, cart operations, atomic checkout, stock limits, assistant queries, honest no-matches, and provider failure fallbacks.
  * Vitest frontend unit tests (8 tests in `cart.test.js`) and Node test runner integration tests (13 tests in `validation.test.js` and `assistant.test.js`).
* **Contributions Made:**
  * Aligned PostgreSQL migration history with local migration checksums to prevent accidental database wiping.
  * Integrated `localStorage` synchronization (`shopsmart_cart`) into `CartContext.jsx` to prevent data loss on browser refresh.
  * Fixed email whitespace validation in `backend/src/validators/schemas.js` (`z.string().trim().email()`).
  * Standardized Philippine Peso decimal formatting across Cart and Checkout views.
  * Configured accessible error alert roles and styles in `CartPage.jsx` and `StatusMessage.jsx`.
  * Designed the multi-tier cloud deployment plan and authored comprehensive evaluator documentation.
* **Key Technical Issues Explained:**
  * *Database Migrations & Data Safety:* Explained why `prisma migrate dev` threatens existing database records when historical migration names differ, and why production pipelines must use `prisma migrate deploy`.
  * *Client-Side State Persistence:* Explained how in-memory React state is lost on page reload and how synchronizing context state with browser `localStorage` maintains cart continuity.
  * *Transactional Concurrency:* Explained how atomic database transactions (`prisma.$transaction`) prevent overselling when concurrent orders compete for limited stock.
  * *Security & Secrets Isolation:* Explained why public configuration (`VITE_API_URL`) can be exposed to browser bundles while runtime secrets (`DATABASE_URL`, `GEMINI_API_KEY`) must remain strictly isolated on the server.
