# QuantaFONS — Online Counselling Platform

A web-based counselling platform enabling visitors to browse counsellors, book sessions, pay online, and join automated video consultations.

## Project Structure

```
/client   → Frontend (Next.js)
/server   → Backend (Node.js, Prisma, PostgreSQL)
README.md
```

## Tech Stack

**Frontend**
- Next.js (App Router)

**Backend / Database**
- Prisma ORM (v7)
- Prisma Postgres (hosted DB via Accelerate)
- `@prisma/adapter-pg` + `pg` — required driver adapter for DB connection in Prisma 7
- Node.js + Express

**Dev Tooling**
- `tsx` — TypeScript execution
- `dotenv` — environment variable loading
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

Copy `.env.example` to `.env` in `/server` and fill in your database connection string:
```
DATABASE_URL="your-connection-string-here"
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

### 6. Run the frontend locally
```bash
cd client
npm run dev
```
Visit `http://localhost:3000`

## Database Schema

Four core models:
- **Counsellor** — profile, fee, specialisation, languages
- **Availability** — published hours per counsellor
- **Booking** — visitor booking against a counsellor + time slot
- **Payment** — payment record linked to a booking

**Key constraint:** `@@unique([counsellorId, startTime])` on both `Availability` and `Booking` — enforced at the database level to prevent two visitors from booking the same hour.

### Known Setup Notes (Prisma 7)
- `datasource.url` can no longer be set directly in `schema.prisma` — must be configured in `prisma.config.ts`.
- Seed command config moved from `package.json` to `prisma.config.ts` under `migrations.seed`.
- A driver adapter (`@prisma/adapter-pg`) is now required to instantiate `PrismaClient`.


