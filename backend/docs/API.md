# Poolmarket API

Formal contract: **OpenAPI 3.0** is served at `GET /openapi.json` (e.g. `http://localhost:4000/openapi.json`). Use it with Swagger UI, Postman, or any OpenAPI-compatible client.

## Overview

- **Base:** `http://localhost:4000` (or `PORT` env)
- **Auth:** JWT in `Authorization: Bearer <token>` or cookies `accessToken` / `refreshToken`
- **Errors:** JSON `{ "error": "message" }` with status 4xx/5xx

## Main areas

| Area | Prefix | Description |
|------|--------|-------------|
| Health | `GET /health` | Liveness check |
| Auth | `/auth` | Login, refresh, logout, `GET/PATCH /auth/me` |
| Campaigns | `/campaigns` | List campaigns (direct_ad, sponsored_knowledge) |
| Distribution | `/distribution` | Public: list/get campaigns; auth: stats, tracking link, track |
| Leaderboard | `/leaderboard/:campaignId` | Entries + current user rank (optional auth) |
| Subscription | `/subscription` | Plans, subscribe, status |
| Creatives | `/creative` | Upload, record view/share/like |
| Brand | `/brand` | Brand dashboard (distribution campaigns owned by brand) |
| Admin | `/admin` | Overview, campaigns, distribution, users, fraud, exports (admin only) |

## OpenAPI

Fetch the spec:

```bash
curl http://localhost:4000/openapi.json
```

Import `http://localhost:4000/openapi.json` into [Swagger Editor](https://editor.swagger.io) or [Swagger UI](https://www.npmjs.com/package/swagger-ui-express) for interactive docs.
