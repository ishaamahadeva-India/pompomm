import { getPool } from "../lib/db.js";
import { getCRSFromCache, setCRSCache } from "../lib/redis.js";

const MAX_CAMPAIGNS = 5;
const CLAMP = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export type CRSRow = {
  user_id: string;
  engagement_quality_score: number;
  geo_diversity_score: number;
  fraud_modifier_score: number;
  stability_score: number;
  crs_score: number;
};

/**
 * Get last 5 completed distribution campaign IDs for a creator (by campaign end_time desc).
 * Completed = end_time < NOW(). Uses available campaigns if fewer than 5.
 */
async function getLastCompletedCampaignIds(pool: ReturnType<typeof getPool>, userId: string): Promise<string[]> {
  const rows = await pool.query(
    `SELECT c.campaign_id
     FROM creator_distribution_stats c
     JOIN distribution_campaigns d ON d.id = c.campaign_id
     WHERE c.user_id = $1 AND d.end_time < NOW()
     ORDER BY d.end_time DESC
     LIMIT $2`,
    [userId, MAX_CAMPAIGNS]
  ).then((r) => r.rows as { campaign_id: string }[]);
  return rows.map((r) => r.campaign_id);
}

/**
 * Compute CRS for one creator. Uses last 5 completed campaigns. Safe for divide-by-zero; clamps 0–100.
 * EQS 40%, GDS 25%, FSM 25%, SS 10%.
 */
export async function calculateCRS(pool: ReturnType<typeof getPool>, userId: string): Promise<CRSRow | null> {
  const campaignIds = await getLastCompletedCampaignIds(pool, userId);
  if (campaignIds.length === 0) {
    return {
      user_id: userId,
      engagement_quality_score: 0,
      geo_diversity_score: 0,
      fraud_modifier_score: 0,
      stability_score: 0,
      crs_score: 0,
    };
  }

  const placeholders = campaignIds.map((_, i) => `$${i + 2}`).join(", ");
  const params = [userId, ...campaignIds];

  const [eqsRow, gdsRow, fsmRow, ssRow] = await Promise.all([
    pool.query(
      `SELECT COALESCE(AVG(verified_engagement_rate), 0) AS avg_rate
       FROM creator_distribution_stats WHERE user_id = $1 AND campaign_id IN (${placeholders})`,
      params
    ).then((r) => r.rows[0]),
    pool.query(
      `SELECT COUNT(DISTINCT state) AS distinct_states
       FROM referral_tracking WHERE ref_creator_id = $1 AND campaign_id IN (${placeholders}) AND state IS NOT NULL AND trim(state) != ''`,
      params
    ).then((r) => r.rows[0]),
    pool.query(
      `SELECT COALESCE(AVG(fraud_score), 0) AS avg_fraud
       FROM creator_distribution_stats WHERE user_id = $1 AND campaign_id IN (${placeholders})`,
      params
    ).then((r) => r.rows[0]),
    pool.query(
      `SELECT COALESCE(STDDEV(verified_engagement_rate), 0) AS stddev_rate
       FROM creator_distribution_stats WHERE user_id = $1 AND campaign_id IN (${placeholders})`,
      params
    ).then((r) => r.rows[0]),
  ]);

  const avgRate = Number(eqsRow?.avg_rate ?? 0);
  const eqs = CLAMP(avgRate * 2, 0, 100);

  const distinctStates = Number(gdsRow?.distinct_states ?? 0);
  const gds = CLAMP((distinctStates / 10) * 100, 0, 100);

  const avgFraud = Number(fsmRow?.avg_fraud ?? 0);
  const fsm = CLAMP(100 - avgFraud, 0, 100);

  const stddevRate = Number(ssRow?.stddev_rate ?? 0);
  const ss = CLAMP(100 - stddevRate, 0, 100);

  const crs = CLAMP(eqs * 0.4 + gds * 0.25 + fsm * 0.25 + ss * 0.1, 0, 100);

  return {
    user_id: userId,
    engagement_quality_score: Math.round(eqs * 100) / 100,
    geo_diversity_score: Math.round(gds * 100) / 100,
    fraud_modifier_score: Math.round(fsm * 100) / 100,
    stability_score: Math.round(ss * 100) / 100,
    crs_score: Math.round(crs * 100) / 100,
  };
}

/**
 * Upsert creator_crs and return the row.
 */
export async function upsertCreatorCRS(pool: ReturnType<typeof getPool>, row: CRSRow): Promise<void> {
  await pool.query(
    `INSERT INTO creator_crs (user_id, engagement_quality_score, geo_diversity_score, fraud_modifier_score, stability_score, crs_score, last_updated)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       engagement_quality_score = EXCLUDED.engagement_quality_score,
       geo_diversity_score = EXCLUDED.geo_diversity_score,
       fraud_modifier_score = EXCLUDED.fraud_modifier_score,
       stability_score = EXCLUDED.stability_score,
       crs_score = EXCLUDED.crs_score,
       last_updated = NOW()`,
    [row.user_id, row.engagement_quality_score, row.geo_diversity_score, row.fraud_modifier_score, row.stability_score, row.crs_score]
  );
}

/**
 * Fetch CRS from DB only (for job and fallback). Returns null if no row.
 */
export async function getCRSFromDB(pool: ReturnType<typeof getPool>, userId: string): Promise<CRSRow | null> {
  const r = await pool.query(
    "SELECT user_id, engagement_quality_score, geo_diversity_score, fraud_modifier_score, stability_score, crs_score FROM creator_crs WHERE user_id = $1",
    [userId]
  ).then((res) => res.rows[0]);
  if (!r) return null;
  return {
    user_id: r.user_id,
    engagement_quality_score: Number(r.engagement_quality_score ?? 0),
    geo_diversity_score: Number(r.geo_diversity_score ?? 0),
    fraud_modifier_score: Number(r.fraud_modifier_score ?? 0),
    stability_score: Number(r.stability_score ?? 0),
    crs_score: Number(r.crs_score ?? 0),
  };
}

/**
 * Get CRS for payout: Redis first, then DB. On DB hit, populate Redis. Returns 0–100; null if no row (treat as 0).
 */
export async function getCRSForPayout(pool: ReturnType<typeof getPool>, userId: string): Promise<number | null> {
  const cached = await getCRSFromCache(userId);
  if (cached != null) return cached.crs_score;
  const row = await getCRSFromDB(pool, userId);
  if (!row) return null;
  await setCRSCache(userId, {
    crs_score: row.crs_score,
    engagement_quality_score: row.engagement_quality_score,
    geo_diversity_score: row.geo_diversity_score,
    fraud_modifier_score: row.fraud_modifier_score,
    stability_score: row.stability_score,
  });
  return row.crs_score;
}
