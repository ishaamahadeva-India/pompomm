import "dotenv/config";
import { getPool } from "../lib/db.js";
import { computeFraudScore } from "../services/fraudScoring.js";

/** Run fraud scoring in 5-minute batches to reduce DB spikes. Schedule via cron every 5 min. */
const RECENT_MINUTES = 6;

async function run() {
  const pool = getPool();
  const rows = await pool.query(
    `SELECT campaign_id, user_id FROM creator_distribution_stats
     WHERE last_updated > NOW() - INTERVAL '1 minute' * $1`,
    [RECENT_MINUTES]
  ).then((r) => r.rows as { campaign_id: string; user_id: string }[]);

  let done = 0;
  for (const { campaign_id, user_id } of rows) {
    try {
      await computeFraudScore(campaign_id, user_id);
      done++;
    } catch (e) {
      console.warn(`Fraud scoring failed for campaign ${campaign_id} user ${user_id}:`, e);
    }
  }

  console.log(`Fraud scoring batch: ${done}/${rows.length} creators processed`);
  await pool.end();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
