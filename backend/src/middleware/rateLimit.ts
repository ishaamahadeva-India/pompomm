import rateLimit from "express-rate-limit";
import { getRedisClient } from "../lib/redis.js";

export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: "Too many requests" },
  standardHeaders: true,
  legacyHeaders: false,
});

export async function checkIpViewRate(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const redis = getRedisClient();
    const key = `view_rate:ip:${ip}`;
    const limit = 30;
    const windowSeconds = 60;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  } catch {
    return { allowed: true, remaining: 30 };
  }
}

/** Distribution referral events: max 30 per IP per minute */
export async function checkDistributionIpRate(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const redis = getRedisClient();
    const key = `dist_rate:ip:${ip}`;
    const limit = 30;
    const windowSeconds = 60;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  } catch {
    return { allowed: true, remaining: 30 };
  }
}
