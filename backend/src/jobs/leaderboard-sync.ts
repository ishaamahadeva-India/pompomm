import "dotenv/config";
import { getPool } from "../lib/db.js";
import { leaderboardService } from "../services/leaderboard.js";
import { setLeaderboardCache } from "../lib/redis.js";

const CACHE_TTL = 900; // 15 minutes — reduces Redis/compute for small brands

async function sync() {
  const pool = getPool();
  const campaigns = await pool.query(
    "SELECT id FROM campaigns WHERE status = 'active'"
  ).then((r) => r.rows as { id: string }[]);

  const today = new Date().toISOString().slice(0, 10);
  for (const { id } of campaigns) {
    const entries = await leaderboardService.refreshLeaderboard(id);
    if (entries.length > 0) {
      await setLeaderboardCache(id, entries, CACHE_TTL);
      await leaderboardService.persistSnapshot(id, today);
      console.log(`Refreshed leaderboard for campaign ${id}: ${entries.length} entries`);
    }
  }
  await pool.end();
  process.exit(0);
}

sync().catch((e) => {
  console.error(e);
  process.exit(1);
});
