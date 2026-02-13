import { Router } from "express";
import { leaderboardService } from "../services/leaderboard.js";
import { optionalAuth } from "../middleware/auth.js";
import { getPool } from "../lib/db.js";

export const leaderboardRouter = Router();

/** GET /leaderboard/export?campaignId=&... - CSV (must be before /:campaignId) */
leaderboardRouter.get("/export", optionalAuth, async (req, res, next) => {
  try {
    const campaignId = req.query.campaignId as string | undefined;
    if (!campaignId) {
      return res.status(400).json({ error: "campaignId required" });
    }
    const { entries } = await leaderboardService.getLeaderboardFiltered(
      {
        campaignId,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        sponsor: req.query.sponsor as string | undefined,
        category: req.query.category as string | undefined,
        search: req.query.search as string | undefined,
      },
      undefined
    );
    const header = "rank,creator_id,display_id,total_score,unique_views,total_likes,shares\n";
    const rows = entries
      .map(
        (e) =>
          `${e.rank},${e.user_id},${String(e.display_id ?? "").replace(/,/g, " ")},${e.total_score},${e.unique_views},${e.total_likes ?? 0},${e.shares}`
      )
      .join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="leaderboard-${campaignId}.csv"`);
    res.send(header + rows);
  } catch (e) {
    next(e);
  }
});

/** GET /leaderboard?campaignId=&dateFrom=&dateTo=&sponsor=&category=&search= */
leaderboardRouter.get("/", optionalAuth, async (req, res, next) => {
  try {
    const campaignId = req.query.campaignId as string | undefined;
    const userId = (req as any).userId as string | undefined;
    if (campaignId) {
      const result = await leaderboardService.getLeaderboardFiltered(
        {
          campaignId,
          dateFrom: req.query.dateFrom as string | undefined,
          dateTo: req.query.dateTo as string | undefined,
          sponsor: req.query.sponsor as string | undefined,
          category: req.query.category as string | undefined,
          search: req.query.search as string | undefined,
        },
        userId
      );
      return res.json(result);
    }
    res.json({ entries: [], currentUserRank: null, refreshedAt: new Date().toISOString() });
  } catch (e) {
    next(e);
  }
});

/** GET /leaderboard/top-earners?period=all|week|month — for motivation */
leaderboardRouter.get("/top-earners", optionalAuth, async (req, res, next) => {
  try {
    const period = (req.query.period as string) || "all";
    const pool = getPool();
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    if (period === "all") {
      const { rows } = await pool.query(
        `SELECT u.id AS user_id, u.display_name, u.profile_image_url, u.total_earnings AS amount
         FROM users u WHERE u.role = 'user' ORDER BY u.total_earnings DESC NULLS LAST LIMIT $1`,
        [limit]
      );
      return res.json({
        period: "all",
        entries: rows.map((r: Record<string, unknown>, i: number) => ({
          rank: i + 1,
          user_id: r.user_id,
          display_name: r.display_name ?? "Creator",
          profile_image_url: r.profile_image_url ?? null,
          amount: Number(r.amount) ?? 0,
        })),
      });
    }

    if (period === "week" || period === "month") {
      const days = period === "week" ? 7 : 30;
      const { rows } = await pool.query(
        `SELECT d.user_id, u.display_name, u.profile_image_url, SUM(d.amount)::numeric AS amount
         FROM distribution_daily_payouts d
         JOIN users u ON u.id = d.user_id
         WHERE d.payout_date >= CURRENT_DATE - $1::int * INTERVAL '1 day'
         GROUP BY d.user_id, u.display_name, u.profile_image_url
         ORDER BY amount DESC
         LIMIT $2`,
        [days, limit]
      );
      const entries = rows.map((r: Record<string, unknown>, i: number) => ({
        rank: i + 1,
        user_id: r.user_id,
        display_name: r.display_name ?? "Creator",
        profile_image_url: r.profile_image_url ?? null,
        amount: Number(r.amount) ?? 0,
      }));
      return res.json({ period, entries });
    }

    return res.status(400).json({ error: "period must be all, week, or month" });
  } catch (e) {
    next(e);
  }
});

/** Backward compatible: GET /leaderboard/:campaignId */
leaderboardRouter.get("/:campaignId", optionalAuth, async (req, res, next) => {
  try {
    const { campaignId } = req.params;
    const userId = (req as any).userId as string | undefined;
    const result = await leaderboardService.getLeaderboard(campaignId, userId);
    res.json(result);
  } catch (e) {
    next(e);
  }
});
