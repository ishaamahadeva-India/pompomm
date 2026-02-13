import { getPool } from "../lib/db.js";
import { getCRSForPayout } from "./crsEngine.js";

const TIER_CAP_MULTIPLIER: Record<string, number> = { bronze: 1, silver: 1.25, gold: 1.5, verified: 2 };
/** Tier-based payout multiplier: Bronze 1.0, Silver 1.1, Gold 1.2, Verified 1.3 */
const TIER_PAYOUT_MULTIPLIER: Record<string, number> = { bronze: 1, silver: 1.1, gold: 1.2, verified: 1.3 };
/** Platform floor: no payout if engagement rate below this (farmed traffic). */
const ENGAGEMENT_RATE_FLOOR = 15;
/** Velocity dampener: if this fraction of views falls in one 10-min window, reduce payout by 30%. */
const VELOCITY_THRESHOLD = 0.5;
const VELOCITY_DAMPEN_MULTIPLIER = 0.7;
/** CRS (0–100): at or above this, increase payout cap by 10%. */
const CRS_CAP_BOOST_THRESHOLD = 85;
const CRS_CAP_BOOST_MULTIPLIER = 1.1;
/** CRS (0–100): below this, apply 50% cap reduction. */
const CRS_CAP_PENALTY_THRESHOLD = 35;
const CRS_CAP_PENALTY_MULTIPLIER = 0.5;

/**
 * If >= 50% of views fall in a single 10-minute window, return 0.7; else 1.
 */
async function getVelocityDampener(pool: ReturnType<typeof getPool>, campaignId: string, userId: string): Promise<number> {
  const row = await pool.query(
    `WITH views AS (
       SELECT (EXTRACT(EPOCH FROM created_at)::bigint / 600) AS bucket
       FROM referral_tracking
       WHERE campaign_id = $1 AND ref_creator_id = $2 AND engagement_action = 'view'
     ),
     totals AS (SELECT COUNT(*) AS total FROM views),
     buckets AS (SELECT bucket, COUNT(*) AS c FROM views GROUP BY bucket)
     SELECT (SELECT total FROM totals) AS total, (SELECT MAX(c) FROM buckets) AS max_bucket`,
    [campaignId, userId]
  ).then((r) => r.rows[0]);
  const total = Number(row?.total ?? 0);
  const maxBucket = Number(row?.max_bucket ?? 0);
  if (total < 2) return 1;
  if (maxBucket / total >= VELOCITY_THRESHOLD) return VELOCITY_DAMPEN_MULTIPLIER;
  return 1;
}

/**
 * Compute total_earned for a creator in a distribution campaign.
 * Applies: engagement floor 15%, velocity dampener, CRS payout cap. Admin approves.
 */
export async function recalculateCreatorEarnings(campaignId: string, userId: string): Promise<{ total_earned: number }> {
  const pool = getPool();
  const campaign = await pool.query("SELECT * FROM distribution_campaigns WHERE id = $1", [campaignId]).then((r) => r.rows[0]);
  if (!campaign) return { total_earned: 0 };

  const [stats, userRow] = await Promise.all([
    pool.query(
      "SELECT total_unique_views, total_likes, total_shares, verified_engagement_rate FROM creator_distribution_stats WHERE campaign_id = $1 AND user_id = $2",
      [campaignId, userId]
    ).then((r) => r.rows[0]),
    pool.query("SELECT creator_tier FROM users WHERE id = $1", [userId]).then((r) => r.rows[0]),
  ]);
  if (!stats) return { total_earned: 0 };

  const minViews = Number(campaign.min_unique_views_required) ?? 100;
  const minRate = Number(campaign.min_engagement_rate_required) ?? 5;
  const unique_views = Number(stats.total_unique_views) ?? 0;
  const engagement_rate = Number(stats.verified_engagement_rate) ?? 0;

  if (unique_views < minViews || engagement_rate < minRate || engagement_rate < ENGAGEMENT_RATE_FLOOR) {
    await pool.query(
      "UPDATE creator_distribution_stats SET total_earned = 0, last_updated = NOW() WHERE campaign_id = $1 AND user_id = $2",
      [campaignId, userId]
    );
    return { total_earned: 0 };
  }

  let total = 0;
  const baseMaxDaily = Number(campaign.max_daily_payout_per_user) ?? 500;
  const tier = (userRow?.creator_tier as string) || "bronze";
  let maxDaily = baseMaxDaily * (TIER_CAP_MULTIPLIER[tier] ?? 1);
  const crs = await getCRSForPayout(pool, userId);
  if (crs != null) {
    if (crs >= CRS_CAP_BOOST_THRESHOLD) maxDaily *= CRS_CAP_BOOST_MULTIPLIER;
    else if (crs < CRS_CAP_PENALTY_THRESHOLD) maxDaily *= CRS_CAP_PENALTY_MULTIPLIER;
  }

  if (campaign.payout_model === "fixed_milestone") {
    const perMilestone = Number(campaign.payout_per_milestone) ?? 10;
    const milestone = 100;
    const milestonesHit = Math.floor(unique_views / milestone);
    total = milestonesHit * perMilestone;
  } else {
    const tierConfig = (campaign.tier_config as Record<string, number>) || { "100": 10, "500": 75, "1000": 200 };
    const tiers = Object.entries(tierConfig)
      .map(([k, v]) => ({ views: parseInt(k, 10), amount: Number(v) }))
      .sort((a, b) => a.views - b.views);
    for (const t of tiers) {
      if (unique_views >= t.views) total = t.amount;
    }
  }

  total = Math.min(total, maxDaily * 30);

  const velocityMult = await getVelocityDampener(pool, campaignId, userId);
  total = total * velocityMult;
  if (velocityMult < 1) {
    await pool.query(
      `INSERT INTO fraud_log (event_type, campaign_id, user_id, reason) VALUES ('velocity_spike_adjustment', $1, $2, 'velocity_spike_adjustment')`,
      [campaignId, userId]
    );
  }
  total = total * (TIER_PAYOUT_MULTIPLIER[tier] ?? 1);
  total = Math.round(total * 100) / 100;

  const setMilestoneReached =
    campaign.payout_model === "fixed_milestone" && total > 0
      ? ", milestone_reached_at = COALESCE(milestone_reached_at, NOW())"
      : "";
  await pool.query(
    `UPDATE creator_distribution_stats SET total_earned = $1, last_updated = NOW()${setMilestoneReached} WHERE campaign_id = $2 AND user_id = $3`,
    [total, campaignId, userId]
  );
  return { total_earned: total };
}
