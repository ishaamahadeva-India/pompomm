import "dotenv/config";
import { getPool } from "../lib/db.js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const pool = getPool();
  const path = join(process.cwd(), "src", "db", "migrations", "003_distribution_campaigns.sql");
  if (!existsSync(path)) throw new Error("003_distribution_campaigns.sql not found");
  const sql = readFileSync(path, "utf-8");
  await pool.query(sql);
  console.log("Distribution campaigns migration applied.");
  await pool.end();
}

migrate().catch((e: Error & { code?: string }) => {
  console.error(e.message || e);
  process.exit(1);
});
