import { Router } from "express";
import { getPool } from "../lib/db.js";
import { AppError } from "../middleware/errorHandler.js";

export const campaignsRouter = Router();

campaignsRouter.get("/", async (req, res, next) => {
  try {
    const pool = getPool();
    const status = (req.query.status as string) ?? "active";
    const category = req.query.category as string | undefined;
    let query = "SELECT * FROM campaigns WHERE status = $1";
    const params: string[] = [status];
    if (category && ["direct_ad", "sponsored_knowledge"].includes(category)) {
      params.push(category);
      query += " AND category = $2";
    }
    query += " ORDER BY start_time DESC";
    const result = await pool.query(query, params);
    res.json({ campaigns: result.rows });
  } catch (e) {
    next(e);
  }
});

campaignsRouter.get("/:id", async (req, res, next) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const campaign = await pool.query("SELECT * FROM campaigns WHERE id = $1", [id]).then((r) => r.rows[0]);
    if (!campaign) throw new AppError(404, "Campaign not found");
    const sponsors = await pool
      .query(
        "SELECT id, sponsor_type, sponsor_name, sponsor_logo, sponsor_url FROM sponsors WHERE campaign_id = $1 ORDER BY CASE sponsor_type WHEN 'main_sponsor' THEN 1 WHEN 'associate_sponsor' THEN 2 ELSE 3 END",
        [id]
      )
      .then((r) => r.rows)
      .catch(() => []);
    res.json({ ...campaign, sponsors });
  } catch (e) {
    next(e);
  }
});

campaignsRouter.get("/:id/creatives", async (req, res, next) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const creatives = await pool
      .query(
        `SELECT id, campaign_id, user_id, media_url,
                engagement_score,
                COALESCE(total_views, unique_views) AS total_views,
                unique_views AS total_unique_views,
                COALESCE(total_likes, 0) AS total_likes,
                shares,
                created_at,
                COALESCE(is_campaign_creative, false) AS is_campaign_creative,
                ROW_NUMBER() OVER (ORDER BY engagement_score DESC)::int AS rank
         FROM creatives WHERE campaign_id = $1 ORDER BY engagement_score DESC`,
        [id]
      )
      .then((r) => r.rows);
    res.json({ creatives });
  } catch (e) {
    next(e);
  }
});
