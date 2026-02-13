import { Router } from "express";
import { randomUUID } from "crypto";
import { getPool } from "../lib/db.js";
import { authMiddleware, requireAdmin } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { sanitizeText } from "../lib/sanitize.js";
import { z } from "zod";
import { getTierHistory, recordTierChange } from "../services/creatorTierService.js";
import { uploadMiddleware } from "../middleware/upload.js";
import { getRedisClient } from "../lib/redis.js";

export const adminRouter = Router();
adminRouter.use(authMiddleware, requireAdmin);

/** A. Overview metrics */
adminRouter.get("/overview", async (_req, res, next) => {
  try {
    const pool = getPool();
    const [users, subs, campaigns, creatives, fraud] = await Promise.all([
      pool.query("SELECT COUNT(*) AS c FROM users").then((r) => Number(r.rows[0]?.c ?? 0)),
      pool.query("SELECT COUNT(*) AS c FROM users WHERE subscription_status = 'active' AND (subscription_expiry IS NULL OR subscription_expiry > NOW())").then((r) => Number(r.rows[0]?.c ?? 0)),
      pool.query("SELECT COUNT(*) AS c FROM campaigns").then((r) => Number(r.rows[0]?.c ?? 0)),
      pool.query("SELECT COALESCE(SUM(unique_views), 0) AS v, COALESCE(SUM(COALESCE(total_likes,0)), 0) AS l, COALESCE(SUM(shares), 0) AS s FROM creatives").then((r) => ({ views: Number(r.rows[0]?.v ?? 0), likes: Number(r.rows[0]?.l ?? 0), shares: Number(r.rows[0]?.s ?? 0) })),
      pool.query("SELECT COUNT(*) AS c FROM fraud_log WHERE created_at > NOW() - INTERVAL '7 days'").then((r) => Number(r.rows[0]?.c ?? 0)),
    ]);
    const revenue = await pool.query("SELECT COALESCE(SUM(amount), 0) AS t FROM subscriptions WHERE payment_status = 'completed'").then((r) => Number(r.rows[0]?.t ?? 0));
    res.json({
      total_users: users,
      active_subscriptions: subs,
      total_campaigns: campaigns,
      total_views: creatives.views,
      total_likes: creatives.likes,
      total_shares: creatives.shares,
      revenue_summary: revenue,
      fraud_events_7d: fraud,
    });
  } catch (e) {
    next(e);
  }
});

/** B. Campaign list + create/edit */
const contentTypeEnum = z.enum(["image", "video", "narrative", "question"]);
const campaignBody = z
  .object({
    title: z.string(),
    description: z.string().optional(),
    category: z.enum(["direct_ad", "sponsored_knowledge"]),
    sponsor_name: z.string(),
    associate_sponsor: z.string().optional(),
    reward_pool: z.number(),
    start_time: z.string(),
    end_time: z.string(),
    status: z.enum(["upcoming", "active", "completed"]),
    max_creatives_allowed: z.number().min(1).max(3).optional(),
    content_type: contentTypeEnum.optional().nullable(),
    banner_image_url: z.string().url().optional().nullable().or(z.literal("")),
    media_url: z.string().url().optional().nullable().or(z.literal("")),
    narrative_text: z.string().optional().nullable(),
    question_text: z.string().optional().nullable(),
    option_a: z.string().optional().nullable(),
    option_b: z.string().optional().nullable(),
    option_c: z.string().optional().nullable(),
    option_d: z.string().optional().nullable(),
    correct_answer: z.string().optional().nullable(),
    cta_url: z.string().url().optional().nullable().or(z.literal("")),
  })
  .refine(validateContentForType, { message: "Content fields invalid for chosen content_type" });

function validateContentForType(b: {
  content_type?: string | null;
  media_url?: string | null;
  banner_image_url?: string | null;
  narrative_text?: string | null;
  question_text?: string | null;
  option_a?: string | null;
  option_b?: string | null;
  correct_answer?: string | null;
}): boolean {
  const ct = b.content_type ?? null;
  if (!ct) return true;
  if (ct === "image") return Boolean((b.media_url && String(b.media_url).length > 0) || (b.banner_image_url && String(b.banner_image_url).length > 0));
  if (ct === "video") return Boolean(b.media_url && String(b.media_url).length > 0);
  if (ct === "narrative") return Boolean(b.narrative_text && String(b.narrative_text).trim().length > 0);
  if (ct === "question")
    return Boolean(
      b.question_text && String(b.question_text).trim().length > 0 &&
        [b.option_a, b.option_b].every((o) => o != null && String(o).trim().length > 0) &&
        ["a", "b", "c", "d"].includes(String(b.correct_answer ?? ""))
    );
  return true;
}

adminRouter.get("/campaigns", async (_req, res, next) => {
  try {
    const pool = getPool();
    const rows = await pool.query("SELECT * FROM campaigns ORDER BY created_at DESC").then((r) => r.rows);
    res.json({ campaigns: rows });
  } catch (e) {
    next(e);
  }
});

function toUrlOrNull(v: string | null | undefined): string | null {
  if (v == null || String(v).trim() === "") return null;
  return String(v).trim();
}
function toTextOrNull(v: string | null | undefined, maxLen: number): string | null {
  if (v == null) return null;
  const s = sanitizeText(v, maxLen);
  return s.length ? s : null;
}

adminRouter.post("/campaigns", async (req, res, next) => {
  try {
    const body = campaignBody.parse(req.body);
    const pool = getPool();
    const r = await pool.query(
      `INSERT INTO campaigns (title, description, category, sponsor_name, associate_sponsor, reward_pool, start_time, end_time, status, max_creatives_allowed,
        content_type, banner_image_url, media_url, narrative_text, question_text, option_a, option_b, option_c, option_d, correct_answer, cta_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) RETURNING *`,
      [
        sanitizeText(body.title, 500),
        body.description != null ? sanitizeText(body.description, 2000) : null,
        body.category,
        sanitizeText(body.sponsor_name, 200),
        body.associate_sponsor != null ? sanitizeText(body.associate_sponsor, 200) : null,
        body.reward_pool,
        body.start_time,
        body.end_time,
        body.status,
        body.max_creatives_allowed ?? 1,
        body.content_type ?? null,
        toUrlOrNull(body.banner_image_url),
        toUrlOrNull(body.media_url),
        toTextOrNull(body.narrative_text, 10000),
        toTextOrNull(body.question_text, 2000),
        toTextOrNull(body.option_a, 500),
        toTextOrNull(body.option_b, 500),
        toTextOrNull(body.option_c, 500),
        toTextOrNull(body.option_d, 500),
        body.correct_answer && ["a", "b", "c", "d"].includes(body.correct_answer) ? body.correct_answer : null,
        toUrlOrNull(body.cta_url),
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    next(e);
  }
});

const contentAllowed = ["content_type", "banner_image_url", "media_url", "narrative_text", "question_text", "option_a", "option_b", "option_c", "option_d", "correct_answer", "cta_url"];
const patchAllowed = ["title", "description", "category", "sponsor_name", "associate_sponsor", "reward_pool", "start_time", "end_time", "status", "max_creatives_allowed", ...contentAllowed];

adminRouter.patch("/campaigns/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;
    const pool = getPool();
    const current = await pool.query("SELECT * FROM campaigns WHERE id = $1", [id]).then((r) => r.rows[0]);
    if (!current) throw new AppError(404, "Campaign not found");
    const hasContentUpdate = patchAllowed.some((k) => contentAllowed.includes(k) && body[k] !== undefined);
    if (hasContentUpdate) {
      const merged = { ...current, ...body };
      if (!validateContentForType(merged)) throw new AppError(400, "Content fields invalid for chosen content_type");
    }
    const set: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    for (const k of patchAllowed) {
      if (body[k] === undefined) continue;
      set.push(`${k} = $${i++}`);
      const v = body[k];
      if (k === "title") vals.push(sanitizeText(typeof v === "string" ? v : null, 500));
      else if (k === "description") vals.push(typeof v === "string" ? sanitizeText(v, 2000) : v);
      else if (k === "sponsor_name" || k === "associate_sponsor") vals.push(typeof v === "string" ? sanitizeText(v, 200) : v);
      else if (k === "banner_image_url" || k === "media_url" || k === "cta_url") vals.push(toUrlOrNull(v as string));
      else if (k === "narrative_text") vals.push(toTextOrNull(v as string, 10000));
      else if (["question_text", "option_a", "option_b", "option_c", "option_d"].includes(k)) vals.push(toTextOrNull(v as string, 500));
      else if (k === "correct_answer") vals.push(v && ["a", "b", "c", "d"].includes(String(v)) ? v : null);
      else vals.push(v);
    }
    if (set.length === 0) throw new AppError(400, "No fields to update");
    vals.push(id);
    const r = await pool.query(`UPDATE campaigns SET ${set.join(", ")} WHERE id = $${i} RETURNING *`, vals);
    if (!r.rows[0]) throw new AppError(404, "Campaign not found");
    res.json(r.rows[0]);
  } catch (e) {
    next(e);
  }
});

/** Upload single brand creative for a campaign (Model B: one viral creative). Users can only watch/share/like. */
adminRouter.post("/campaigns/:id/creative", uploadMiddleware.single("media"), async (req, res, next) => {
  try {
    const { id: campaignId } = req.params;
    if (!req.file) throw new AppError(400, "Media file required");
    const pool = getPool();
    const campaign = await pool.query("SELECT id FROM campaigns WHERE id = $1", [campaignId]).then((r) => r.rows[0]);
    if (!campaign) throw new AppError(404, "Campaign not found");
    const existing = await pool.query(
      "SELECT id FROM creatives WHERE campaign_id = $1 AND is_campaign_creative = true",
      [campaignId]
    ).then((r) => r.rows[0]);
    if (existing) throw new AppError(400, "Campaign already has a brand creative. Replace or delete it first.");
    const mediaUrl = process.env.R2_PUBLIC_URL ? `${process.env.R2_PUBLIC_URL}/${req.file.filename}` : `/uploads/${req.file.filename}`;
    const creativeId = randomUUID();
    await pool.query(
      "INSERT INTO creatives (id, campaign_id, user_id, media_url, is_campaign_creative) VALUES ($1, $2, NULL, $3, true)",
      [creativeId, campaignId, mediaUrl]
    );
    try {
      const redis = getRedisClient();
      await redis.del(`leaderboard:${campaignId}`);
    } catch {
      /* ignore */
    }
    const row = await pool.query(
      "SELECT id, campaign_id, user_id, media_url, engagement_score, unique_views, shares, total_views, total_likes, is_campaign_creative, created_at FROM creatives WHERE id = $1",
      [creativeId]
    ).then((r) => r.rows[0]);
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
});

/** C. Sponsor management */
adminRouter.get("/campaigns/:id/sponsors", async (req, res, next) => {
  try {
    const pool = getPool();
    const rows = await pool.query("SELECT * FROM sponsors WHERE campaign_id = $1", [req.params.id]).then((r) => r.rows);
    res.json({ sponsors: rows });
  } catch (e) {
    next(e);
  }
});

adminRouter.post("/campaigns/:id/sponsors", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sponsor_type, sponsor_name, sponsor_logo, sponsor_url } = req.body;
    if (!sponsor_type || !sponsor_name) throw new AppError(400, "sponsor_type and sponsor_name required");
    const pool = getPool();
    const r = await pool.query(
      `INSERT INTO sponsors (campaign_id, sponsor_type, sponsor_name, sponsor_logo, sponsor_url) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, sponsor_type, sponsor_name, sponsor_logo ?? null, sponsor_url ?? null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    next(e);
  }
});

/** D. User management */
adminRouter.get("/users", async (req, res, next) => {
  try {
    const pool = getPool();
    const search = (req.query.search as string) ?? "";
    let query = `SELECT id, mobile_number, unique_creator_id, role, subscription_status, subscription_expiry,
                 total_score, total_earnings, total_events_participated, total_views_generated, total_likes_generated, total_shares_generated, created_at FROM users WHERE 1=1`;
    const params: string[] = [];
    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (mobile_number ILIKE $${params.length} OR unique_creator_id ILIKE $${params.length})`;
    }
    query += " ORDER BY created_at DESC LIMIT 200";
    const rows = await pool.query(query, params).then((r) => r.rows);
    res.json({ users: rows });
  } catch (e) {
    next(e);
  }
});

/** Admin user detail: user row + CRS breakdown (creator_crs). Not exposed to brand dashboard. */
adminRouter.get("/users/:id", async (req, res, next) => {
  try {
    const pool = getPool();
    const user = await pool.query(
      `SELECT id, mobile_number, unique_creator_id, role, subscription_status, subscription_expiry,
              total_score, total_earnings, total_events_participated, total_views_generated, total_likes_generated, total_shares_generated, creator_tier, created_at
       FROM users WHERE id = $1`,
      [req.params.id]
    ).then((r) => r.rows[0]);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    const [crsRow, tierHistory] = await Promise.all([
      pool.query(
        `SELECT engagement_quality_score, geo_diversity_score, fraud_modifier_score, stability_score, crs_score, last_updated
         FROM creator_crs WHERE user_id = $1`,
        [req.params.id]
      ).then((r) => r.rows[0]),
      getTierHistory(pool, req.params.id, 5),
    ]);
    res.json({
      user,
      crs: crsRow
        ? {
            crs_score: Number(crsRow.crs_score ?? 0),
            engagement_quality_score: Number(crsRow.engagement_quality_score ?? 0),
            geo_diversity_score: Number(crsRow.geo_diversity_score ?? 0),
            fraud_modifier_score: Number(crsRow.fraud_modifier_score ?? 0),
            stability_score: Number(crsRow.stability_score ?? 0),
            last_updated: crsRow.last_updated,
          }
        : null,
      tier_history: tierHistory,
    });
  } catch (e) {
    next(e);
  }
});

/** Admin override creator tier. Records in creator_tier_history with reason admin_override. */
adminRouter.patch("/users/:id/tier", async (req, res, next) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const body = z.object({ creator_tier: z.enum(["bronze", "silver", "gold", "verified"]) }).parse(req.body);
    const current = await pool.query("SELECT creator_tier FROM users WHERE id = $1", [id]).then((r) => r.rows[0]);
    if (!current) throw new AppError(404, "User not found");
    const oldTier = (current.creator_tier as string) || "bronze";
    if (oldTier === body.creator_tier) {
      return res.json({ ok: true, creator_tier: body.creator_tier });
    }
    const crsRow = await pool.query("SELECT crs_score FROM creator_crs WHERE user_id = $1", [id]).then((r) => r.rows[0]);
    const crsScore = crsRow?.crs_score != null ? Number(crsRow.crs_score) : null;
    await pool.query("UPDATE users SET creator_tier = $1 WHERE id = $2", [body.creator_tier, id]);
    await recordTierChange(pool, id, oldTier, body.creator_tier, "admin_override", crsScore);
    res.json({ ok: true, creator_tier: body.creator_tier });
  } catch (e) {
    next(e);
  }
});

adminRouter.patch("/users/:id/suspend", async (req, res, next) => {
  try {
    const pool = getPool();
    await pool.query("UPDATE users SET subscription_status = 'inactive', subscription_expiry = NULL WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/** E. Fraud log */
adminRouter.get("/fraud", async (req, res, next) => {
  try {
    const pool = getPool();
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const rows = await pool.query(
      "SELECT * FROM fraud_log ORDER BY created_at DESC LIMIT $1",
      [limit]
    ).then((r) => r.rows);
    res.json({ events: rows });
  } catch (e) {
    next(e);
  }
});

/** E2. Fraud analytics panel — distribution fraud with factor breakdown for visuals */
adminRouter.get("/fraud-analytics", async (req, res, next) => {
  try {
    const pool = getPool();
    const campaignId = req.query.campaignId as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    let q = "SELECT id, event_type, campaign_id, user_id, fraud_score, ip_concentration, device_duplication_rate, spike_delta, geo_distribution_summary, payload, created_at FROM fraud_log WHERE event_type = 'distribution_fraud'";
    const params: unknown[] = [];
    if (campaignId) {
      params.push(campaignId);
      q += " AND campaign_id = $1";
    }
    q += " ORDER BY created_at DESC LIMIT $" + (params.length + 1);
    params.push(limit);
    const rows = await pool.query(q, params).then((r) => r.rows);
    const summary = rows.length ? {
      avg_fraud_score: rows.reduce((s, r) => s + Number(r.fraud_score ?? 0), 0) / rows.length,
      avg_ip_concentration: rows.reduce((s, r) => s + Number(r.ip_concentration ?? 0), 0) / rows.length,
      avg_device_duplication: rows.reduce((s, r) => s + Number(r.device_duplication_rate ?? 0), 0) / rows.length,
      avg_spike_delta: rows.reduce((s, r) => s + Number(r.spike_delta ?? 0), 0) / rows.length,
    } : null;
    res.json({ events: rows, summary });
  } catch (e) {
    next(e);
  }
});

/** F. Advertiser report export (CSV) */
adminRouter.get("/export/campaign/:campaignId", async (req, res, next) => {
  try {
    const { campaignId } = req.params;
    const dateFrom = (req.query.dateFrom as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dateTo = (req.query.dateTo as string) || new Date().toISOString().slice(0, 10);
    const pool = getPool();
    const rows = await pool.query(
      `SELECT c.user_id AS creator_id, u.unique_creator_id,
              SUM(c.unique_views) AS total_views, SUM(c.unique_views) AS unique_views,
              SUM(COALESCE(c.total_likes, 0)) AS total_likes, SUM(c.shares) AS total_shares,
              SUM(c.engagement_score) AS engagement_score
       FROM creatives c
       JOIN users u ON u.id = c.user_id
       WHERE c.campaign_id = $1 AND c.created_at::date BETWEEN $2::date AND $3::date
       GROUP BY c.user_id, u.unique_creator_id`,
      [campaignId, dateFrom, dateTo]
    ).then((r) => r.rows);
    const header = "creator_id,unique_creator_id,total_views,unique_views,total_likes,total_shares,engagement_score,date_from,date_to\n";
    const csvRows = rows.map((r: Record<string, unknown>) => `${r.creator_id},${r.unique_creator_id ?? ""},${r.total_views},${r.unique_views},${r.total_likes},${r.total_shares},${r.engagement_score},${dateFrom},${dateTo}`);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="advertiser-report-${campaignId}.csv"`);
    res.send(header + csvRows.join("\n"));
  } catch (e) {
    next(e);
  }
});

// ---------- Distribution campaigns (verified performance-based) ----------
const distributionCampaignBody = z.object({
  title: z.string(),
  description: z.string().optional(),
  sponsor_name: z.string(),
  total_budget: z.number(),
  payout_model: z.enum(["tier_based", "fixed_milestone"]),
  min_unique_views_required: z.number().optional(),
  min_engagement_rate_required: z.number().optional(),
  payout_per_milestone: z.number().optional(),
  max_daily_payout_per_user: z.number().optional(),
  tier_config: z.record(z.number()).optional(),
  start_time: z.string(),
  end_time: z.string(),
  brand_owner_id: z.string().uuid().optional(),
  platform_margin_percentage: z.number().min(0).max(100).optional(),
  fraud_buffer_percentage: z.number().min(0).max(50).optional(),
  preset: z.enum(["starter", "growth", "boost"]).optional(),
});

/** Dynamic margin: ≤100k→30%, ≤300k→25%, else 20%. */
function getDynamicMargin(totalBudget: number): number {
  if (totalBudget <= 100_000) return 30;
  if (totalBudget <= 300_000) return 25;
  return 20;
}

adminRouter.get("/distribution/campaigns", async (_req, res, next) => {
  try {
    const pool = getPool();
    const rows = await pool.query("SELECT * FROM distribution_campaigns ORDER BY created_at DESC").then((r) => r.rows);
    res.json({ campaigns: rows });
  } catch (e) {
    next(e);
  }
});

const CAMPAIGN_PRESETS: Record<string, { total_budget: number; payout_model: "fixed_milestone" | "tier_based"; payout_per_milestone?: number; tier_config?: Record<string, number>; max_daily_payout_per_user: number }> = {
  starter: { total_budget: 50000, payout_model: "fixed_milestone", payout_per_milestone: 50, max_daily_payout_per_user: 500 },
  growth: { total_budget: 150000, payout_model: "tier_based", tier_config: { "100": 10, "500": 75, "1000": 200, "2500": 500 }, max_daily_payout_per_user: 800 },
  boost: { total_budget: 300000, payout_model: "tier_based", tier_config: { "100": 15, "500": 100, "1000": 250, "5000": 1000 }, max_daily_payout_per_user: 1200 },
};

adminRouter.post("/distribution/campaigns", async (req, res, next) => {
  try {
    const body = distributionCampaignBody.parse(req.body);
    const pool = getPool();
    const preset = body.preset ? CAMPAIGN_PRESETS[body.preset] : null;
    const total_budget = preset ? preset.total_budget : body.total_budget;
    const payout_model = preset ? preset.payout_model : body.payout_model;
    const payout_per_milestone = preset?.payout_per_milestone ?? body.payout_per_milestone ?? null;
    const tier_config = preset?.tier_config ?? body.tier_config ?? null;
    const max_daily_payout_per_user = preset ? preset.max_daily_payout_per_user : (body.max_daily_payout_per_user ?? 500);
    const platform_margin = body.platform_margin_percentage ?? getDynamicMargin(total_budget);
    const fraud_buffer = body.fraud_buffer_percentage ?? 5;
    const distributable_pool = total_budget * (1 - platform_margin / 100) * (1 - fraud_buffer / 100);
    const r = await pool.query(
      `INSERT INTO distribution_campaigns (title, description, sponsor_name, total_budget, remaining_budget, platform_margin_percentage, fraud_buffer_percentage, payout_model,
        min_unique_views_required, min_engagement_rate_required, payout_per_milestone, max_daily_payout_per_user,
        tier_config, start_time, end_time, brand_owner_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'active') RETURNING *`,
      [
        sanitizeText(body.title, 500), body.description != null ? sanitizeText(body.description, 2000) : null, sanitizeText(body.sponsor_name, 200), total_budget, distributable_pool, platform_margin, fraud_buffer, payout_model,
        body.min_unique_views_required ?? 100, body.min_engagement_rate_required ?? 5,
        payout_per_milestone, max_daily_payout_per_user,
        tier_config ? JSON.stringify(tier_config) : null, body.start_time, body.end_time,
        body.brand_owner_id ?? null,
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/distribution/campaigns/:id/stats", async (req, res, next) => {
  try {
    const pool = getPool();
    const rows = await pool.query(
      `SELECT s.*, u.mobile_number, u.unique_creator_id
       FROM creator_distribution_stats s
       JOIN users u ON u.id = s.user_id
       WHERE s.campaign_id = $1 ORDER BY s.total_earned DESC`,
      [req.params.id]
    ).then((r) => r.rows);
    res.json({ stats: rows });
  } catch (e) {
    next(e);
  }
});

adminRouter.patch("/distribution/campaigns/:id/stats/:userId/payout", async (req, res, next) => {
  try {
    const { id: campaignId, userId } = req.params;
    const { payout_status } = req.body as { payout_status: string };
    const result = await (await import("../services/payoutApproval.js")).approvePayout(campaignId, userId, payout_status);
    res.json(result.held_reason ? { ok: true, payout_status: result.payout_status, held_reason: result.held_reason } : result);
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/distribution/export/:campaignId", async (req, res, next) => {
  try {
    const pool = getPool();
    const rows = await pool.query(
      `SELECT s.user_id AS creator_id, u.unique_creator_id, s.total_unique_views AS total_views,
              s.verified_engagement_rate AS engagement_rate, s.total_earned, s.payout_status, s.fraud_score
       FROM creator_distribution_stats s
       JOIN users u ON u.id = s.user_id
       WHERE s.campaign_id = $1`,
      [req.params.campaignId]
    ).then((r) => r.rows);
    const header = "creator_id,unique_creator_id,total_views,engagement_rate,total_earned,payout_status,fraud_score\n";
    const csvRows = rows.map((r: Record<string, unknown>) => `${r.creator_id},${r.unique_creator_id ?? ""},${r.total_views},${r.engagement_rate},${r.total_earned},${r.payout_status},${r.fraud_score ?? ""}`);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="distribution-report-${req.params.campaignId}.csv"`);
    res.send(header + csvRows.join("\n"));
  } catch (e) {
    next(e);
  }
});
