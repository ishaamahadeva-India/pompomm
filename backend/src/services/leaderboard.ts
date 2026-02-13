import { getPool } from "../lib/db.js";
import {
  getLeaderboardFromCache,
  setLeaderboardCache,
  type LeaderboardEntry,
} from "../lib/redis.js";

const CACHE_TTL_SECONDS = 900; // 15 minutes — cost optimization for small brands

export type LeaderboardFilters = {
  campaignId?: string;
  dateFrom?: string;
  dateTo?: string;
  sponsor?: string;
  category?: string;
  search?: string;
};

export const leaderboardService = {
  async getLeaderboard(campaignId: string, currentUserId?: string): Promise<{
    entries: LeaderboardEntry[];
    currentUserRank: number | null;
    refreshedAt: string;
  }> {
    let entries = await getLeaderboardFromCache(campaignId);
    if (!entries || entries.length === 0) {
      entries = await this.refreshLeaderboard(campaignId);
      if (entries.length > 0) {
        await setLeaderboardCache(campaignId, entries, CACHE_TTL_SECONDS);
      }
    }

    let currentUserRank: number | null = null;
    if (currentUserId) {
      const idx = entries.findIndex((e) => e.user_id === currentUserId);
      if (idx >= 0) currentUserRank = idx + 1;
    }

    return {
      entries,
      currentUserRank,
      refreshedAt: new Date().toISOString(),
    };
  },

  async getLeaderboardFiltered(
    filters: LeaderboardFilters,
    currentUserId?: string
  ): Promise<{ entries: LeaderboardEntry[]; currentUserRank: number | null; refreshedAt: string }> {
    const campaignId = filters.campaignId;
    if (!campaignId) {
      return { entries: [], currentUserRank: null, refreshedAt: new Date().toISOString() };
    }
    const cacheKey = `lb:${campaignId}:${(filters.dateFrom ?? "").slice(0, 10)}:${(filters.dateTo ?? "").slice(0, 10)}:${filters.sponsor ?? ""}:${filters.category ?? ""}:${(filters.search ?? "").slice(0, 50)}`;
    let entries: LeaderboardEntry[] | null = null;
    try {
      entries = await getLeaderboardFromCache(cacheKey);
    } catch {
      entries = null;
    }
    if (!entries || entries.length === 0) {
      entries = await this.refreshLeaderboardFiltered(filters);
      if (entries.length > 0) {
        await setLeaderboardCache(cacheKey, entries, CACHE_TTL_SECONDS);
      }
    }
    let currentUserRank: number | null = null;
    if (currentUserId) {
      const idx = entries.findIndex((e) => e.user_id === currentUserId);
      if (idx >= 0) currentUserRank = idx + 1;
    }
    return { entries, currentUserRank, refreshedAt: new Date().toISOString() };
  },

  async refreshLeaderboard(campaignId: string): Promise<LeaderboardEntry[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT c.user_id, u.mobile_number, u.unique_creator_id,
              SUM(c.engagement_score) AS total_score,
              SUM(c.unique_views) AS unique_views,
              SUM(COALESCE(c.total_likes, 0)) AS total_likes,
              SUM(c.shares) AS shares
       FROM creatives c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.campaign_id = $1
       GROUP BY c.user_id, u.mobile_number, u.unique_creator_id
       ORDER BY total_score DESC
       LIMIT 100`,
      [campaignId]
    );

    return result.rows.map((row, i) => ({
      rank: i + 1,
      user_id: row.user_id ?? "",
      display_id: row.user_id == null ? "Brand" : (row.unique_creator_id ?? (row.mobile_number ? `***${String(row.mobile_number).slice(-4)}` : "Anonymous")),
      unique_creator_id: row.unique_creator_id ?? undefined,
      total_score: Number(row.total_score) || 0,
      unique_views: Number(row.unique_views) || 0,
      total_likes: Number(row.total_likes) || 0,
      shares: Number(row.shares) || 0,
    }));
  },

  async refreshLeaderboardFiltered(filters: LeaderboardFilters): Promise<LeaderboardEntry[]> {
    const pool = getPool();
    const { campaignId, category, sponsor, search } = filters;
    if (!campaignId) return [];

    const params: (string | number)[] = [campaignId];
    let paramIdx = 2;
    let query = `
      SELECT c.user_id, u.mobile_number, u.unique_creator_id,
             SUM(c.engagement_score) AS total_score,
             SUM(c.unique_views) AS unique_views,
             SUM(COALESCE(c.total_likes, 0)) AS total_likes,
             SUM(c.shares) AS shares
      FROM creatives c
      LEFT JOIN users u ON u.id = c.user_id
      JOIN campaigns camp ON camp.id = c.campaign_id
      WHERE c.campaign_id = $1`;

    if (category) {
      params.push(category);
      query += ` AND camp.category = $${paramIdx++}`;
    }
    if (sponsor) {
      params.push(`%${sponsor}%`);
      query += ` AND EXISTS (SELECT 1 FROM sponsors s WHERE s.campaign_id = camp.id AND s.sponsor_name ILIKE $${paramIdx++})`;
    }
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (u.unique_creator_id ILIKE $${paramIdx} OR u.mobile_number::text ILIKE $${paramIdx})`;
      paramIdx++;
    }

    query += ` GROUP BY c.user_id, u.mobile_number, u.unique_creator_id ORDER BY total_score DESC LIMIT 100`;
    const result = await pool.query(query, params);

    return result.rows.map((row, i) => ({
      rank: i + 1,
      user_id: row.user_id ?? "",
      display_id: row.user_id == null ? "Brand" : (row.unique_creator_id ?? (row.mobile_number ? `***${String(row.mobile_number).slice(-4)}` : "Anonymous")),
      unique_creator_id: row.unique_creator_id ?? undefined,
      total_score: Number(row.total_score) || 0,
      unique_views: Number(row.unique_views) || 0,
      total_likes: Number(row.total_likes) || 0,
      shares: Number(row.shares) || 0,
    }));
  },

  async persistSnapshot(campaignId: string, date?: string): Promise<void> {
    const pool = getPool();
    const entries = await this.refreshLeaderboard(campaignId);
    const snapshotDate = date || new Date().toISOString().slice(0, 10);
    for (const e of entries) {
      if (!e.user_id) continue;
      await pool.query(
        `INSERT INTO leaderboard_snapshots (campaign_id, user_id, rank, total_score, total_unique_views, total_likes, total_shares, snapshot_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date)`,
        [campaignId, e.user_id, e.rank, e.total_score, e.unique_views, e.total_likes ?? 0, e.shares, snapshotDate]
      );
    }
  },
};
