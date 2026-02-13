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
  const path = join(process.cwd(), "src", "db", "migrations", "012_otp_verification.sql");
  if (!existsSync(path)) throw new Error("012_otp_verification.sql not found");
  const sql = readFileSync(path, "utf-8");
  await pool.query(sql);
  console.log("OTP verification migration applied.");
  await pool.end();
}

migrate().catch((e: Error & { code?: string }) => {
  console.error(e.message || e);
  process.exit(1);
});
