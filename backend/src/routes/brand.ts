import { Router } from "express";
import { getPool } from "../lib/db.js";
import { authMiddleware, requireBrandAdmin } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";

export const brandRouter = Router();

brandRouter.use(authMiddleware);
brandRouter.use(requireBrandAdmin);

/** Ensure brand_admin can only access campaigns they own; admin can access any. */
async function assertCampaignAccess(campaignId: string, userId: string, role: string): Promise<void> {
  if (role === "admin") return;
  const pool = getPool();
  const row = await pool.query(
    "SELECT id FROM distribution_campaigns WHERE id = $1 AND brand_owner_id = $2",
    [campaignId, userId]
  ).then((r) => r.rows[0]);
  if (!row) throw new AppError(404, "Campaign not found or access denied");
}

/** GET /brand/:campaignId/dashboard — simplified for brand_admin: verified reach, unique views, engagement rate, budget, cost per engagement, top 5 creators. No fraud analytics. */
brandRouter.get("/:campaignId/dashboard", async (req, res, next) => {
  try {
    const { campaignId } = req.params;
    const userId = (req as any).userId;
    const role = (req as any).userRole;
    await assertCampaignAccess(campaignId, userId, role);

    const pool = getPool();
    const campaign = await pool.query(
      "SELECT id, title, total_budget, remaining_budget, total_distributed_amount FROM distribution_campaigns WHERE id = $1",
      [campaignId]
    ).then((r) => r.rows[0]);
    if (!campaign) throw new AppError(404, "Campaign not found");

    const totalBudget = Number(campaign.total_budget ?? 0);
    const remaining = Number(campaign.remaining_budget ?? totalBudget);
    const budget_used = Number(campaign.total_distributed_amount ?? 0);

    const agg = await pool.query(
      `SELECT
         COUNT(DISTINCT CASE WHEN engagement_action = 'view' THEN COALESCE(visitor_user_id::text, visitor_ip::text || COALESCE(device_hash,'')) END) AS unique_views,
         COUNT(CASE WHEN engagement_action = 'like' THEN 1 END) AS likes,
         COUNT(CASE WHEN engagement_action = 'share' THEN 1 END) AS shares
       FROM referral_tracking WHERE campaign_id = $1`,
      [campaignId]
    ).then((r) => r.rows[0]);

    const unique_views = Number(agg?.unique_views ?? 0);
    const likes = Number(agg?.likes ?? 0);
    const shares = Number(agg?.shares ?? 0);
    const engagements = likes + shares;
    const engagement_rate = unique_views > 0 ? (engagements / unique_views) * 100 : 0;
    const cost_per_engagement = engagements > 0 ? budget_used / engagements : 0;

    const topCreators = await pool.query(
      `SELECT s.user_id, u.unique_creator_id, s.total_unique_views, s.total_likes, s.total_shares, s.verified_engagement_rate, s.total_earned
       FROM creator_distribution_stats s JOIN users u ON u.id = s.user_id
       WHERE s.campaign_id = $1 ORDER BY s.total_earned DESC LIMIT 5`,
      [campaignId]
    ).then((r) => r.rows);

    res.json({
      campaign_id: campaignId,
      title: campaign.title,
      total_verified_reach: unique_views,
      unique_views,
      engagement_rate: Math.round(engagement_rate * 100) / 100,
      budget_used,
      remaining_budget: remaining,
      cost_per_engagement: Math.round(cost_per_engagement * 100) / 100,
      top_creators: topCreators.map((r: Record<string, unknown>) => ({
        user_id: r.user_id,
        unique_creator_id: r.unique_creator_id,
        total_unique_views: Number(r.total_unique_views),
        total_likes: Number(r.total_likes),
        total_shares: Number(r.total_shares),
        engagement_rate: Number(r.verified_engagement_rate),
        total_earned: Number(r.total_earned),
      })),
    });
  } catch (e) {
    next(e);
  }
});

/** GET /brand/:campaignId/export — CSV export */
brandRouter.get("/:campaignId/export", async (req, res, next) => {
  try {
    const { campaignId } = req.params;
    const userId = (req as any).userId;
    const role = (req as any).userRole;
    await assertCampaignAccess(campaignId, userId, role);

    const pool = getPool();
    const rows = await pool.query(
      `SELECT s.user_id AS creator_id, u.unique_creator_id, s.total_unique_views AS total_views,
              s.verified_engagement_rate AS engagement_rate, s.total_earned, s.payout_status, s.fraud_score
       FROM creator_distribution_stats s JOIN users u ON u.id = s.user_id WHERE s.campaign_id = $1`,
      [campaignId]
    ).then((r) => r.rows);
    const header = "creator_id,unique_creator_id,total_views,engagement_rate,total_earned,payout_status,fraud_score\n";
    const csvRows = rows.map((r: Record<string, unknown>) =>
      `${r.creator_id},${r.unique_creator_id ?? ""},${r.total_views},${r.engagement_rate},${r.total_earned},${r.payout_status},${r.fraud_score ?? ""}`
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="brand-dashboard-${campaignId}.csv"`);
    res.send(header + csvRows.join("\n"));
  } catch (e) {
    next(e);
  }
});
