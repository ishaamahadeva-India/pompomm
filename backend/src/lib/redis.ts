/**
 * Redis client and cache helpers.
 *
 * FALLBACK WHEN REDIS IS DOWN OR MISCONFIGURED:
 * - Leaderboard: getLeaderboardFromCache returns null → callers must read from DB.
 * - CRS: getCRSFromCache returns null → crsEngine.getCRSForPayout reads from creator_crs table.
 * - Rate limits (view/distribution IP): checkIpViewRate/checkDistributionIpRate return allowed: true (fail open).
 * - Distribution view dedup: Redis get/setex skipped; view may be counted more than once until Redis is fixed.
 * All cache/rate-limit operations are wrapped in try/catch so the app never throws on Redis errors.
 */
import Redis from "ioredis";

let client: Redis | null = null;
let lastRedisErrorLog = 0;
const REDIS_ERROR_LOG_INTERVAL_MS = 60_000;

export function getRedisClient(): Redis {
  if (!client) {
    const url = process.env.REDIS_URL || "redis://localhost:6379";
    client = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      tls: url.startsWith("rediss://") ? { rejectUnauthorized: true } : undefined,
    });
    client.on("error", (e) => {
      const now = Date.now();
      if (now - lastRedisErrorLog >= REDIS_ERROR_LOG_INTERVAL_MS) {
        lastRedisErrorLog = now;
        if (process.env.NODE_ENV === "production") {
          console.error("Redis error (cache disabled until fixed):", e.message);
        }
      }
    });
  }
  return client;
}

/** Returns cached leaderboard or null on miss/error. Caller should fall back to DB when null. */
export async function getLeaderboardFromCache(campaignId: string): Promise<LeaderboardEntry[] | null> {
  try {
    const r = getRedisClient();
    const raw = await r.get(`leaderboard:${campaignId}`);
    if (!raw) return null;
    return JSON.parse(raw) as LeaderboardEntry[];
  } catch {
    return null;
  }
}

/** Writes leaderboard to cache. No-op on Redis error (fallback: DB is source of truth). */
export async function setLeaderboardCache(campaignId: string, entries: LeaderboardEntry[], ttlSeconds = 900): Promise<void> {
  try {
    const r = getRedisClient();
    await r.setex(`leaderboard:${campaignId}`, ttlSeconds, JSON.stringify(entries));
  } catch {
    // cache write failed; app continues without cache
  }
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_id: string;
  unique_creator_id?: string;
  total_score: number;
  unique_views: number;
  total_likes?: number;
  shares: number;
}

const CRS_CACHE_TTL = 30 * 60; // 30 minutes

export type CRSCachePayload = {
  crs_score: number;
  engagement_quality_score: number;
  geo_diversity_score: number;
  fraud_modifier_score: number;
  stability_score: number;
};

/** Returns cached CRS or null on miss/error. crsEngine.getCRSForPayout falls back to creator_crs table. */
export async function getCRSFromCache(userId: string): Promise<CRSCachePayload | null> {
  try {
    const r = getRedisClient();
    const raw = await r.get(`crs:user:${userId}`);
    if (!raw) return null;
    return JSON.parse(raw) as CRSCachePayload;
  } catch {
    return null;
  }
}

/** Writes CRS to cache. No-op on Redis error (fallback: DB read in getCRSForPayout). */
export async function setCRSCache(userId: string, payload: CRSCachePayload): Promise<void> {
  try {
    const r = getRedisClient();
    await r.setex(`crs:user:${userId}`, CRS_CACHE_TTL, JSON.stringify(payload));
  } catch {
    // cache write failed; CRS will be read from DB
  }
}
