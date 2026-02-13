import { getPool } from "../lib/db.js";
import { getRedisClient } from "../lib/redis.js";
import { checkDistributionIpRate } from "../middleware/rateLimit.js";
import { AppError } from "../middleware/errorHandler.js";
import { v4 as uuid } from "uuid";
import { recalculateCreatorEarnings } from "./payoutEngine.js";

/** Upgrade creator_tier by verified engagements: 1000 -> silver, 5000 -> gold. Verified is manual. */
async function updateCreatorTierFromEngagements(userId: string): Promise<void> {
  const pool = getPool();
  const row = await pool.query(
    "SELECT creator_tier FROM users WHERE id = $1",
    [userId]
  ).then((r) => r.rows[0]);
  if (!row || (row.creator_tier as string) === "verified") return;
  const sum = await pool.query(
    "SELECT COALESCE(SUM(total_likes + total_shares), 0) AS s FROM creator_distribution_stats WHERE user_id = $1",
    [userId]
  ).then((r) => Number(r.rows[0]?.s ?? 0));
  let tier = "bronze";
  if (sum >= 5000) tier = "gold";
  else if (sum >= 1000) tier = "silver";
  await pool.query("UPDATE users SET creator_tier = $1 WHERE id = $2 AND creator_tier != 'verified'", [tier, userId]);
}

const MIN_WATCH_SECONDS = 10;
const SCORE_VIEW = 1;
const SCORE_LIKE = 2;
const SCORE_SHARE = 3;
const CACHE_TTL = 300;

export type DistributionCampaign = {
  id: string;
  title: string;
  description: string | null;
  sponsor_name: string;
  total_budget: number;
  payout_model: "tier_based" | "fixed_milestone";
  min_unique_views_required: number;
  min_engagement_rate_required: number;
  payout_per_milestone: number | null;
  max_daily_payout_per_user: number;
  tier_config: Record<string, number> | null;
  start_time: Date;
  end_time: Date;
  status: string;
  created_at: Date;
};

export type CreatorDistributionStats = {
  id: string;
  campaign_id: string;
  user_id: string;
  total_unique_views: number;
  total_likes: number;
  total_shares: number;
  verified_engagement_rate: number;
  total_earned: number;
  payout_status: string;
  fraud_score: number;
  last_updated: Date;
};

export const distributionService = {
  async listCampaigns(status: string = "active"): Promise<DistributionCampaign[]> {
    const pool = getPool();
    const rows = await pool.query(
      "SELECT * FROM distribution_campaigns WHERE status = $1 AND end_time > NOW() ORDER BY start_time DESC",
      [status]
    ).then((r) => r.rows);
    return rows.map(normalizeCampaign);
  },

  async getCampaign(id: string): Promise<DistributionCampaign | null> {
    const pool = getPool();
    const row = await pool.query("SELECT * FROM distribution_campaigns WHERE id = $1", [id]).then((r) => r.rows[0]);
    return row ? normalizeCampaign(row) : null;
  },

  async getOrCreateCreatorStats(campaignId: string, userId: string): Promise<CreatorDistributionStats> {
    const pool = getPool();
    let row = await pool.query(
      "SELECT * FROM creator_distribution_stats WHERE campaign_id = $1 AND user_id = $2",
      [campaignId, userId]
    ).then((r) => r.rows[0]);
    if (!row) {
    await pool.query(
      "INSERT INTO creator_distribution_stats (campaign_id, user_id) VALUES ($1, $2) ON CONFLICT (campaign_id, user_id) DO NOTHING",
      [campaignId, userId]
    );
    row = await pool.query(
      "SELECT * FROM creator_distribution_stats WHERE campaign_id = $1 AND user_id = $2",
      [campaignId, userId]
    ).then((r) => r.rows[0]);
    }
    return row ? normalizeStats(row) : null!;
  },

  async getCreatorStats(campaignId: string, userId: string): Promise<CreatorDistributionStats | null> {
    const pool = getPool();
    const row = await pool.query(
      "SELECT * FROM creator_distribution_stats WHERE campaign_id = $1 AND user_id = $2",
      [campaignId, userId]
    ).then((r) => r.rows[0]);
    return row ? normalizeStats(row) : null;
  },

  async recordReferralEvent(params: {
    campaign_id: string;
    ref_creator_id: string;
    user_id: string;
    creative_id?: string;
    ip_address: string;
    device_hash: string;
    watched_seconds: number;
    engagement_action: "view" | "like" | "share";
    country?: string;
    state?: string;
    device_type?: string;
    browser?: string;
    os?: string;
  }): Promise<{ accepted: boolean; message?: string }> {
    const pool = getPool();
    const { campaign_id, ref_creator_id, user_id, ip_address, device_hash, watched_seconds, engagement_action } = params;
    const { country, state, device_type, browser, os } = params;

    if (!user_id) {
      return { accepted: false, message: "Log in for your engagement to count" };
    }
    if (watched_seconds < MIN_WATCH_SECONDS && engagement_action === "view") {
      return { accepted: false, message: `Watch at least ${MIN_WATCH_SECONDS} seconds for a view to count` };
    }

    const { allowed } = await checkDistributionIpRate(ip_address);
    if (!allowed) {
      throw new AppError(429, "Too many events from this device. Try again later.");
    }

    const campaign = await pool.query("SELECT * FROM distribution_campaigns WHERE id = $1", [campaign_id]).then((r) => r.rows[0]);
    if (!campaign) throw new AppError(404, "Campaign not found");
    if (campaign.status !== "active") return { accepted: false, message: "Campaign is not active" };
    if (new Date(campaign.end_time) < new Date()) return { accepted: false, message: "Campaign has ended" };

    const uniqueKey = `dist_uniq:${campaign_id}:${ref_creator_id}:${user_id}:${engagement_action}`;
    if (engagement_action === "view") {
      try {
        const redis = getRedisClient();
        const seen = await redis.get(uniqueKey);
        if (seen) return { accepted: false, message: "Already counted this view" };
        await redis.setex(uniqueKey, 86400 * 7, "1");
      } catch {
        // Redis down: skip dedup; allow view
      }
    }

    await pool.query(
      `INSERT INTO referral_tracking (id, campaign_id, creative_id, ref_creator_id, visitor_user_id, visitor_ip, device_hash, watched_seconds, engagement_action, country, state, device_type, browser, os)
       VALUES ($1, $2, $3, $4, $5, $6::inet, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [uuid(), campaign_id, params.creative_id || null, ref_creator_id, user_id || null, ip_address || null, device_hash || null, watched_seconds, engagement_action, country ?? null, state ?? null, device_type ?? null, browser ?? null, os ?? null]
    );

    await this.aggregateCreatorStats(campaign_id, ref_creator_id);
    return { accepted: true };
  },

  async aggregateCreatorStats(campaignId: string, refCreatorId: string): Promise<void> {
    const pool = getPool();
    const campaign = await pool.query("SELECT * FROM distribution_campaigns WHERE id = $1", [campaignId]).then((r) => r.rows[0]);
    if (!campaign) return;

    const agg = await pool.query(
      `SELECT
         COUNT(DISTINCT CASE WHEN engagement_action = 'view' THEN COALESCE(visitor_user_id::text, visitor_ip::text || device_hash) END) AS unique_views,
         COUNT(CASE WHEN engagement_action = 'like' THEN 1 END) AS likes,
         COUNT(CASE WHEN engagement_action = 'share' THEN 1 END) AS shares
       FROM referral_tracking
       WHERE campaign_id = $1 AND ref_creator_id = $2`,
      [campaignId, refCreatorId]
    ).then((r) => r.rows[0]);

    const unique_views = Number(agg?.unique_views ?? 0);
    const total_likes = Number(agg?.likes ?? 0);
    const total_shares = Number(agg?.shares ?? 0);
    const total_engagement = unique_views * SCORE_VIEW + total_likes * SCORE_LIKE + total_shares * SCORE_SHARE;
    const engagement_rate = unique_views > 0 ? ((total_likes + total_shares) / unique_views) * 100 : 0;

    await pool.query(
      `INSERT INTO creator_distribution_stats (campaign_id, user_id, total_unique_views, total_likes, total_shares, verified_engagement_rate, last_updated)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (campaign_id, user_id) DO UPDATE SET
         total_unique_views = $3, total_likes = $4, total_shares = $5, verified_engagement_rate = $6, last_updated = NOW()`,
      [campaignId, refCreatorId, unique_views, total_likes, total_shares, engagement_rate.toFixed(2)]
    );

    await recalculateCreatorEarnings(campaignId, refCreatorId).catch(() => {});
    await updateCreatorTierFromEngagements(refCreatorId);
    await invalidateStatsCache(campaignId, refCreatorId);
  },

  getTrackingUrl(campaignId: string, uniqueCreatorId: string, baseUrl: string): string {
    return `${baseUrl}/distribution/${campaignId}?ref=${encodeURIComponent(uniqueCreatorId)}`;
  },

  async resolveCreatorByRef(campaignId: string, ref: string): Promise<string | null> {
    const pool = getPool();
    const row = await pool.query(
      "SELECT id FROM users WHERE unique_creator_id = $1",
      [ref]
    ).then((r) => r.rows[0]);
    return row?.id ?? null;
  },
};

function normalizeCampaign(row: Record<string, unknown>): DistributionCampaign {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | null,
    sponsor_name: row.sponsor_name as string,
    total_budget: Number(row.total_budget) ?? 0,
    payout_model: row.payout_model as "tier_based" | "fixed_milestone",
    min_unique_views_required: Number(row.min_unique_views_required) ?? 100,
    min_engagement_rate_required: Number(row.min_engagement_rate_required) ?? 5,
    payout_per_milestone: row.payout_per_milestone != null ? Number(row.payout_per_milestone) : null,
    max_daily_payout_per_user: Number(row.max_daily_payout_per_user) ?? 500,
    tier_config: (row.tier_config as Record<string, number>) ?? null,
    start_time: row.start_time as Date,
    end_time: row.end_time as Date,
    status: row.status as string,
    created_at: row.created_at as Date,
  };
}

function normalizeStats(row: Record<string, unknown>): CreatorDistributionStats {
  return {
    id: row.id as string,
    campaign_id: row.campaign_id as string,
    user_id: row.user_id as string,
    total_unique_views: Number(row.total_unique_views) ?? 0,
    total_likes: Number(row.total_likes) ?? 0,
    total_shares: Number(row.total_shares) ?? 0,
    verified_engagement_rate: Number(row.verified_engagement_rate) ?? 0,
    total_earned: Number(row.total_earned) ?? 0,
    payout_status: (row.payout_status as string) ?? "pending",
    fraud_score: Number(row.fraud_score) ?? 0,
    last_updated: row.last_updated as Date,
  };
}

async function invalidateStatsCache(campaignId: string, userId: string): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.del(`dist_stats:${campaignId}:${userId}`);
  } catch {
    // ignore
  }
}
