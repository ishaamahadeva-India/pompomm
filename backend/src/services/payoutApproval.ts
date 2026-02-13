import { getPool } from "../lib/db.js";
import { AppError } from "../middleware/errorHandler.js";
import { getCRSForPayout } from "./crsEngine.js";

const MIN_IP_RANGES = 10;
const MIN_CITIES = 3;
const COOLDOWN_DAYS = 7;
const COOLDOWN_MAX_CAMPAIGNS = 3;
/** Platform floor: engagement rate < this → held + log. */
const ENGAGEMENT_RATE_FLOOR = 15;
/** Milestone payouts: wait 6 hours after milestone_reached_at before approval. */
const MILESTONE_DELAY_HOURS = 6;
/** CRS (0–100): below this → auto-hold, fraud_log.reason = 'low_crs'. */
const CRS_HOLD_THRESHOLD = 25;
/** CRS (0–100): below this (and >= hold) → reduce payout by 20%. */
const CRS_REDUCE_THRESHOLD = 40;
const CRS_REDUCE_MULTIPLIER = 0.8;

export type PayoutApprovalResult = { ok: true; payout_status: string; held_reason?: string };

/**
 * Approve or set payout status with strict transaction locking.
 * For approved/paid: checks budget (FOR UPDATE), geo diversity (milestone), cooldown; then deducts budget and records cooldown.
 */
export async function approvePayout(
  campaignId: string,
  userId: string,
  payout_status: string
): Promise<PayoutApprovalResult> {
  const pool = getPool();
  if (!["pending", "approved", "held", "paid"].includes(payout_status)) {
    throw new AppError(400, "Invalid payout_status");
  }

  if (payout_status !== "approved" && payout_status !== "paid") {
    await pool.query(
      "UPDATE creator_distribution_stats SET payout_status = $1, last_updated = NOW() WHERE campaign_id = $2 AND user_id = $3",
      [payout_status, campaignId, userId]
    );
    return { ok: true, payout_status };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const statsRow = await client.query(
      "SELECT total_earned, verified_engagement_rate, last_updated, milestone_reached_at FROM creator_distribution_stats WHERE campaign_id = $1 AND user_id = $2 FOR UPDATE",
      [campaignId, userId]
    ).then((r) => r.rows[0]);
    let amount = Number(statsRow?.total_earned ?? 0);
    const engagementRate = Number(statsRow?.verified_engagement_rate ?? 0);
    const milestoneReachedAt = statsRow?.milestone_reached_at as Date | undefined;
    const lastUpdated = statsRow?.last_updated as Date | undefined;

    if (amount > 0 && engagementRate < ENGAGEMENT_RATE_FLOOR) {
      await client.query(
        "UPDATE creator_distribution_stats SET payout_status = 'held', last_updated = NOW() WHERE campaign_id = $1 AND user_id = $2",
        [campaignId, userId]
      );
      await client.query(
        `INSERT INTO fraud_log (event_type, campaign_id, user_id, reason) VALUES ('low_engagement_rate', $1, $2, 'low_engagement_rate')`,
        [campaignId, userId]
      );
      await client.query("COMMIT");
      return { ok: true, payout_status: "held", held_reason: "low_engagement_rate" };
    }

    const crs = await getCRSForPayout(pool, userId);
    const crsNum = crs ?? 0;
    if (amount > 0 && crsNum < CRS_HOLD_THRESHOLD) {
      await client.query(
        "UPDATE creator_distribution_stats SET payout_status = 'held', last_updated = NOW() WHERE campaign_id = $1 AND user_id = $2",
        [campaignId, userId]
      );
      await client.query(
        `INSERT INTO fraud_log (event_type, campaign_id, user_id, reason) VALUES ('low_crs', $1, $2, 'low_crs')`,
        [campaignId, userId]
      );
      await client.query("COMMIT");
      return { ok: true, payout_status: "held", held_reason: "low_crs" };
    }
    if (amount > 0 && crsNum >= CRS_HOLD_THRESHOLD && crsNum < CRS_REDUCE_THRESHOLD) {
      amount = Math.round(amount * CRS_REDUCE_MULTIPLIER * 100) / 100;
    }

    const campaignRow = await client.query(
      "SELECT remaining_budget, payout_model FROM distribution_campaigns WHERE id = $1 FOR UPDATE",
      [campaignId]
    ).then((r) => r.rows[0]);
    if (!campaignRow) {
      await client.query("ROLLBACK");
      throw new AppError(404, "Campaign not found");
    }
    const remaining = Number(campaignRow?.remaining_budget ?? 0);
    const payoutModel = campaignRow?.payout_model as string;

    if (amount > 0) {
      if (remaining < amount) {
        await client.query("ROLLBACK");
        throw new AppError(400, "Insufficient remaining budget for this payout");
      }

      if (payoutModel === "fixed_milestone") {
        const delayMs = MILESTONE_DELAY_HOURS * 60 * 60 * 1000;
        const refTime = milestoneReachedAt ?? lastUpdated;
        if (refTime && Date.now() - new Date(refTime).getTime() < delayMs) {
          await client.query("ROLLBACK");
          throw new AppError(400, "Milestone payouts require a 6-hour delay for fraud analysis");
        }
        const geo = await client.query(
          `SELECT
             COUNT(DISTINCT regexp_replace(host(visitor_ip), '\.[0-9]+$', '')) AS ip_ranges,
             COUNT(DISTINCT state) FILTER (WHERE state IS NOT NULL AND trim(state) != '') AS cities
           FROM referral_tracking
           WHERE campaign_id = $1 AND ref_creator_id = $2 AND visitor_ip IS NOT NULL`,
          [campaignId, userId]
        ).then((r) => r.rows[0]);
        const ipRanges = Number(geo?.ip_ranges ?? 0);
        const cities = Number(geo?.cities ?? 0);
        if (ipRanges < MIN_IP_RANGES || cities < MIN_CITIES) {
          await client.query(
            "UPDATE creator_distribution_stats SET payout_status = 'held', last_updated = NOW() WHERE campaign_id = $1 AND user_id = $2",
            [campaignId, userId]
          );
          await client.query(
            `INSERT INTO fraud_log (event_type, campaign_id, user_id, reason)
             VALUES ('low_geo_diversity', $1, $2, 'low_geo_diversity')`,
            [campaignId, userId]
          );
          await client.query("COMMIT");
          return { ok: true, payout_status: "held", held_reason: "low_geo_diversity" };
        }
      }

      const cooldownCount = await client.query(
        `SELECT COUNT(DISTINCT campaign_id) AS c FROM creator_cooldown_log
         WHERE user_id = $1 AND payout_date > CURRENT_DATE - $2::int`,
        [userId, COOLDOWN_DAYS]
      ).then((r) => Number(r.rows[0]?.c ?? 0));
      if (cooldownCount >= COOLDOWN_MAX_CAMPAIGNS) {
        await client.query("ROLLBACK");
        throw new AppError(400, `Creator cannot earn from more than ${COOLDOWN_MAX_CAMPAIGNS} campaigns within ${COOLDOWN_DAYS} days`);
      }

      await client.query(
        "UPDATE distribution_campaigns SET remaining_budget = remaining_budget - $1, total_distributed_amount = total_distributed_amount + $1 WHERE id = $2",
        [amount, campaignId]
      );
      await client.query(
        "INSERT INTO creator_cooldown_log (user_id, campaign_id, payout_date) VALUES ($1, $2, CURRENT_DATE)",
        [userId, campaignId]
      );
    }

    await client.query(
      "UPDATE creator_distribution_stats SET payout_status = $1, last_updated = NOW() WHERE campaign_id = $2 AND user_id = $3",
      [payout_status, campaignId, userId]
    );
    await client.query("COMMIT");
    return { ok: true, payout_status };
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
