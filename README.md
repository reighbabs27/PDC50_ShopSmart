# ShopSmart — v1.1.0 AWS Deployment Release

PDC50 Final Laboratory Activity • Quality & Deployment Guided Challenge  
**Student / Developer:** Reighfer Joshua V. Bondoc  
**Course & Section:** BSIT-4A / PDC50  
**Activity Mode:** Individual / Solo Laboratory Activity  

---

## 1. Project Overview

ShopSmart is a full-stack e-commerce classroom application built with a React (Vite) frontend, Express.js REST API backend, and PostgreSQL database managed through Prisma ORM. It features a complete customer shopping journey including catalog search and filtering, responsive shopping cart with `localStorage` persistence, stock-controlled simulated checkout, a grounded AI product assistant (Google Gemini or a clearly labeled mock adapter, with a verified catalog fallback), and customer sign-in so each simulated order is private to the customer who placed it.

**AWS deployment (v1.1.0):** see `SUBMISSION_AWS_DEPLOYMENT.md` for the submission index, `docs/AWS_DEPLOYMENT_PLAN.md` for the architecture decision and runbook, and `deploy/` for the server files.

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

# Assistant provider: mock (labeled simulation), none (catalog rules only) or gemini
AI_PROVIDER=mock
# GEMINI_API_KEY=""            # server-only secret, only with instructor approval

# Production-only settings (see deploy/api.env.example)
# HOST=127.0.0.1  TRUST_PROXY=true  REQUIRE_HTTPS=true  COOKIE_SECURE=true  COOKIE_SAMESITE=lax
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

# Development: create/apply migrations locally
npm run db:migrate
# Deployed database: apply committed migrations only, never resets data
npm run db:deploy
```

> **Warning:** `npm run db:seed` deletes every order, customer and product (it refuses to run with `NODE_ENV=production`). On a database you want to keep, use `npm run db:seed:catalog`, which only adds missing starter products.

### Step 3: Run Baseline Quality Checks
Run linting, automated unit/integration tests, and production build in one command:
```bash
npm run check
```
* Expected Result: frontend lint, backend lint, 8 Vitest tests, 39 Node test runner tests, and the Vite production build all succeed with 0 errors.

### Step 4: Start the Application
Run both frontend and backend concurrently:
```bash
npm run dev
```
* **Frontend:** [http://localhost:5173](http://localhost:5173)
* **Backend API:** [http://localhost:3000](http://localhost:3000)
* **Health Endpoint:** [http://localhost:3000/api/health](http://localhost:3000/api/health) (checks the database too)
* **Sign in:** open `/account` and create a fictional test account; checkout requires it.

---

## 5. Available Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts frontend (Vite :5173) and backend (Express :3000) concurrently |
| `npm run check` | Runs full quality pipeline: linting, tests, and frontend build |
| `npm run test` | Runs frontend Vitest tests and backend Node tests |
| `npm run build` | Compiles frontend production assets into `frontend/dist` |
| `npm run db:migrate` | Development only: `prisma migrate dev` |
| `npm run db:deploy` | Deployed DB: `prisma migrate deploy` (applies committed migrations, no reset) |
| `npm run db:status` | Shows applied / pending migrations |
| `npm run db:seed` | **Destructive** reset to the starter catalog (blocked in production) |
| `npm run db:seed:catalog` | Adds missing starter products only; never touches orders or customers |
| `npm run smoke -- <url>` | Runs the hosted customer-journey checks and writes `docs/evidence/smoke-*.md` |
| `npm run db:studio` | Opens Prisma Studio web GUI on port 5555 |

---

## 6. Documentation & Challenge Artifacts

Full documentation and evidence records are located in the `docs/` folder:
* **Release Note:** `docs/RELEASE_NOTE.md`
* **Test Record & Evidence:** `docs/TEST_RECORD.md`
* **Deployment Plan & Architecture:** `docs/DEPLOYMENT_PLAN.md`
* **Guided Challenge Master Submission:** `SUBMISSION_QUALITY_DEPLOYMENT_CHALLENGE.md`
* **AWS Deployment Submission Index:** `SUBMISSION_AWS_DEPLOYMENT.md`
* **AWS Deployment Plan & Decision Record:** `docs/AWS_DEPLOYMENT_PLAN.md`
* **AWS Hosted Verification Record:** `docs/AWS_VERIFICATION_RECORD.md`
* **Release Note v1.1.0:** `docs/RELEASE_NOTE_v1.1.0.md`
* **Deployment diagram:** `docs/diagrams/aws-deployment.png`
