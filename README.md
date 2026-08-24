# QuantaFONS - Online Counselling Platform

A modern web-based counselling platform enabling visitors to browse counsellors, book sessions, pay online, select timezone-aware appointment slots, download PDF receipts, and join automated video consultations. Includes a comprehensive Counsellor Admin Portal for schedule, session, and profile management.

---

## Project Structure

```
/client   → Frontend (Next.js 16, React 19, Tailwind CSS, App Router)
/server   → Backend (Node.js, Express, Prisma ORM, PostgreSQL, Razorpay SDK)
README.md
```

---

## Tech Stack

### **Frontend**
- **Framework**: Next.js 16 (App Router) + React 19
- **Styling**: Tailwind CSS + Custom CSS Variables & Design System Tokens (`--color-paper`, `--color-sage`, `--color-ink`, `--color-amber`)
- **Icons & Animation**: Custom SVG System, Glassmorphism, Micro-animations (`animate-fade-in`, `stagger-*`)

### **Backend / Database**
- **Runtime & Server**: Node.js + Express.js
- **ORM**: Prisma ORM (v7) + Prisma Postgres (`@prisma/adapter-pg` driver adapter)
- **Database**: PostgreSQL
- **Dev Tooling**: `tsx` (TypeScript execution), `dotenv-cli`, `cors`

### **Payments & Receipts**
- **Gateway**: Razorpay SDK (Order Creation, Webhook Signature Verification, Client Signature Verification)
- **Receipts**: Custom HTML/PDF Receipt Engine (`REC-2026-XXXX`)

---

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
```env
DATABASE_URL="postgres://..."
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
RAZORPAY_WEBHOOK_SECRET="..."
PORT=4000
```

### 4. Seed the database
```bash
cd server
# Seed Counsellor records
npx dotenv-cli -e .env -- npx tsx prisma/seed.ts

# Seed 7 days of availability slots (stored as UTC)
npx dotenv-cli -e .env -- npx tsx prisma/seed-availability.ts
```

### 5. Run the backend
```bash
cd server
npx tsx index.ts
```
Runs on `http://localhost:4000`

### 6. Run the frontend
```bash
cd client
npm run dev
```
Visit `http://localhost:3000`

---

## Application Features & Key Routes

### **Visitor Portal**
- **Home Page (`/`)**: Overview of counselling services, process steps, and counsellor highlights.
- **Directory (`/directory` & `/directory/[id]`)**: Filterable directory and detailed profile view with bios, fees, and languages.
- **Checkout (`/checkout`)**: Step 1 & 2 details form with integrated Razorpay modal checkout, success/failed/abandoned payment banners.
- **Slot Picker (`/booking`)**: Timezone-aware slot selector grouped by date and time band (Morning, Afternoon, Evening) with atomic slot locking.
- **Booking Manager (`/booking/manage`)**: Visitor self-service portal for viewing receipts, downloading PDF receipts, rescheduling, and cancelling sessions within policy limits (24-hour advance notice window).
- **Session Room (`/session`)**: Video call room interface for consultations.

### **Counsellor Admin Panel (`/counsellor/dashboard`)**
- **Secure 2FA Login (`/counsellor/login`)**: Email & Password authentication + 6-digit TOTP verification step.
- **Overview & Earnings**: Analytics cards for total revenue, MTD income, session stats, and payment breakdown table.
- **Availability Management**: Add single slots, apply recurring weekly schedule patterns (Mon–Fri), block dates for leave, and withdraw unbooked slots.
- **Sessions & Calendar View**: Filter upcoming/past sessions with direct "Access Video Room" links.
- **Private Session Notes**: Encrypted, confidential clinical note drawer per booking.
- **Profile Management**: Update biography, fee, specialisations, languages, and photo with a "Pending Platform Administrator Approval" state.

---

## API Reference

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/counsellors` | List all approved counsellors |
| `GET` | `/api/counsellors/:id` | Get single counsellor profile |
| `GET` | `/api/counsellors/:id/availability?tz=...` | Timezone-aware unbooked availability slots (enforces 2-hour minimum notice & 15-min buffer) |
| `POST` | `/api/payments/create-order` | Create Razorpay order & PENDING booking |
| `POST` | `/api/payments/verify` | Verify client payment HMAC signature & confirm booking |
| `POST` | `/api/payments/webhook` | Webhook verification for `payment.captured` |
| `POST` | `/api/payments/mark-failed` | Mark failed payment and update booking status to CANCELLED |
| `POST` | `/api/availability/hold` | Place 10-minute temporary hold on a slot during checkout |
| `POST` | `/api/availability/release-hold` | Release temporary slot hold |
| `PATCH` | `/api/bookings/:id/slot` | Lock chosen availability slot and confirm booking |
| `GET` | `/api/bookings/:id/receipt` | Downloadable / viewable PDF receipt (`REC-2026-XXXX`) |
| `POST` | `/api/bookings/:id/cancel` | Visitor self-service cancellation (respecting 24h policy) |
| `POST` | `/api/bookings/:id/reschedule` | Visitor self-service rescheduling (respecting 24h policy) |
| `POST` | `/api/counsellor/auth/login` | Counsellor 2FA step 1 login |
| `POST` | `/api/counsellor/auth/verify-2fa` | Counsellor 2FA step 2 verification |
| `GET` | `/api/counsellor/availability` | Counsellor slot management list |
| `POST` | `/api/counsellor/availability/recurring` | Apply recurring weekly schedule pattern |
| `POST` | `/api/counsellor/availability/block-date` | Block date for leave & remove unbooked slots |
| `GET` | `/api/counsellor/sessions` | Counsellor session calendar with video room links |
| `GET`/`POST` | `/api/counsellor/sessions/:id/notes` | Private clinical session notes |
| `PUT` | `/api/counsellor/profile` | Update profile (triggers admin approval state) |
| `GET` | `/api/counsellor/earnings` | Financial summary & transaction breakdown |

---

## Progress & Feature Log

| Task | Module | Status |
|---|---|---|
| **T-001** | Repository & Environment Config | ✅ Completed |
| **T-002** | Data Models (Counsellor, Availability, Booking, Payment) | ✅ Completed |
| **T-003** | Counsellor Database Seeding | ✅ Completed |
| **T-004** | Booking Steps Layout & Navigation | ✅ Completed |
| **T-005** | Directory & Profile Pages | ✅ Completed |
| **T-006** | Visitor Details Form & Validation | ✅ Completed |
| **T-007** | Razorpay Order Creation & Webhook Signature Verification | ✅ Completed |
| **T-008** | Gateway Checkout (Success, Failure, Abandonment Handling) | ✅ Completed |
| **T-009** | Availability API with Timezone Conversion (`Intl`) | ✅ Completed |
| **T-010** | Slot Picker (Day/Period Grouping & Booking Confirmation) | ✅ Completed |
| **3.6** | Counsellor Admin Panel (2FA, Schedule, Notes, Profile, Earnings) | ✅ Completed |
| **Engine** | PDF Receipt Generator & Download (`/receipt`) | ✅ Completed |
| **Engine** | 10-Minute Temporary Slot Hold & Release Engine | ✅ Completed |
| **Engine** | Minimum Notice Period (2 hours) & 15-Min Session Buffer | ✅ Completed |
| **Engine** | Visitor Self-Service Booking Manager (24h Policy Reschedule/Cancel) | ✅ Completed |
| **Engine** | Dual Client-Server Payment Signature Verification (`/payments/verify`) | ✅ Completed |
