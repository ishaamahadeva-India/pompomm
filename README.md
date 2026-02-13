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

### Production (pompomm.in)

**Domain:** [pompomm.in](https://pompomm.in)

- **Frontend:** Set `NEXT_PUBLIC_APP_URL=https://pompomm.in` and `NEXT_PUBLIC_API_URL` to your API URL (e.g. `https://api.pompomm.in`) in `frontend/.env.local` (or your host’s env).
- **Backend:** Set `FRONTEND_ORIGIN=https://pompomm.in,https://www.pompomm.in` so CORS allows the production frontend. `pompomm.in` and `www.pompomm.in` are already in the default allowed origins.

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
