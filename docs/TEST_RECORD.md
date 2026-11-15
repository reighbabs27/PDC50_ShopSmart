# ShopSmart Test Record & Evidence Matrix

**Course / Section:** PDC50 / BSIT-4A  
**Activity:** ShopSmart Quality and Deployment Guided Challenge  
**Activity Mode:** Individual / Solo Laboratory Activity  
**Student / Developer:** Reighfer Joshua V. Bondoc  
**Evaluation Date:** November 14–15, 2026  
**Target Environment:** Local Release Candidate (Node.js v24.19.0, Vite 7, PostgreSQL 16)  

---

## 1. Test Suite Summary

| Total Test Cases | Passed | Failed (Initially) | Resolved After Fix | Unresolved | Status |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **10** | **10** | **4** | **4** | **0** | **100% PASS** |

---

## 2. Customer Journey & Failure Test Records

### Test Case TC-01: Health & API Accessibility
* **Case and starting state:** Express server running with PostgreSQL connected.
* **Action and test data:** Issue `GET /api/health` via HTTP request.
* **Expected result:** Server responds with HTTP status 200 and JSON payload `{"status": "ok"}`.
* **Observed result and evidence:** 
  ```json
  HTTP/1.1 200 OK
  Content-Type: application/json; charset=utf-8
  {
    "status": "ok"
  }
  ```
  Verified via Node test suite and PowerShell `Invoke-RestMethod`. Response time: 2.1 ms.
* **Decision:** **PASS**

---

### Test Case TC-02: Catalog Browsing & Category Filtering
* **Case and starting state:** PostgreSQL contains 6 seeded products; user opens frontend home page `http://localhost:5173/`.
* **Action and test data:** User views product catalog, selects category filter `"Accessories"`, then sorts by `"Price: low to high"`.
* **Expected result:** Active products load displaying emoji icon, category, title, description, formatted PHP currency, and stock badges. Selecting `"Accessories"` filters products to Wireless Mouse and Compact Mechanical Keyboard.
* **Observed result and evidence:** 
  Catalog loads 6 products (`Wireless Mouse`, `Compact Mechanical Keyboard`, `USB-C Study Lamp`, `1080p Webcam`, `Laptop Stand`, `USB Headset`). Filtering by Accessories displays 2 products sorted low-to-high: Wireless Mouse (₱650.00) then Keyboard (₱1,850.00).
* **Decision:** **PASS**

---

### Test Case TC-03: Search Query & No-Results State
* **Case and starting state:** User on Products page with active search toolbar.
* **Action and test data:** 
  1. User types query `"keyboard"`.
  2. User changes query to `"refrigerator"`.
* **Expected result:**
  1. `"keyboard"` query returns only `Compact Mechanical Keyboard` (ID: 8).
  2. `"refrigerator"` query returns an honest empty state displaying `"No products match your filters."`.
* **Observed result and evidence:**
  * For `"keyboard"`: API responds HTTP 200 with 1 product (`id: 8, name: "Compact Mechanical Keyboard"`).
  * For `"refrigerator"`: API responds HTTP 200 with empty array (`products: []`). Frontend renders `<StatusMessage>No products match your filters.</StatusMessage>`.
* **Decision:** **PASS**

---

### Test Case TC-04: Cart Quantity Update, Stock Boundaries & Error Styling
* **Case and starting state:** Cart contains 1 unit of `Compact Mechanical Keyboard` (stock = 4).
* **Action and test data:**
  1. Click `+` button in CartPage to increase quantity to 2.
  2. User types `0` in quantity input box.
  3. User types `15` (exceeding available stock 4).
* **Expected result:**
  1. Quantity updates to 2; item subtotal becomes ₱3,700.00; order total becomes ₱3,700.00.
  2. Setting quantity to 0 is refused with message `"Quantity must be a whole number greater than zero."`, rendered with `type="error"` (red alert).
  3. Setting quantity to 15 is refused with message `"Only 4 unit(s) are available."`, rendered with `type="error"` (red alert).
* **Observed result and evidence (Before Fix):**
  * Defect observed: Invalid quantity 0 resulted in error message displaying with blue `info` border because `CartPage.jsx` only checked `cartMessage.startsWith('Only')`.
* **Observed result and evidence (After Fix):**
  * `CartContext.jsx` updated to track `cartMessageType: 'error' | 'info'`.
  * Message rendered inside `<div className="status error" role="alert">Quantity must be a whole number greater than zero.</div>`.
  * Quantity remained at 2. Total remained ₱3,700.00.
* **Decision:** **PASS (Resolved Defect DEF-03)**

---

### Test Case TC-05: Cart LocalStorage Persistence Across Browser Reload
* **Case and starting state:** Cart contains 2 units of `Compact Mechanical Keyboard` (total ₱3,700.00). User is on `/cart`.
* **Action and test data:** Trigger browser page reload (F5 / Refresh) or navigate away and return.
* **Expected result:** Cart retains items, quantities, and totals from `localStorage` without resetting to empty.
* **Observed result and evidence (Before Fix):**
  * Defect observed: `CartContext.jsx` used unpersisted `useState([])`. Refreshing erased cart contents completely and kicked checkout users back to empty state.
* **Observed result and evidence (After Fix):**
  * Initializer reads `localStorage.getItem('shopsmart_cart')`.
  * After reload: Header navigation displays `Cart (2)`. Cart table displays `Compact Mechanical Keyboard × 2`, Total: ₱3,700.00.
* **Decision:** **PASS (Resolved Defect DEF-01)**

---

### Test Case TC-06: Checkout Delivery Input Validation & Email Whitespace Fix
* **Case and starting state:** Cart contains 1 unit of `Wireless Mouse` (₱650.00). User opens `/checkout`.
* **Action and test data:**
  1. Test A: Submitting email `"notanemail"` with valid name and address.
  2. Test B: Submitting address `"Short"` (<10 characters).
  3. Test C: Submitting name `"   "` (whitespace only).
  4. Test D: Submitting valid email with surrounding whitespace: `"   liza.soberano@example.ph   "`.
* **Expected result:**
  * Tests A, B, and C are rejected with HTTP 422 `INVALID_ORDER`.
  * Test D is trimmed, accepted, and creates order.
* **Observed result and evidence (Before Fix):**
  * Test D failed because `backend/src/validators/schemas.js` used untrimmed `email: z.email()`.
* **Observed result and evidence (After Fix):**
  * Updated `schemas.js` to `email: z.string().trim().email()`.
  * Tests A, B, C returned HTTP 422 with structured field errors.
  * Test D succeeded with HTTP 201:
    ```json
    {
      "id": 8,
      "customerName": "Liza Soberano",
      "email": "liza.soberano@example.ph",
      "address": "26th Street, BGC Taguig City, Metro Manila",
      "status": "PENDING",
      "total": 1850
    }
    ```
* **Decision:** **PASS (Resolved Defect DEF-02)**

---

### Test Case TC-07: Concurrency & Real-Time Stock Exhaustion
* **Case and starting state:** Product #8 (`Compact Mechanical Keyboard`) has remaining stock of 4.
* **Action and test data:** Submit simulated checkout request with `quantity: 10`.
* **Expected result:** Order refused with HTTP 409 Conflict: `INSUFFICIENT_STOCK`. Database stock remains 4. Cart unchanged.
* **Observed result and evidence:**
  ```json
  HTTP/1.1 409 Conflict
  {
    "error": {
      "code": "INSUFFICIENT_STOCK",
      "message": "Only 4 unit(s) of Compact Mechanical Keyboard are available."
    }
  }
  ```
  Prisma transaction aborted cleanly; stock verified at 4 via direct database query.
* **Decision:** **PASS**

---

### Test Case TC-08: Grounded AI Assistant with Valid Catalog Query
* **Case and starting state:** User opens `/assistant`. Gemini API key is absent or in fallback mode.
* **Action and test data:** User asks: `"Which keyboard is below ₱2,000?"`.
* **Expected result:** Assistant returns concise answer referencing `Compact Mechanical Keyboard` at ₱1,850.00, clickable product recommendation card (`/products/8`), and verified source badge (`ID: 8`).
* **Observed result and evidence:**
  ```json
  HTTP/1.1 200 OK
  {
    "answer": "Based on the current ShopSmart catalog, consider: Compact Mechanical Keyboard (₱1,850). Compact Mechanical Keyboard is in stock with 4 available units at ₱1,850: Hot-swappable compact keyboard with tactile switches.",
    "recommendedProducts": [
      {
        "id": 8,
        "name": "Compact Mechanical Keyboard",
        "price": 1850,
        "category": "Accessories"
      }
    ],
    "sources": [
      { "type": "product", "id": 8, "name": "Compact Mechanical Keyboard" }
    ]
  }
  ```
* **Decision:** **PASS**

---

### Test Case TC-09: Grounded AI Assistant Honest No-Match Handling
* **Case and starting state:** User on `/assistant`.
* **Action and test data:** User asks: `"Do you have any refrigerators?"`.
* **Expected result:** System recognizes item is outside catalog facts, skips calling external LLM to prevent hallucinations, and immediately returns an honest no-match message with empty recommendations and sources.
* **Observed result and evidence:**
  ```json
  HTTP/1.1 200 OK
  {
    "answer": "I could not find an in-stock product matching that request in our catalog.",
    "recommendedProducts": [],
    "sources": []
  }
  ```
  Frontend displays honest message in chat bubble and renders `.no-match-box`: `"No matching active products found in the catalog for this inquiry."`.
* **Decision:** **PASS**

---

### Test Case TC-10: Failure & Resilience Under Provider Outage or Invalid Routes
* **Case and starting state:** Backend running; user tests resilience against provider failure or broken URLs.
* **Action and test data:**
  1. Provider forced failure via `simulateFailure: true`.
  2. Malformed query (<3 characters, e.g. `"hi"`).
  3. Non-existent product ID (`/api/products/99999`).
  4. Non-existent route (`/api/unknown-endpoint`).
* **Expected result:**
  1. Provider failure falls back in <15 ms to deterministic catalog response without hanging.
  2. Sub-3-character query returns HTTP 422 `INVALID_QUESTION`.
  3. Non-existent product returns HTTP 404 `PRODUCT_NOT_FOUND`.
  4. Non-existent route returns HTTP 404 `ROUTE_NOT_FOUND`.
* **Observed result and evidence:**
  * Provider failure: Fallback completed in 1.4 ms; returned verified catalog item.
  * Sub-3 query: HTTP 422 `{"error":{"code":"INVALID_QUESTION","message":"Question must contain between 3 and 300 characters."}}`.
  * Product 99999: HTTP 404 `{"error":{"code":"PRODUCT_NOT_FOUND","message":"Product could not be found."}}`.
  * Route unknown: HTTP 404 `{"error":{"code":"ROUTE_NOT_FOUND","message":"API route could not be found."}}`.
* **Decision:** **PASS**

---

## 3. Defects Log & Resolution Table

| Defect ID | Severity | Component | Summary | Resolution | Verified In |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-00** | Critical | Database | Local migration name (`20260910103102`) differed from database record (`20260928053521`), threatening forced db wipe on dev migrate. | Aligned migration table entry with identical SHA256 checksum; verified clean `prisma migrate deploy`. | Baseline / Activity 1 |
| **DEF-01** | High | Frontend | In-memory `CartContext` lost all cart items on page reload/refresh. | Implemented `localStorage` synchronization (`shopsmart_cart`) in `CartContext.jsx`. | TC-05 |
| **DEF-02** | High | Backend API | Untrimmed `email: z.email()` in `orderSchema` rejected emails with leading/trailing spaces from autofill/copy-paste. | Updated schema to `email: z.string().trim().email()`; added validation test cases. | TC-06 |
| **DEF-03** | Medium | Frontend UX | `CartPage.jsx` styled non-"Only" error messages (e.g. quantity < 1) with blue `info` style instead of red `error`. | Added `cartMessageType` state in `CartContext.jsx`; updated CartPage, ProductsPage, and DetailsPage. | TC-04 |
| **DEF-04** | Low | Frontend UI | Currency formatting in Cart and Checkout differed (`₱1,850` vs `₱1,850.00`). | Standardized currency formatting using `{ minimumFractionDigits: 2, maximumFractionDigits: 2 }`. | TC-04, TC-06 |
