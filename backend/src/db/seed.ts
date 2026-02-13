import "dotenv/config";
import { getPool } from "../lib/db.js";

async function seed() {
  const pool = getPool();
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  end.setDate(end.getDate() + 30);

  await pool.query(
    `INSERT INTO campaigns (title, description, category, sponsor_name, associate_sponsor, reward_pool, start_time, end_time, status, max_creatives_allowed)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      "Spring 2025 Brand Campaign",
      "Create and share content for our spring product launch. Top creators by engagement score share the reward pool.",
      "direct_ad",
      "Acme Brands",
      "Partner Co",
      50000,
      start,
      end,
      "active",
      2,
    ]
  );

  await pool.query(
    `INSERT INTO campaigns (title, description, category, sponsor_name, reward_pool, start_time, end_time, status, max_creatives_allowed)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      "Knowledge Series: Tech Tips",
      "Sponsored educational content. Earn score through views and shares.",
      "sponsored_knowledge",
      "TechEd Foundation",
      25000,
      start,
      end,
      "active",
      2,
    ]
  );

  console.log("Seed done. You should see campaigns on the dashboard.");
  await pool.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
