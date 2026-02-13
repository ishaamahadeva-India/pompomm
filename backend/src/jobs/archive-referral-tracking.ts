import "dotenv/config";
import { getPool } from "../lib/db.js";

/** Small brands: 30 days. Enterprise: set LOG_RETENTION_DAYS=90 to keep 90 days. */
const CUTOFF_DAYS = Math.min(365, Math.max(7, Number(process.env.LOG_RETENTION_DAYS) || 30));

/** Snapshot then prune: aggregate referral_tracking older than CUTOFF_DAYS into campaign_monthly_snapshot, then delete. */
async function run() {
  const pool = getPool();
  const cutoff = new Date(Date.now() - CUTOFF_DAYS * 24 * 60 * 60 * 1000);

  const snapshots = await pool.query(
    `SELECT campaign_id, to_char(created_at, 'YYYY-MM') AS year_month,
      COUNT(CASE WHEN engagement_action = 'view' THEN 1 END) AS total_views,
      COUNT(DISTINCT CASE WHEN engagement_action = 'view' THEN COALESCE(visitor_user_id::text, visitor_ip::text || COALESCE(device_hash,'')) END) AS unique_views,
      COUNT(CASE WHEN engagement_action = 'like' THEN 1 END) AS total_likes,
      COUNT(CASE WHEN engagement_action = 'share' THEN 1 END) AS total_shares
     FROM referral_tracking
     WHERE created_at < $1
     GROUP BY campaign_id, to_char(created_at, 'YYYY-MM')`,
    [cutoff]
  ).then((r) => r.rows);

  for (const row of snapshots) {
    const fraudCount = await pool.query(
      `SELECT COUNT(*) AS c FROM fraud_log WHERE campaign_id = $1 AND event_type = 'distribution_fraud' AND to_char(created_at, 'YYYY-MM') = $2`,
      [row.campaign_id, row.year_month]
    ).then((r) => Number(r.rows[0]?.c ?? 0));

    const totalEngagement =
      Number(row.total_views ?? 0) * 1 +
      Number(row.total_likes ?? 0) * 2 +
      Number(row.total_shares ?? 0) * 3;
    await pool.query(
      `INSERT INTO campaign_monthly_snapshot (campaign_id, year_month, total_views, unique_views, total_engagement, total_paid_out, fraud_cases_count)
       VALUES ($1, $2, $3, $4, $5, 0, $6)
       ON CONFLICT (campaign_id, year_month) DO UPDATE SET
         total_views = campaign_monthly_snapshot.total_views + EXCLUDED.total_views,
         unique_views = campaign_monthly_snapshot.unique_views + EXCLUDED.unique_views,
         total_engagement = campaign_monthly_snapshot.total_engagement + EXCLUDED.total_engagement,
         fraud_cases_count = campaign_monthly_snapshot.fraud_cases_count + EXCLUDED.fraud_cases_count`,
      [row.campaign_id, row.year_month, row.total_views, row.unique_views, totalEngagement, fraudCount]
    );
  }
  if (snapshots.length) console.log(`Snapshot: ${snapshots.length} campaign-month rows written to campaign_monthly_snapshot`);

  const r = await pool.query("DELETE FROM referral_tracking WHERE created_at < $1", [cutoff]);
  console.log(`Pruned ${r.rowCount ?? 0} referral_tracking rows older than ${CUTOFF_DAYS} days (LOG_RETENTION_DAYS=${process.env.LOG_RETENTION_DAYS ?? "30"})`);
  await pool.end();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
