import { getPool } from "../lib/db.js";
import { getRedisClient } from "../lib/redis.js";
import { checkIpViewRate } from "../middleware/rateLimit.js";
import { v4 as uuid } from "uuid";
import { AppError } from "../middleware/errorHandler.js";
import type { LeaderboardEntry } from "../lib/redis.js";

const MIN_WATCH_SECONDS = 7;
const SCORE_PER_VIEW = 1;
const SCORE_PER_LIKE = 2;
const SCORE_PER_SHARE = 3;

async function logFraud(eventType: string, data: Record<string, unknown>): Promise<void> {
  try {
    const pool = getPool();
    await pool.query(
      "INSERT INTO fraud_log (event_type, ip_address, user_id, creative_id, payload) VALUES ($1, $2, $3, $4, $5)",
      [
        eventType,
        data.ip_address ?? null,
        data.user_id ?? null,
        data.creative_id ?? null,
        JSON.stringify(data),
      ]
    );
  } catch (e) {
    console.error("Fraud log error:", e);
  }
}

async function invalidateLeaderboardCache(campaignId: string): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.del(`leaderboard:${campaignId}`);
  } catch {
    // ignore
  }
}

export const creativesService = {
  async upload(userId: string, campaignId: string, file: Express.Multer.File): Promise<{ id: string; media_url: string }> {
    const pool = getPool();
    const campaign = await pool.query(
      "SELECT id, max_creatives_allowed FROM campaigns WHERE id = $1",
      [campaignId]
    ).then((r) => r.rows[0]);
    if (!campaign) throw new AppError(404, "Campaign not found");
    const hasBrandCreative = await pool.query(
      "SELECT 1 FROM creatives WHERE campaign_id = $1 AND is_campaign_creative = true",
      [campaignId]
    ).then((r) => r.rows[0]);
    if (hasBrandCreative) {
      throw new AppError(400, "This campaign uses one brand creative. Only the brand (admin) uploads; users watch, share and like.");
    }
    const maxAllowed = campaign.max_creatives_allowed ?? 1;
    const count = await pool.query(
      "SELECT COUNT(*) AS c FROM creatives WHERE campaign_id = $1 AND user_id = $2",
      [campaignId, userId]
    ).then((r) => Number(r.rows[0]?.c ?? 0));
    if (count >= maxAllowed) {
      throw new AppError(400, `Maximum ${maxAllowed} creative(s) allowed per campaign for this user.`);
    }
    const mediaUrl = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL}/${file.filename}`
      : `/uploads/${file.filename}`;

    const result = await pool.query(
      "INSERT INTO creatives (id, campaign_id, user_id, media_url) VALUES ($1, $2, $3, $4) RETURNING id, media_url",
      [uuid(), campaignId, userId, mediaUrl]
    );
    const row = result.rows[0];
    await invalidateLeaderboardCache(campaignId);
    return { id: row.id, media_url: row.media_url };
  },

  async recordView(params: {
    creative_id: string;
    user_id: string;
    ip_address: string;
    device_hash: string;
    watched_seconds: number;
  }): Promise<{ accepted: boolean; message?: string }> {
    const { creative_id, user_id, ip_address, watched_seconds } = params;
    const pool = getPool();

    if (watched_seconds < MIN_WATCH_SECONDS) {
      await logFraud("view_insufficient_watch", { ...params, watched_seconds });
      return { accepted: false, message: `Watch at least ${MIN_WATCH_SECONDS} seconds` };
    }

    const { allowed: ipAllowed } = await checkIpViewRate(ip_address);
    if (!ipAllowed) {
      await logFraud("view_rate_limit_ip", { ip_address, creative_id });
      throw new AppError(429, "Too many views from this device. Try again later.");
    }

    const creative = await pool.query(
      "SELECT id, campaign_id FROM creatives WHERE id = $1",
      [creative_id]
    ).then((r) => r.rows[0]);
    if (!creative) throw new AppError(404, "Creative not found");

    const campaign = await pool.query(
      "SELECT id, status, end_time FROM campaigns WHERE id = $1",
      [creative.campaign_id]
    ).then((r) => r.rows[0]);
    if (!campaign) throw new AppError(404, "Campaign not found");
    if (campaign.status !== "active") {
      return { accepted: false, message: "Campaign is not active" };
    }
    if (new Date(campaign.end_time) < new Date()) {
      return { accepted: false, message: "Campaign has ended" };
    }

    const existing = await pool.query(
      "SELECT id FROM campaign_views WHERE creative_id = $1 AND user_id = $2",
      [creative_id, user_id]
    ).then((r) => r.rows[0]);
    if (existing) {
      return { accepted: false, message: "Already viewed this creative" };
    }

    await pool.query(
      "INSERT INTO campaign_views (id, creative_id, user_id, ip_address, device_hash, watched_seconds) VALUES ($1, $2, $3, $4::inet, $5, $6)",
      [uuid(), creative_id, user_id, ip_address || null, params.device_hash || null, watched_seconds]
    );

    await pool.query(
      `UPDATE creatives SET unique_views = unique_views + 1, total_views = COALESCE(total_views, 0) + 1,
       engagement_score = engagement_score + $1 WHERE id = $2`,
      [SCORE_PER_VIEW, creative_id]
    );

    await pool.query(
      "UPDATE users SET total_score = total_score + $1, total_views_generated = COALESCE(total_views_generated, 0) + 1 WHERE id = $2",
      [SCORE_PER_VIEW, user_id]
    );

    await invalidateLeaderboardCache(creative.campaign_id);
    return { accepted: true };
  },

  async recordShare(creativeId: string, userId: string): Promise<{ accepted: boolean }> {
    const pool = getPool();
    const creative = await pool.query(
      "SELECT id, campaign_id FROM creatives WHERE id = $1",
      [creativeId]
    ).then((r) => r.rows[0]);
    if (!creative) throw new AppError(404, "Creative not found");

    const campaign = await pool.query(
      "SELECT status, end_time FROM campaigns WHERE id = $1",
      [creative.campaign_id]
    ).then((r) => r.rows[0]);
    if (!campaign || campaign.status !== "active" || new Date(campaign.end_time) < new Date()) {
      return { accepted: false };
    }

    await pool.query(
      "UPDATE creatives SET shares = shares + 1, engagement_score = engagement_score + $1 WHERE id = $2",
      [SCORE_PER_SHARE, creativeId]
    );
    await pool.query(
      "UPDATE users SET total_score = total_score + $1, total_shares_generated = COALESCE(total_shares_generated, 0) + 1 WHERE id = $2",
      [SCORE_PER_SHARE, userId]
    );
    await invalidateLeaderboardCache(creative.campaign_id);
    return { accepted: true };
  },

  async recordLike(creativeId: string, userId: string): Promise<{ accepted: boolean }> {
    const pool = getPool();
    const creative = await pool.query(
      "SELECT id, campaign_id FROM creatives WHERE id = $1",
      [creativeId]
    ).then((r) => r.rows[0]);
    if (!creative) throw new AppError(404, "Creative not found");
    const campaign = await pool.query(
      "SELECT status, end_time FROM campaigns WHERE id = $1",
      [creative.campaign_id]
    ).then((r) => r.rows[0]);
    if (!campaign || campaign.status !== "active" || new Date(campaign.end_time) < new Date()) {
      return { accepted: false };
    }
    await pool.query(
      `UPDATE creatives SET total_likes = COALESCE(total_likes, 0) + 1, engagement_score = engagement_score + $1 WHERE id = $2`,
      [SCORE_PER_LIKE, creativeId]
    );
    await pool.query(
      "UPDATE users SET total_score = total_score + $1, total_likes_generated = COALESCE(total_likes_generated, 0) + 1 WHERE id = $2",
      [SCORE_PER_LIKE, userId]
    );
    await invalidateLeaderboardCache(creative.campaign_id);
    return { accepted: true };
  },
};
