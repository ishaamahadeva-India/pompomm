import "dotenv/config";
import { getPool } from "../lib/db.js";
import { recalculateCreatorEarnings } from "../services/payoutEngine.js";

/** Recalculates earnings only. Fraud scoring runs in 5-min batches (fraud-scoring-batch.ts) to reduce DB spikes. */
async function run() {
  const pool = getPool();
  const campaigns = await pool.query(
    "SELECT id FROM distribution_campaigns WHERE status = 'active'"
  ).then((r) => r.rows as { id: string }[]);

  for (const { id: campaignId } of campaigns) {
    const creators = await pool.query(
      "SELECT user_id FROM creator_distribution_stats WHERE campaign_id = $1",
      [campaignId]
    ).then((r) => r.rows as { user_id: string }[]);

    for (const { user_id } of creators) {
      await recalculateCreatorEarnings(campaignId, user_id);
    }
  }

  console.log("Distribution payout batch done (earnings only; fraud runs in fraud-scoring-batch).");
  await pool.end();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
