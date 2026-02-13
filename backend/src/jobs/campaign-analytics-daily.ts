import "dotenv/config";
import { getPool } from "../lib/db.js";

/** Batch update campaign_analytics_daily for yesterday from referral_tracking. Run daily. */
async function run() {
  const pool = getPool();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().slice(0, 10);

  const campaigns = await pool.query(
    "SELECT DISTINCT campaign_id FROM referral_tracking WHERE created_at::date = $1::date",
    [dateStr]
  ).then((r) => r.rows as { campaign_id: string }[]);

  for (const { campaign_id } of campaigns) {
    const agg = await pool.query(
      `SELECT
         COUNT(CASE WHEN engagement_action = 'view' THEN 1 END) AS total_views,
         COUNT(DISTINCT CASE WHEN engagement_action = 'view' THEN COALESCE(visitor_user_id::text, visitor_ip::text || COALESCE(device_hash,'')) END) AS unique_views,
         COUNT(CASE WHEN engagement_action = 'like' THEN 1 END) AS likes,
         COUNT(CASE WHEN engagement_action = 'share' THEN 1 END) AS shares
       FROM referral_tracking WHERE campaign_id = $1 AND created_at::date = $2::date`,
      [campaign_id, dateStr]
    ).then((r) => r.rows[0]);

    const totalViews = Number(agg?.total_views ?? 0);
    const uniqueViews = Number(agg?.unique_views ?? 0);
    const likes = Number(agg?.likes ?? 0);
    const shares = Number(agg?.shares ?? 0);
    const engagementRate = uniqueViews > 0 ? ((likes + shares) / uniqueViews) * 100 : 0;

    const geo = await pool.query(
      `SELECT country, COUNT(*) AS cnt FROM referral_tracking WHERE campaign_id = $1 AND created_at::date = $2::date AND country IS NOT NULL GROUP BY country`,
      [campaign_id, dateStr]
    ).then((r) => r.rows.reduce((acc: Record<string, number>, row: { country: string; cnt: string }) => { acc[row.country] = Number(row.cnt); return acc; }, {}));

    const device = await pool.query(
      `SELECT device_type, COUNT(*) AS cnt FROM referral_tracking WHERE campaign_id = $1 AND created_at::date = $2::date AND device_type IS NOT NULL GROUP BY device_type`,
      [campaign_id, dateStr]
    ).then((r) => r.rows.reduce((acc: Record<string, number>, row: { device_type: string; cnt: string }) => { acc[row.device_type] = Number(row.cnt); return acc; }, {}));

    await pool.query(
      `INSERT INTO campaign_analytics_daily (campaign_id, date, total_views, unique_views, likes, shares, avg_engagement_rate, geo_breakdown, device_breakdown)
       VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (campaign_id, date) DO UPDATE SET
         total_views = EXCLUDED.total_views, unique_views = EXCLUDED.unique_views, likes = EXCLUDED.likes, shares = EXCLUDED.shares,
         avg_engagement_rate = EXCLUDED.avg_engagement_rate, geo_breakdown = EXCLUDED.geo_breakdown, device_breakdown = EXCLUDED.device_breakdown`,
      [campaign_id, dateStr, totalViews, uniqueViews, likes, shares, engagementRate.toFixed(2), JSON.stringify(geo), JSON.stringify(device)]
    );
  }
  console.log(`campaign_analytics_daily: updated ${campaigns.length} campaigns for ${dateStr}`);
  await pool.end();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
