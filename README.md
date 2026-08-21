# QuantaFONS - Online Counselling Platform

A web-based counselling platform enabling visitors to browse counsellors, book sessions, pay online, and join automated video consultations.

## Project Structure

```
/client   → Frontend (Next.js)
/server   → Backend (Node.js, Express, Prisma, PostgreSQL)
README.md
```

## Tech Stack

**Frontend**
- Next.js (App Router)

**Backend / Database**
- Node.js + Express
- Prisma ORM (v7)
- Prisma Postgres (hosted DB via Accelerate)
- `@prisma/adapter-pg` + `pg` — required driver adapter for DB connection in Prisma 7
- `cors` — cross-origin requests between frontend (3000) and backend (4000)

**Payments**
- Razorpay (test mode) — server-side order creation + webhook signature verification

**Dev Tooling**
- `tsx` — TypeScript execution (dev server + seed script)
- `dotenv` — environment variable loading
- `ngrok` — local tunnel for exposing the backend so Razorpay's webhook can reach `localhost` during development
- TypeScript / JavaScript

**Version Control**
- Git + GitHub

## Getting Started

### 1. Clone the repository
```bash
git clone <repo-url>
cd counselling-platform
```

### 2. Install dependencies

**Frontend:**
```bash
cd client
npm install
```

**Backend:**
```bash
cd server
npm install
```

### 3. Set up environment variables

Copy `.env.example` to `.env` in `/server` and fill in the values:
```
DATABASE_URL="your-connection-string-here"
RAZORPAY_KEY_ID="your-razorpay-test-key-id"
RAZORPAY_KEY_SECRET="your-razorpay-test-key-secret"
RAZORPAY_WEBHOOK_SECRET="your-razorpay-webhook-secret"
PORT=4000
```

### 4. Run database migrations
```bash
cd server
npx prisma migrate dev
```

### 5. Seed the database
```bash
npx prisma db seed
```

### 6. Run the backend
```bash
cd server
npx tsx index.ts
```
Runs on `http://localhost:4000`

### 7. Run the frontend
```bash
cd client
npm run dev
```
Visit `http://localhost:3000`

### 8. (For payment testing only) Expose backend via ngrok
Razorpay's webhook needs a public URL to reach your local server:
```bash
cd server
npx ngrok http 4000
```
Copy the forwarding URL (e.g. `https://xxxx.ngrok-free.dev`) and set it as the webhook URL in the Razorpay dashboard, appending `/api/payments/webhook`.

> **Note:** Free ngrok URLs change every time the tunnel restarts — the webhook URL in the Razorpay dashboard must be updated to match, unless a [static ngrok domain](https://dashboard.ngrok.com) is used.

## Database Schema

Four core models:
- **Counsellor** — profile, fee, specialisation, languages
- **Availability** — published hours per counsellor
- **Booking** — visitor booking against a counsellor + time slot
- **Payment** — payment record linked to a booking

**Key constraint:** `@@unique([counsellorId, startTime])` on both `Availability` and `Booking` — enforced at the database level to prevent two visitors from booking the same hour.

## API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/counsellors` | List all approved counsellors (directory) |
| GET | `/api/counsellors/:id` | Get a single counsellor's profile |
| POST | `/api/payments/create-order` | Create a Razorpay order + a `PENDING` booking |
| POST | `/api/payments/webhook` | Razorpay webhook — confirms booking only after `payment.captured` is verified |

**Important:** A booking is created as `PENDING` when the order is created, but only flips to `CONFIRMED` once the webhook verifies the payment signature and receives `payment.captured`. This is enforced server-side so a payment forged from the browser can never confirm a booking.

## Known Setup Notes (Prisma 7)
- `datasource.url` can no longer be set directly in `schema.prisma` — must be configured in `prisma.config.ts`.
- Seed command config moved from `package.json` to `prisma.config.ts` under `migrations.seed`.
- A driver adapter (`@prisma/adapter-pg`) is now required to instantiate `PrismaClient`.

## Known Setup Notes (Webhook / Express)
- The webhook route requires the **raw request body** (not JSON-parsed) to verify Razorpay's signature. The global `express.json()` middleware is conditionally skipped for `/api/payments/webhook`, and that route uses `express.raw({ type: 'application/json' })` instead.
- On Mac, port `5000` is commonly occupied by AirPlay Receiver — the backend runs on port `4000` to avoid this conflict.

## Progress Log

### Sprint 1

| Task | Description | Status |
|------|-------------|--------|
| T-001 | Repository, environment config, demo deployment target | ✅ Done |
| T-002 | Data model for counsellors, availability, bookings, payments | ✅ Done |
| T-003 | Seed four counsellor records with fees, languages, specialisations | ✅ Done |
| T-004 | Layout for four booking steps and counsellor availability panel | ✅ Done |
| T-005 | Counsellor directory and profile page (anonymous browsing) | ✅ Done |
| T-006 | Progress rail and checkout screen — name/email/phone capture with validation | ✅ Done |
| T-007 | Razorpay integration — server-side order creation and webhook verification | ✅ Done |

## Deployment

- **Frontend:** Deployed on Vercel, auto-deploys from `main` branch.
- **Database:** Hosted on Prisma Postgres.
- **Backend:** Currently local only; deployment target to be set up in a later task.

