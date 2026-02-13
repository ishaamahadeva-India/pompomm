# Pom Pomm

**Crowd-powered advertising performance platform** — a performance-based creator marketing system (not a lottery or reward app). Creators earn score through validated views and shares; leaderboards and reward pools are campaign-based.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, ShadCN-style UI (Radix), Framer Motion, Zustand
- **Backend:** Node.js (Express), PostgreSQL (Supabase), Redis, Cloudflare R2 (optional), Cloudflare (rate limiting)

## Quick Start

### Prerequisites

- Node.js 18+
- **Database:** PostgreSQL (local) or [Supabase](https://supabase.com) (free tier; no local Postgres needed)
- **Redis:** recommended **Upstash** (hosted, TLS, free tier)—see [Redis setup](#redis-recommended-upstash) below. Or local `redis-server`.

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env:
#   DATABASE_URL - e.g. postgresql://postgres:YOUR_PASSWORD@localhost:5432/poolmarket
#   Or use Supabase: Project Settings → Database → Connection string (URI)
#   REDIS_URL - e.g. redis://localhost:6379 (or leave default if Redis is local)
npm install
npm run db:migrate   # applies schema.sql to your DB (requires DB running)
npm run db:migrate:enhancements   # run once to add subscriptions, sponsors, leaderboard filters, etc.
npm run dev          # runs on http://localhost:4000
```

**If migrate fails with `ECONNREFUSED 127.0.0.1:5432`:** PostgreSQL is not running or `DATABASE_URL` points to localhost. Either start Postgres locally, or use Supabase and set `DATABASE_URL` to your Supabase project’s connection URI.

### Frontend

From the **project root** (`poolmarket/`):

```bash
cd frontend
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:4000 if needed
npm install
npm run dev          # runs on http://localhost:3000
```

If you’re already in `backend/`, run: `cd ../frontend` first.

### What's next (after backend + frontend are running)

1. **Add sample campaigns** (optional): from `backend/` run `npm run db:seed` to insert two active campaigns.
2. **Redis** (recommended: Upstash): Needed for view rate limiting and leaderboard cache. See [Redis setup](#redis-recommended-upstash) below for the safer hosted option.
3. **Try the app**: http://localhost:3000 → Log in (any 10-digit number) → open a campaign → record views/shares when logged in.

### Production

**Live on Vercel (no custom domain yet):** [https://pompomm-eight.vercel.app](https://pompomm-eight.vercel.app)

**Custom domain (when you add it):** [pompomm.in](https://pompomm.in)

- **Frontend (Vercel):** In your Vercel project, set env vars:
  - `NEXT_PUBLIC_APP_URL` = `https://pompomm-eight.vercel.app` (or `https://pompomm.in` once you add the domain)
  - `NEXT_PUBLIC_API_URL` = your backend API URL (e.g. where your Node/Express backend is hosted)
- **Backend:** Set `FRONTEND_ORIGIN` to your frontend origin(s), e.g. `https://pompomm-eight.vercel.app` or `https://pompomm.in,https://www.pompomm.in`. The backend already allows `pompomm.in`, `www.pompomm.in`, and `pompomm-eight.vercel.app` by default.

#### Deploy backend to Render (fix build failure)

If the build fails with "Exited with status 2":

1. **Root Directory:** In Render → your service → **Settings** → set **Root Directory** to **`backend`** (so Render runs commands inside the backend folder, not the repo root).
2. **Build Command:** Use **`npm install --include=dev && npm run build`** (so TypeScript is installed and the project compiles).
3. **Start Command:** **`npm start`**.
4. **Node version:** Render uses Node 18+ by default; the backend has `"engines": { "node": ">=18" }`.

Then add your env vars (DATABASE_URL, JWT_SECRET, FRONTEND_ORIGIN, etc.) and redeploy.

**Supabase on Render (fix `db: "error"` / ENETUNREACH):** Render cannot use Supabase’s **direct** connection (port 5432). Use the **connection pooler** (port **6543**) instead:
1. In [Supabase](https://supabase.com/dashboard) → your project → **Project Settings** → **Database**.
2. Under **Connection string** choose **Connection pooling** (or **URI** for pooler).
3. Copy the URI that uses port **6543** and host like `aws-0-<region>.pooler.supabase.com` (user is often `postgres.<project-ref>`).
4. Set that URI as **DATABASE_URL** on Render (no need for `?sslmode=require` on the pooler; the code enables SSL for Supabase).

**If POST /auth/login returns 500:**

1. **Environment variables (Render → Environment):** Ensure **DATABASE_URL** (Postgres connection string) and **JWT_SECRET** are set. Add **FRONTEND_ORIGIN** (e.g. `https://pompomm-eight.vercel.app` or your Vercel URL).
2. **Database migrations:** The backend needs tables from migrations (e.g. `users`, `refresh_tokens`). Run them once against the Render Postgres DB:
   - From your machine (with `DATABASE_URL` pointing to the Render DB):  
     `cd backend && npm run db:migrate` then `npm run db:migrate:enhancements` then `npm run db:migrate:distribution` then `npm run db:migrate:profile` then `npm run db:migrate:profile:extended` then `npm run db:migrate:enterprise` then `npm run db:migrate:otp` (and any other migrations if you added more).
   - Or use Render’s **Shell** (if available) from the service and run the same commands there.
3. **OTP login:** Login requires OTP. Run `npm run db:migrate:otp` once. For production SMS, set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` on Render; without them, production send-otp returns 503. In development, OTP is logged to the server console.
4. **Check health:** `GET https://your-backend.onrender.com/health` — if it returns `"db": "error"`, the DB URL is wrong or the DB is unreachable; if `"db": "ok"`, the 500 is likely a missing table (run migrations).

#### Deploy frontend to Vercel (fix 404 NOT_FOUND)

The repo has the app in the **`frontend`** folder. In Vercel:

1. **Project Settings → General → Root Directory:** set to **`frontend`** (so Vercel builds the Next.js app, not the repo root).
2. **Environment variables:** add `NEXT_PUBLIC_APP_URL=https://pompomm-eight.vercel.app` (or your Vercel URL) and `NEXT_PUBLIC_API_URL` = your backend API URL.
3. Redeploy after saving.

If Root Directory is left empty, Vercel will build from the repo root and you’ll get **404 NOT_FOUND** (e.g. `Code: NOT_FOUND ID: bom1::...`) because there’s no Next.js app at the root.

### Redis (recommended: Upstash)

**Safer option:** Use [Upstash Redis](https://upstash.com) (free tier). You get TLS encryption, auth, and no open port on your machine.

1. Go to [console.upstash.com](https://console.upstash.com) and sign up.
2. Create a Redis database (choose a region near you).
3. Open the database → **REST API** or **Connect** → copy the **Redis URL**. It looks like:
   `rediss://default:YOUR_PASSWORD@xxx.upstash.io:6379`
4. In `backend/.env` set:
   ```env
   REDIS_URL=rediss://default:YOUR_PASSWORD@xxx.upstash.io:6379
   ```
   (Use the URL from Upstash as-is; `rediss://` enables TLS.)
5. Restart the backend. View rate limiting and leaderboard cache will use Upstash.

### Optional: Leaderboard sync job (every 10 min)

```bash
cd backend && npm run leaderboard:sync
# Or add to cron: */10 * * * * cd /path/to/backend && npm run leaderboard:sync
```

## Architecture Summary

- **Database:** `users`, `campaigns`, `creatives`, `campaign_views`, `fraud_log` (see `backend/src/db/schema.sql`).
- **View validation:** Logged-in user, ≥7s watch, unique per user per creative, max 30 views per IP per minute (Redis).
- **Engagement score:** `unique_views * 1 + shares * 3`. Leaderboard cached in Redis, TTL 10 min; batch job can refresh cache.
- **Security:** IP rate limiting, device hash in view payload, fraud logging, admin can flag creatives (extend as needed).
- **Cost:** Avoid storing every view log forever; archive/aggregate after 30 days; use Redis for counters; compress uploads.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/login | Login (mobile); returns user + token |
| GET | /auth/me | Current user (Bearer token) |
| GET | /campaigns | List campaigns (query: status, category) |
| GET | /campaigns/:id | Campaign detail |
| GET | /campaigns/:id/creatives | Creatives for campaign |
| POST | /creative/upload | Upload creative (auth, multipart) |
| POST | /creative/view | Record view (auth, body: creative_id, watched_seconds, device_hash) |
| POST | /creative/share | Record share (auth, body: creative_id) |
| GET | /leaderboard/:campaignId | Leaderboard (optional auth to highlight current user) |

## License

Proprietary.
