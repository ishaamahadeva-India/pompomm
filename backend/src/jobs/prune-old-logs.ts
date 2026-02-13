import "dotenv/config";
import { getPool } from "../lib/db.js";

/** Small brands: 30 days. Enterprise: set LOG_RETENTION_DAYS=90 to keep 90 days. */
const RETENTION_DAYS = Math.min(365, Math.max(7, Number(process.env.LOG_RETENTION_DAYS) || 30));

/** Prune campaign_views and fraud_log older than RETENTION_DAYS for cost optimization. */
async function prune() {
  const pool = getPool();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  const r1 = await pool.query("DELETE FROM campaign_views WHERE created_at < $1", [cutoff]);
  const r2 = await pool.query("DELETE FROM fraud_log WHERE created_at < $1", [cutoff]);

  console.log(`Pruned ${r1.rowCount ?? 0} campaign_views, ${r2.rowCount ?? 0} fraud_log rows older than ${RETENTION_DAYS} days`);
  await pool.end();
  process.exit(0);
}

prune().catch((e) => {
  console.error(e);
  process.exit(1);
});
