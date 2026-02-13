import { getPool } from "../lib/db.js";
import { v4 as uuid } from "uuid";

/** Valid creator tiers in order (lowest to highest). Verified is never auto-set; only admin. */
const TIER_ORDER = ["bronze", "silver", "gold", "verified"] as const;
export type CreatorTier = (typeof TIER_ORDER)[number];

const CRS_PROMOTE_THRESHOLD = 85;
const CRS_MAINTAIN_HIGH = 70;
const CRS_FREEZE_HIGH = 50;
const CRS_DEMOTE_THRESHOLD = 35;

/** Config: enable automated CRS-based tier updates. Default true. */
export function isAutoTierSystemEnabled(): boolean {
  const v = process.env.ENABLE_AUTO_TIER_SYSTEM;
  if (v === "false" || v === "0") return false;
  return true;
}

export function tierIndex(tier: string): number {
  const i = TIER_ORDER.indexOf(tier as CreatorTier);
  return i >= 0 ? i : 0;
}

/**
 * Compute target tier from CRS and current tier (for auto job only).
 * - CRS >= 85: promote one tier (Bronze→Silver, Silver→Gold, Gold→Gold; never auto to Verified).
 * - 70–85: maintain.
 * - 50–70: freeze (no upgrade).
 * - 35–50: demote one tier (Verified→Gold only; never auto-demote Verified below Gold).
 * - CRS < 35: target Bronze (Verified→Gold only per rule).
 * Returns null if no change.
 */
export function getTargetTierFromCRS(crs: number, currentTier: string): string | null {
  const cur = (currentTier || "bronze").toLowerCase();
  const curIdx = tierIndex(cur);
  const isVerified = cur === "verified";

  if (crs >= CRS_PROMOTE_THRESHOLD) {
    if (cur === "verified") return null;
    const nextIdx = Math.min(curIdx + 1, TIER_ORDER.length - 1);
    const next = TIER_ORDER[nextIdx];
    if (next === "verified") return null;
    return nextIdx > curIdx ? next : null;
  }
  if (crs >= CRS_MAINTAIN_HIGH) return null;
  if (crs >= CRS_FREEZE_HIGH) return null;
  if (crs >= CRS_DEMOTE_THRESHOLD) {
    if (isVerified) return "gold";
    const prevIdx = Math.max(0, curIdx - 1);
    return prevIdx < curIdx ? TIER_ORDER[prevIdx] : null;
  }
  if (crs < CRS_DEMOTE_THRESHOLD) {
    if (isVerified) return "gold";
    return cur === "bronze" ? null : "bronze";
  }
  return null;
}

export type TierChangeReason = "crs_promotion" | "crs_demotion" | "admin_override";

/**
 * Insert creator_tier_history and return the new tier.
 */
export async function recordTierChange(
  pool: ReturnType<typeof getPool>,
  userId: string,
  oldTier: string,
  newTier: string,
  reason: TierChangeReason,
  crsScore: number | null
): Promise<void> {
  await pool.query(
    `INSERT INTO creator_tier_history (id, user_id, old_tier, new_tier, reason, crs_score, changed_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [uuid(), userId, oldTier, newTier, reason, crsScore]
  );
}

/**
 * Fetch users with CRS updated in last 7 days (for tier job).
 */
export async function getUsersWithRecentCRS(
  pool: ReturnType<typeof getPool>
): Promise<{ user_id: string; creator_tier: string; crs_score: number }[]> {
  const rows = await pool.query(
    `SELECT c.user_id, COALESCE(u.creator_tier, 'bronze') AS creator_tier, c.crs_score
     FROM creator_crs c
     JOIN users u ON u.id = c.user_id
     WHERE c.last_updated > NOW() - INTERVAL '7 days'
     ORDER BY c.last_updated DESC`
  ).then((r) => r.rows);
  return rows.map((r) => ({
    user_id: r.user_id,
    creator_tier: String(r.creator_tier || "bronze"),
    crs_score: Number(r.crs_score ?? 0),
  }));
}

/**
 * Apply one tier update for a user (job only). At most one promotion or one demotion per call.
 * Verified is never auto-demoted below Gold.
 */
export async function applyTierUpdate(
  pool: ReturnType<typeof getPool>,
  userId: string,
  currentTier: string,
  crsScore: number,
  notify?: (userId: string, event: "promotion" | "demotion") => void
): Promise<{ updated: boolean; newTier?: string }> {
  const target = getTargetTierFromCRS(crsScore, currentTier);
  if (target == null || target === currentTier) return { updated: false };

  const curIdx = tierIndex(currentTier);
  const tgtIdx = tierIndex(target);
  const isPromotion = tgtIdx > curIdx;
  const isDemotion = tgtIdx < curIdx;
  if (isPromotion && tgtIdx - curIdx > 1) return { updated: false };
  if (isDemotion && curIdx - tgtIdx > 1) return { updated: false };
  if (currentTier === "verified" && tgtIdx < tierIndex("gold")) return { updated: false };

  await pool.query("UPDATE users SET creator_tier = $1 WHERE id = $2", [target, userId]);
  await recordTierChange(
    pool,
    userId,
    currentTier,
    target,
    isPromotion ? "crs_promotion" : "crs_demotion",
    crsScore
  );
  if (notify) notify(userId, isPromotion ? "promotion" : "demotion");
  return { updated: true, newTier: target };
}

/**
 * Get last N tier history rows for a user.
 */
export async function getTierHistory(
  pool: ReturnType<typeof getPool>,
  userId: string,
  limit: number = 5
): Promise<{ id: string; old_tier: string; new_tier: string; reason: string; crs_score: number | null; changed_at: Date }[]> {
  const rows = await pool.query(
    `SELECT id, old_tier, new_tier, reason, crs_score, changed_at
     FROM creator_tier_history WHERE user_id = $1 ORDER BY changed_at DESC LIMIT $2`,
    [userId, limit]
  ).then((r) => r.rows);
  return rows.map((r) => ({
    id: r.id,
    old_tier: r.old_tier,
    new_tier: r.new_tier,
    reason: r.reason,
    crs_score: r.crs_score != null ? Number(r.crs_score) : null,
    changed_at: r.changed_at,
  }));
}
