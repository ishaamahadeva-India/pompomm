import { Router } from "express";
import { leaderboardService } from "../services/leaderboard.js";
import { optionalAuth } from "../middleware/auth.js";

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
