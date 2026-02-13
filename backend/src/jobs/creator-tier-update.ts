import "dotenv/config";
import { getPool } from "../lib/db.js";
import {
  isAutoTierSystemEnabled,
  getUsersWithRecentCRS,
  applyTierUpdate,
  tierIndex,
} from "../services/creatorTierService.js";

function notifyCreator(userId: string, event: "promotion" | "demotion"): void {
  if (event === "promotion") {
    console.log(`[tier-update] Creator ${userId}: promotion – notify: "Congratulations! Your reliability score improved."`);
  } else {
    console.log(`[tier-update] Creator ${userId}: demotion – notify: "Your performance consistency dropped. Improve engagement quality."`);
  }
}

/**
 * Scheduled job: CRS-based tier promotion/demotion.
 * Only runs when ENABLE_AUTO_TIER_SYSTEM is true.
 * Fetches users with CRS updated in last 7 days; applies at most one tier change per user.
 */
async function run() {
  if (!isAutoTierSystemEnabled()) {
    console.log("creator:tier-update skipped (ENABLE_AUTO_TIER_SYSTEM is false)");
    process.exit(0);
  }

  const pool = getPool();
  const users = await getUsersWithRecentCRS(pool);
  let promoted = 0;
  let demoted = 0;

  for (const { user_id, creator_tier, crs_score } of users) {
    try {
      const { updated, newTier } = await applyTierUpdate(pool, user_id, creator_tier, crs_score, notifyCreator);
      if (updated && newTier) {
        if (tierIndex(newTier) > tierIndex(creator_tier)) promoted++;
        else demoted++;
      }
    } catch (e) {
      console.warn(`creator:tier-update failed for user ${user_id}:`, e);
    }
  }

  console.log(`creator:tier-update: ${users.length} users with recent CRS; ${promoted} promoted, ${demoted} demoted`);
  await pool.end();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
