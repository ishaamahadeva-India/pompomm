# Poolmarket — Knowledge Transfer: Features Developed

**Purpose:** Single reference of all features implemented for handover/KT.  
**Stack:** Backend (Node/Express, PostgreSQL, Redis), Frontend (Next.js 14, React 18, Tailwind).

---

## 1. Authentication & Users

### Backend
- **Login** `POST /auth/login` — Mobile number + OTP (demo: any 10-digit); optional `device_hash`; returns user, accessToken, refreshToken, expiresIn; sets httpOnly cookies.
- **Refresh** `POST /auth/refresh` — Refresh token in body or cookie; issues new access + refresh.
- **Logout** `POST /auth/logout` — Clears cookies / invalidates refresh token.
- **Profile** `GET /auth/me` — Current user (auth required).
- **Update profile** `PATCH /auth/me` — display_name, unique_creator_id, age, gender, email, address, city, state, pincode, occupation, hobbies, brands_liked, bio (Zod-validated; text fields sanitized for HTML/control chars).
- JWT access (7d) + refresh (30d); role in token; legacy token support with one-time role lookup so admin routes avoid extra DB.

### Frontend
- **Login** `/login` — Mobile input, demo OTP; device hash; stores tokens (Zustand); redirect to `/`.
- **Auth refresh** — `AuthRefreshProvider` refreshes token before expiry.
- **Header** — Log in / Log out; links to Profile, Distribution, Subscription; Creator tier badge; Admin/Brand link for admins.

---

## 2. Campaigns (Direct Ad / Sponsored Knowledge)

### Backend
- **List** `GET /campaigns` — Query: `status`, `category` (direct_ad | sponsored_knowledge).
- **Get one** `GET /campaigns/:id`.
- **Creatives** `GET /campaigns/:id/creatives` — Creatives for campaign.

### Frontend
- **Dashboard** `/` — Hero campaign, tabs (Direct Ad, Sponsored Knowledge), campaign cards, leaderboard preview; profile-completion banner; links to campaign detail.
- **Campaign detail** `/campaign/:id` — Campaign info, creatives, CTA to participate.

---

## 3. Creatives (Upload, View, Share, Like)

### Backend
- **Upload** `POST /creative/upload` — Auth + active subscription; multer + sharp; media stored (local or R2); invalidates leaderboard cache.
- **View** `POST /creative/view` — Records view (min watch seconds); IP rate limit (Redis or fail-open); fraud log on rate limit.
- **Share** `POST /creative/share` — Records share.
- **Like** `POST /creative/like` — Records like.

### Frontend
- Used from campaign detail and dashboard (view/share/like flows).

---

## 4. Leaderboard

### Backend
- **By campaign** `GET /leaderboard/:campaignId` — Entries + currentUserRank; optional auth; cache from Redis (fallback: DB when Redis down).
- **Export** `GET /leaderboard/export` — Export support (optional auth).
- **Service** — Aggregates from creatives/engagement; Redis cache with TTL.

### Frontend
- **Leaderboard** `/leaderboard/[campaignId]` — Ranks, scores; not-found handling.

### Jobs
- **leaderboard:sync** — Refreshes leaderboard cache (e.g. cron).

---

## 5. Subscription

### Backend
- **Status** `GET /subscription/status` — Current user subscription state.
- **Activate** `POST /subscription/activate` — Activate subscription (e.g. plan selection).
- Middleware `requireSubscription` — Used for creative upload/view/share/like.

### Frontend
- **Subscription** `/subscription` — Plans, activate, status.

---

## 6. Distribution (Verified Performance Campaigns)

### Backend (public + auth)
- **List** `GET /distribution/campaigns` — Active campaigns (status, end_time); public.
- **Get** `GET /distribution/campaigns/:id` — Single campaign; public.
- **Stats** `GET /distribution/campaigns/:id/stats` — Creator stats for campaign (auth); get-or-create row in creator_distribution_stats.
- **Budget** `GET /distribution/campaigns/:id/budget-status` — Budget/spend for campaign.
- **Tracking link** `GET /distribution/campaigns/:id/tracking-link` — User’s referral link (auth; requires unique_creator_id).
- **Track** `POST /distribution/track` — Referral event (view/like/share); optional auth; IP rate limit; min watch seconds; dedup by Redis (or skip if Redis down); writes referral_tracking; aggregates creator_distribution_stats.

### Business logic (backend)
- **Payout model** — fixed_milestone (per 100 views) or tier_based (tier_config).
- **Earnings** — `payoutEngine.recalculateCreatorEarnings`: engagement floor 15%, velocity dampener, tier cap × CRS cap (CRS ≥ 85: +10% cap; CRS < 35: 50% cap), tier payout multiplier.
- **Approval** — `payoutApproval.approvePayout`: budget check, engagement floor hold, CRS hold (CRS < 25 → held, reason `low_crs`), CRS 25–40 → 20% reduction, geo diversity (milestone), cooldown (max N campaigns per 7 days), 6h milestone delay; deducts budget, writes cooldown.

### Frontend
- **Distribution list** `/distribution` — List of active distribution campaigns; retry + error message on load fail.
- **Distribution detail** `/distribution/[id]` — Campaign, tracking link (auth), stats, track view/like/share.

### Admin (distribution)
- **List** `GET /admin/distribution/campaigns` — All distribution campaigns.
- **Create** `POST /admin/distribution/campaigns` — Presets (starter, growth, boost) or custom; platform margin, fraud buffer; title/description/sponsor sanitized.
- **Stats** `GET /admin/distribution/campaigns/:id/stats` — Creator stats table.
- **Payout** `PATCH /admin/distribution/campaigns/:id/stats/:userId/payout` — Set payout_status (pending/approved/held/paid); runs approval logic.
- **Export** `GET /admin/distribution/export/:id` — CSV export.

### Jobs
- **distribution:payout** — Batch payout job (if used).
- **distribution:archive** — Archive old referral_tracking (e.g. 30 days).
- **analytics:daily** — Campaign analytics daily aggregation.

---

## 7. Creator Reliability Score (CRS)

### Backend
- **Table** `creator_crs` — user_id (PK), engagement_quality_score, geo_diversity_score, fraud_modifier_score, stability_score, crs_score, last_updated.
- **Formula** — EQS 40% (min(100, avg engagement rate × 2)), GDS 25% (distinct states / 10 × 100, cap 100), FSM 25% (100 − avg fraud score), SS 10% (100 − stddev engagement); weighted sum clamped 0–100; last 5 completed distribution campaigns; divide-by-zero safe.
- **Cache** — Redis `crs:user:{user_id}` TTL 30 min; on payout: read from Redis, else DB; no CRS calculation in request path.
- **Payout use** — CRS < 25 → hold + fraud_log reason `low_crs`; 25 ≤ CRS < 40 → 20% payout reduction; CRS ≥ 85 → +10% payout cap; CRS < 35 → 50% cap reduction.

### Jobs
- **crs:update** — Creators with activity in last 7 days; recalc CRS; upsert creator_crs; update Redis cache.

### Admin
- **User detail** `GET /admin/users/:id` — Includes CRS and component scores.
- **Frontend** — Admin user detail shows CRS and breakdown; not exposed on brand dashboard.

---

## 8. Creator Tiers (Auto + Admin)

### Backend
- **Table** `creator_tier_history` — id, user_id, old_tier, new_tier, reason (crs_promotion | crs_demotion | admin_override), crs_score, changed_at.
- **Rules** — CRS ≥ 85: promote one tier (Bronze→Silver→Silver→Gold; never auto to Verified); 70–85: maintain; 50–70: freeze; 35–50: demote one (Verified→Gold only); CRS < 35: to Bronze (Verified→Gold only). Verified only set by admin; Verified never auto-demoted below Gold.
- **Config** — `ENABLE_AUTO_TIER_SYSTEM` (default true) to enable/disable auto tier updates.
- **Payout** — Tier cap multiplier (bronze 1, silver 1.25, gold 1.5, verified 2); combined with CRS cap adjustments above.

### Jobs
- **creator:tier-update** — Users with CRS updated in last 7 days; at most one tier change per user per run; insert creator_tier_history; optional log for promotion/demotion notifications.

### Admin
- **User detail** — Current tier, CRS, last 5 tier history rows.
- **Override** `PATCH /admin/users/:id/tier` — Set creator_tier (bronze/silver/gold/verified); records admin_override in creator_tier_history.

### Frontend
- **Admin user detail** `/admin/users/[id]` — Tier, CRS, tier history table, tier override dropdown + Save.

---

## 9. Fraud & Safety

### Backend
- **Fraud log** — fraud_log table (event_type, campaign_id, user_id, reason, fraud_score, ip_concentration, device_duplication_rate, spike_delta, geo_distribution_summary, etc.).
- **Holds** — Low engagement rate, low CRS, low geo diversity, velocity spike adjustment; reasons stored in fraud_log.
- **Fraud scoring** — `fraudScoring` service + batch job for distribution campaigns (IP/device/geo metrics).
- **Rate limits** — Global (e.g. 120/min); view and distribution IP rate limits (Redis or fail-open when Redis down).

### Jobs
- **fraud:batch** — Fraud scoring batch for distribution.

### Admin
- **Fraud list** `GET /admin/fraud` — Recent fraud events.
- **Fraud analytics** `GET /admin/fraud-analytics` — Distribution fraud with factor breakdown (optional campaignId).

### Frontend
- **Admin fraud** `/admin/fraud` — Fraud events list.

---

## 10. Brand Dashboard

### Backend
- **Dashboard** `GET /brand/:campaignId/dashboard` — Auth (brand_admin or admin); campaign ownership check; stats, creators, budget.
- **Export** `GET /brand/:campaignId/export` — CSV export for brand’s campaign.

### Frontend
- Brand links in header for brand_admin; dashboard/export consumed via API.

---

## 11. Admin Panel

### Backend (all under authMiddleware + requireAdmin)
- **Overview** `GET /admin/overview` — Counts (users, subscriptions, campaigns, creatives, fraud 7d), revenue.
- **Campaigns** — List, create, patch; sponsors list/add (legacy campaigns).
- **Users** — List (search), user detail (with CRS + tier_history), tier override, suspend.
- **Distribution** — As in §6 (list, create, stats, payout, export).
- **Fraud** — As in §9.
- **Exports** — Campaign export, distribution export (CSV).

### Frontend
- **Layout** `/admin` — Admin-only layout; nav: Overview, Campaigns, Distribution, Users, Fraud.
- **Overview** `/admin` — Metrics + admin URL instructions.
- **Campaigns** `/admin/campaigns` — List, create, edit.
- **Distribution** `/admin/distribution` — List, create; **Distribution detail** `/admin/distribution/[id]` — Stats table, payout actions per creator, export CSV.
- **Users** `/admin/users` — Table, search, link to user detail.
- **User detail** `/admin/users/[id]` — Profile, CRS, tier history, tier override.
- **Fraud** `/admin/fraud` — Fraud events.

---

## 12. Infrastructure & Cross-Cutting

### Backend
- **Health** `GET /health` — { status, ts }.
- **OpenAPI** `GET /openapi.json` — OpenAPI 3.0 spec for KT/contract.
- **Docs** `backend/docs/API.md` — High-level API overview and how to use openapi.json.
- **DB** — PostgreSQL; migrations 001–010 (enhancements, distribution, profile, profile extended, enterprise, small-brand, payout-profit-fraud, creator_crs, creator_tier_history).
- **Redis** — Optional; leaderboard + CRS cache; rate-limit counters; fallback behaviour documented in `lib/redis.ts` (DB fallback when Redis down; rate limits fail open).
- **Auth** — JWT (Bearer or cookies); requireAdmin/requireBrandAdmin use role from token (no extra DB for admin check).
- **Validation** — Zod on auth, profile, admin campaign/distribution bodies.
- **Sanitization** — `lib/sanitize.ts`; applied to profile text fields and admin campaign/distribution title, description, sponsor.
- **Errors** — Central errorHandler; AppError for 4xx; 500 with safe message.
- **CORS** — Allowed origins from env (e.g. localhost:3000).
- **Rate limit** — express-rate-limit global.

### Frontend
- **App** — Next.js 14 App Router; dark theme; shared layout (Header + AuthRefreshProvider).
- **State** — Zustand (auth store: user, token, refreshToken).
- **UI** — Tailwind; glass-card; Radix (Tabs, Dialog, etc.); Button variants; Skeleton; CreatorTierBadge.
- **API** — `API_BASE` from env; fetch with Bearer token; refresh on 401 where applicable.

---

## 13. NPM Scripts (Backend) — Quick Reference

| Script | Purpose |
|--------|--------|
| `npm run dev` | Start API (tsx watch) |
| `npm run build` | Compile TypeScript |
| `npm run db:migrate` | Run base migrations |
| `npm run db:migrate:distribution` | Distribution tables |
| `npm run db:migrate:creator-crs` | creator_crs table |
| `npm run db:migrate:creator-tier-history` | creator_tier_history table |
| `npm run db:seed` | Seed DB |
| `npm run leaderboard:sync` | Refresh leaderboard cache |
| `npm run crs:update` | Recompute CRS for active creators |
| `npm run creator:tier-update` | Apply CRS-based tier promotions/demotions |
| `npm run fraud:batch` | Fraud scoring batch |
| `npm run analytics:daily` | Campaign analytics daily |
| `npm run distribution:archive` | Archive old referral_tracking |
| `npm run prune:logs` | Prune old logs (retention from env) |

---

## 14. Environment (Backend) — Key Variables

- `PORT` — API port (default 4000).
- `DATABASE_URL` — PostgreSQL connection string.
- `REDIS_URL` — Optional; default redis://localhost:6379; cache/rate limits degrade gracefully if missing/wrong.
- `JWT_SECRET` — Signing secret for access/refresh tokens.
- `FRONTEND_ORIGIN` — CORS (e.g. http://localhost:3000).
- `ENABLE_AUTO_TIER_SYSTEM` — true/false for CRS-based tier job.
- `UPLOAD_DIR`, `R2_PUBLIC_URL` — Creative uploads.
- `LOG_RETENTION_DAYS` — For prune:logs.

---

This document reflects the feature set as implemented for KT. For API contract details, use `GET /openapi.json` and `backend/docs/API.md`.
