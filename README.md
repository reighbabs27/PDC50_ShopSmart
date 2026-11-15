# ShopSmart — Quality & Deployment Release

PDC50 Final Laboratory Activity • Quality & Deployment Guided Challenge  
**Student / Developer:** Reighfer Joshua V. Bondoc  
**Course & Section:** BSIT-4A / PDC50  
**Activity Mode:** Individual / Solo Laboratory Activity  

---

## 1. Project Overview

ShopSmart is a full-stack e-commerce classroom application built with a React (Vite) frontend, Express.js REST API backend, and PostgreSQL database managed through Prisma ORM. It features a complete customer shopping journey including catalog search and filtering, responsive shopping cart with `localStorage` persistence, stock-controlled simulated checkout, and a grounded AI product assistant powered by the Google Gemini API with deterministic rule-based fallback.

---

## 2. Technology Stack & Prerequisites

* **Frontend:** React 19, Vite 7, React Router 7, Vitest
* **Backend:** Node.js (>= 20.19.0), Express 5, Zod 4, Helmet, CORS, Prisma ORM 6
* **Database:** PostgreSQL 16
* **AI Provider:** Google Gemini API (`gemini-1.5-flash`) with server-side candidate whitelisting and deterministic fallback
* **Package Manager:** npm workspaces (`frontend`, `backend`)

---

## 3. Environment Configuration

### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env` if not already present:
```env
DATABASE_URL="postgresql://shopsmart_user:shopsmart_dev@localhost:5432/shopsmart?schema=public"
PORT=3000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# Optional AI Provider (Server-only secret)
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-1.5-flash"
```
> **Security Note:** `GEMINI_API_KEY` and `DATABASE_URL` remain strictly server-side and are excluded from Git via `.gitignore`. If no API key is provided, the assistant uses the built-in deterministic catalog fallback.

### Frontend (`frontend/.env`)
Copy `frontend/.env.example` to `frontend/.env`:
```env
VITE_API_URL=http://localhost:3000/api
```

---

## 4. Evaluator Quick-Start Guide

Follow these exact steps to start and test the local release candidate:

### Step 1: Start PostgreSQL
Ensure PostgreSQL is running locally on port `5432`. If using the portable environment:
```powershell
.\pgsql\bin\pg_ctl.exe start -D .\pgsql\data
```

### Step 2: Install Dependencies & Apply Migrations
From the project root (`PDC50_ShopSmart`):
```bash
# Install workspace dependencies
npm install

# Apply committed migrations without wiping existing data (Production workflow)
npm run db:migrate --workspace backend   # or: cd backend && npx prisma migrate deploy
```

> **Warning:** Do not run `npm run db:seed` if you wish to preserve existing order history and custom transactions.

### Step 3: Run Baseline Quality Checks
Run linting, automated unit/integration tests, and production build in one command:
```bash
npm run check
```
* Expected Result: All frontend lint, backend lint, 8 Vitest tests, 13 Node test runner tests, and Vite production bundle build succeed with 0 errors.

### Step 4: Start the Application
Run both frontend and backend concurrently:
```bash
npm run dev
```
* **Frontend:** [http://localhost:5173](http://localhost:5173)
* **Backend API:** [http://localhost:3000](http://localhost:3000)
* **Health Endpoint:** [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## 5. Available Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts frontend (Vite :5173) and backend (Express :3000) concurrently |
| `npm run check` | Runs full quality pipeline: linting, tests, and frontend build |
| `npm run test` | Runs frontend Vitest tests and backend Node tests |
| `npm run build` | Compiles frontend production assets into `frontend/dist` |
| `npm run db:migrate` | Runs committed Prisma migrations (`prisma migrate dev / deploy`) |
| `npm run db:seed` | Seeds initial catalog products (destructive reset) |
| `npm run db:studio` | Opens Prisma Studio web GUI on port 5555 |

---

## 6. Documentation & Challenge Artifacts

Full documentation and evidence records are located in the `docs/` folder:
* **Release Note:** `docs/RELEASE_NOTE.md`
* **Test Record & Evidence:** `docs/TEST_RECORD.md`
* **Deployment Plan & Architecture:** `docs/DEPLOYMENT_PLAN.md`
* **Guided Challenge Master Submission:** `SUBMISSION_QUALITY_DEPLOYMENT_CHALLENGE.md`
