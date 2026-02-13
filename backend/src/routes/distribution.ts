import { Router } from "express";
import { z } from "zod";
import { distributionService } from "../services/distribution.js";
import { authMiddleware, optionalAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";

export const distributionRouter = Router();

distributionRouter.get("/campaigns", async (req, res, next) => {
  try {
    const status = (req.query.status as string) || "active";
    const list = await distributionService.listCampaigns(status);
    res.json({ campaigns: list });
  } catch (e) {
    next(e);
  }
});

distributionRouter.get("/campaigns/:id", async (req, res, next) => {
  try {
    const campaign = await distributionService.getCampaign(req.params.id);
    if (!campaign) throw new AppError(404, "Campaign not found");
    res.json(campaign);
  } catch (e) {
    next(e);
  }
});

distributionRouter.get("/campaigns/:id/stats", authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const campaignId = req.params.id;
    const stats = await distributionService.getOrCreateCreatorStats(campaignId, userId);
    res.json(stats);
  } catch (e) {
    next(e);
  }
});

distributionRouter.get("/campaigns/:id/budget-status", async (req, res, next) => {
  try {
    const pool = (await import("../lib/db.js")).getPool();
    const row = await pool.query(
      "SELECT id, total_budget, remaining_budget, total_distributed_amount, start_time FROM distribution_campaigns WHERE id = $1",
      [req.params.id]
    ).then((r) => r.rows[0]);
    if (!row) throw new AppError(404, "Campaign not found");
    const totalBudget = Number(row.total_budget);
    const remaining = Number(row.remaining_budget ?? totalBudget);
    const spent = Number(row.total_distributed_amount ?? 0);
    const agg = await pool.query(
      `SELECT COUNT(CASE WHEN engagement_action = 'view' THEN 1 END) AS views,
        COUNT(DISTINCT CASE WHEN engagement_action = 'view' THEN COALESCE(visitor_user_id::text, visitor_ip::text || COALESCE(device_hash,'')) END) AS unique_views,
        COUNT(CASE WHEN engagement_action IN ('like','share') THEN 1 END) AS engagements
       FROM referral_tracking WHERE campaign_id = $1`,
      [req.params.id]
    ).then((r) => r.rows[0]);
    const uniqueViews = Number(agg?.unique_views ?? 0);
    const engagements = Number(agg?.engagements ?? 0);
    const costPerView = uniqueViews > 0 ? spent / uniqueViews : 0;
    const costPerEngagement = engagements > 0 ? spent / engagements : 0;
    const daysElapsed = Math.max(1, (Date.now() - new Date(row.start_time).getTime()) / (24 * 60 * 60 * 1000));
    const avgDailySpend = spent / daysElapsed;
    const estimatedCompletionDays = avgDailySpend > 0 ? remaining / avgDailySpend : null;
    res.json({
      campaign_id: row.id,
      total_budget: totalBudget,
      remaining_budget: remaining,
      total_distributed_amount: spent,
      cost_per_view: Math.round(costPerView * 100) / 100,
      cost_per_engagement: Math.round(costPerEngagement * 100) / 100,
      estimated_campaign_completion_days: estimatedCompletionDays != null ? Math.round(estimatedCompletionDays * 10) / 10 : null,
    });
  } catch (e) {
    next(e);
  }
});

distributionRouter.get("/campaigns/:id/tracking-link", authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const campaignId = req.params.id;
    const pool = (await import("../lib/db.js")).getPool();
    const user = await pool.query("SELECT unique_creator_id FROM users WHERE id = $1", [userId]).then((r) => r.rows[0]);
    if (!user?.unique_creator_id) throw new AppError(400, "Creator ID not set");
    const baseUrl = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
    const url = distributionService.getTrackingUrl(campaignId, user.unique_creator_id, baseUrl);
    res.json({ tracking_url: url });
  } catch (e) {
    next(e);
  }
});

const trackBody = z.object({
  campaign_id: z.string().uuid(),
  ref: z.string().min(1),
  engagement_action: z.enum(["view", "like", "share"]),
  watched_seconds: z.number().min(0).optional(),
  device_hash: z.string().optional(),
  creative_id: z.string().uuid().optional(),
  country: z.string().max(2).optional(),
  state: z.string().max(100).optional(),
  device_type: z.string().max(50).optional(),
  browser: z.string().max(100).optional(),
  os: z.string().max(100).optional(),
});

distributionRouter.post("/track", optionalAuth, async (req, res, next) => {
  try {
    const parsed = trackBody.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, "Invalid body: campaign_id, ref, engagement_action required");
    const { campaign_id, ref, engagement_action, watched_seconds = 0, device_hash, creative_id, country, state, device_type, browser, os } = parsed.data;
    const userId = (req as any).userId;
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "";

    const refCreatorId = await distributionService.resolveCreatorByRef(campaign_id, ref);
    if (!refCreatorId) throw new AppError(400, "Invalid ref");

    const result = await distributionService.recordReferralEvent({
      campaign_id,
      ref_creator_id: refCreatorId,
      user_id: userId || "",
      creative_id,
      ip_address: ip,
      device_hash: device_hash ?? "",
      watched_seconds: engagement_action === "view" ? watched_seconds : 0,
      engagement_action,
      country,
      state,
      device_type,
      browser,
      os,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});
