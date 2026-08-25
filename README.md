# Whybeigh — Online Counselling Platform

A modern, production-ready web counselling platform enabling visitors to browse verified counsellors, book online sessions, pay securely via Razorpay, select timezone-aware appointment slots, view interactive receipts, download PDF receipts, and join video consultations. Features a full Counsellor Admin Portal with 2FA authentication, recurring schedule generator, block date tools, private clinical notes, search, pagination, payment method analytics, and Render cloud deployment readiness.

---

## Project Structure

```
/client   → Frontend (Next.js 16, React 19, Tailwind CSS, App Router)
/server   → Backend (Node.js, Express, Prisma ORM, Supabase / Postgres, Razorpay SDK)
README.md
```

---

## Tech Stack & Architecture

### **Frontend**
- **Framework**: Next.js 16 (App Router) + React 19
- **Styling**: Vanilla CSS Variables + Tailwind CSS (`--color-paper`, `--color-sage`, `--color-ink`, `--color-amber`)
- **UI Design System**: Clean typography without emojis, glassmorphic cards, responsive modals, smooth micro-animations (`animate-fade-in`, `animate-scale-up`).
- **State & Search**: Instant client-side filtering, debounced search inputs, and page-based pagination controls across all dashboard sections.

### **Backend & Database**
- **Runtime & Framework**: Node.js + Express.js
- **Database**: Cloud PostgreSQL on **Supabase / Prisma Postgres**
- **ORM**: Prisma ORM (v7) with `@prisma/adapter-pg` driver adapter
- **Dev Tooling**: `tsx` (TypeScript runner), `dotenv-cli`, `cors`

### **Payments & Receipts**
- **Gateway**: Razorpay SDK (Order Creation, HMAC SHA256 Webhook Signature Verification, Client Signature Verification)
- **Payment Method Tracking**: Accurately registers payment modes (`Card`, `UPI`, `Netbanking`, `Wallet`) passed dynamically during checkout verification.
- **Receipt Engine**: Custom HTML/PDF Receipt Generator (`REC-2026-XXXX`)

---

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/dhruvquantafons/counselling-platform.git
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

**Backend Environment Variables (`/server/.env`):**
```env
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
RAZORPAY_WEBHOOK_SECRET="..."
PORT=4000
```

**Frontend Environment Variables (`/client/.env.local`):**
```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

### 4. Database Setup & Migrations
```bash
cd server

# Run Prisma schema migrations
npx dotenv-cli -e .env -- npx prisma migrate dev

# Seed Counsellor profiles
npx dotenv-cli -e .env -- npx tsx prisma/seed.ts

# Seed 7 days of timezone-aware availability slots
npx dotenv-cli -e .env -- npx tsx prisma/seed-availability.ts
```

### 5. Run locally

**Start Backend API Server:**
```bash
cd server
npx tsx index.ts
```
*Backend runs on `http://localhost:4000`*

**Start Frontend Web App:**
```bash
cd client
npm run dev
```
*Frontend runs on `http://localhost:3000`*

---

## Render Cloud Deployment Guide

The application is configured for deployment on [Render](https://render.com) as two separate web services connected to Supabase PostgreSQL:

### 1. Backend Service (`counselling-platform`)
- **Root Directory**: `server`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`
- **Environment Variables**:
  - `DATABASE_URL`: Your Supabase connection string
  - `RAZORPAY_KEY_ID`: Razorpay Key ID
  - `RAZORPAY_KEY_SECRET`: Razorpay Secret
  - `RAZORPAY_WEBHOOK_SECRET`: Razorpay Webhook Secret
  - `PORT`: `10000`

### 2. Frontend Service (`counselling-platform-frontend`(https://counselling-platform-frontend.onrender.com))
- **Root Directory**: `client`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL`: Your live backend service URL (e.g. `https://counselling-platform.onrender.com` — *no trailing slash*)

> [!IMPORTANT]
> Next.js inlines `NEXT_PUBLIC_*` environment variables at **build time**. When setting `NEXT_PUBLIC_API_URL` on Render, click **Manual Deploy → Clear build cache & deploy** to bake in the live API URL.

---

## Application Features & Key Routes

### **Visitor Portal**
- **Home Page (`/`)**: Brand landing page highlighting Whybeigh counselling services, workflow, and counsellor directory.
- **Directory (`/directory` & `/directory/[id]`)**: Filterable counsellor list and profile pages displaying specialisations, fees, and languages.
- **Checkout (`/checkout`)**: Visitor details form with integrated Razorpay modal checkout and automated status banner states.
- **Slot Picker (`/booking`)**: Timezone-aware slot selector grouped by day and time band (Morning, Afternoon, Evening) with 10-minute hold logic.
- **Booking Manager (`/booking/manage`)**: Visitor self-service portal to view booking details, download PDF receipts, reschedule, or cancel sessions (enforces 24-hour advance policy).
- **Session Room (`/session`)**: Integrated video consultation room interface.

### **Counsellor Admin Panel (`/counsellor/dashboard`)**
- **Secure 2FA Login (`/counsellor/login`)**: Email & Password login + 6-digit TOTP verification code (`123456`).
- **Overview & Earnings**: Metrics summary (Total Revenue, MTD Income, Completed/Upcoming stats) + **Earnings & Payment Breakdown Table** with search, pagination (5 items/page), and **Mode of Payment** tracking (`Card`, `UPI`, `Netbanking`, `Wallet`).
- **Transaction & Receipt Modal**: Clickable breakdown rows opening an interactive modal displaying transaction reference IDs, client contact details, payment mode, and a direct button to **View / Download PDF Receipt**.
- **Availability & Schedule**: Publish single slots, generate recurring weekly pattern schedules (Mon–Fri), block dates for leave, and withdraw unbooked slots. Features search & 9-item pagination.
- **Sessions & Calendar**: Filter upcoming and past sessions with direct video call access links. Features search & 6-item pagination.
- **Private Session Notes**: Encrypted, confidential clinical session note editor per booking.
- **Profile Management**: Update biography, session fee, specialisations, languages, and photo URL with a "Pending Platform Administrator Approval" workflow.

---

## API Reference

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/counsellors` | List all approved counsellors |
| `GET` | `/api/counsellors/:id` | Get single counsellor profile |
| `GET` | `/api/counsellors/:id/availability?tz=...` | Timezone-aware unbooked availability slots (2-hour minimum notice & 15-min buffer) |
| `POST` | `/api/payments/create-order` | Create Razorpay order & PENDING booking |
| `POST` | `/api/payments/verify` | Verify client payment HMAC signature, record payment method (`Card`, `UPI`, etc.), and confirm booking |
| `POST` | `/api/payments/webhook` | Webhook verification for `payment.captured` |
| `POST` | `/api/payments/mark-failed` | Mark payment as failed & set booking to CANCELLED |
| `POST` | `/api/availability/hold` | Place temporary 10-minute hold on a slot during checkout |
| `POST` | `/api/availability/release-hold` | Release temporary slot hold |
| `PATCH` | `/api/bookings/:id/slot` | Lock chosen slot and confirm booking |
| `GET` | `/api/bookings/:id/receipt` | Generate & download PDF receipt (`REC-2026-XXXX`) |
| `POST` | `/api/bookings/:id/cancel` | Visitor self-service session cancellation (24h policy) |
| `POST` | `/api/bookings/:id/reschedule` | Visitor self-service session rescheduling (24h policy) |
| `POST` | `/api/counsellor/auth/login` | Counsellor 2FA step 1 login |
| `POST` | `/api/counsellor/auth/verify-2fa` | Counsellor 2FA step 2 verification |
| `GET` | `/api/counsellor/availability` | Counsellor slot management list |
| `POST` | `/api/counsellor/availability/recurring` | Apply recurring weekly schedule pattern |
| `POST` | `/api/counsellor/availability/block-date` | Block date for leave & remove unbooked slots |
| `GET` | `/api/counsellor/sessions` | Counsellor session calendar with video room links |
| `GET`/`POST` | `/api/counsellor/sessions/:id/notes` | Private clinical session notes |
| `PUT` | `/api/counsellor/profile` | Update profile (triggers admin approval state) |
| `GET` | `/api/counsellor/earnings` | Financial summary & breakdown with payment method analytics |

---

## Progress & Feature Log

| Module / Requirement | Description | Status |
|---|---|---|
| **Deployment** | Render deployment setup with build/start scripts and environment variables | ✅ Completed |
| **Database Migration** | Supabase PostgreSQL migration & Prisma schema alignment | ✅ Completed |
| **Search Engine** | Real-time search in Overview, Availability, and Sessions tabs | ✅ Completed |
| **Pagination Controls** | Multi-page pagination controls with item counters across dashboard tabs | ✅ Completed |
| **Payment Mode Tracking** | Dynamic capture and display of `Card`, `UPI`, `Netbanking`, and `Wallet` modes | ✅ Completed |
| **Transaction Modal** | Interactive breakdown modal with client details & PDF receipt trigger | ✅ Completed |
| **Razorpay Verification** | Dual client-server signature verification (`/payments/verify`) | ✅ Completed |
| **Visitor Portal** | Self-service booking management portal (24h policy reschedule & cancel) | ✅ Completed |
| **PDF Receipt Engine** | Printable HTML/PDF receipt generator (`REC-2026-XXXX`) | ✅ Completed |
| **Design System** | Clean, emoji-free typography with custom CSS variables & tokens | ✅ Completed |
