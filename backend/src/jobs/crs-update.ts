import "dotenv/config";
import { getPool } from "../lib/db.js";
import { calculateCRS, upsertCreatorCRS } from "../services/crsEngine.js";
import { setCRSCache } from "../lib/redis.js";

/**
 * CRS update job: creators who participated in last 7 days.
 * Recalculates CRS, upserts creator_crs, updates Redis cache. Non-blocking; run on schedule.
 */
async function run() {
  const pool = getPool();
  const creators = await pool.query(
    `SELECT DISTINCT user_id FROM creator_distribution_stats WHERE last_updated > NOW() - INTERVAL '7 days'`
  ).then((r) => r.rows as { user_id: string }[]);

  let updated = 0;
  for (const { user_id } of creators) {
    try {
      const row = await calculateCRS(pool, user_id);
      if (!row) continue;
      await upsertCreatorCRS(pool, row);
      await setCRSCache(user_id, {
        crs_score: row.crs_score,
        engagement_quality_score: row.engagement_quality_score,
        geo_diversity_score: row.geo_diversity_score,
        fraud_modifier_score: row.fraud_modifier_score,
        stability_score: row.stability_score,
      });
      updated++;
    } catch (e) {
      console.warn(`CRS update failed for user ${user_id}:`, e);
    }
  }

  console.log(`CRS update: ${updated}/${creators.length} creators updated`);
  await pool.end();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
