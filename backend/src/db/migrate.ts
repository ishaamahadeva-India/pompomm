import "dotenv/config";
import { getPool } from "../lib/db.js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Create a .env file in the backend folder with:");
    console.error("  DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres");
    process.exit(1);
  }
  const pool = getPool();
  const schemaPath = join(process.cwd(), "src", "db", "schema.sql");
  if (!existsSync(schemaPath)) throw new Error("schema.sql not found at " + schemaPath);
  const schema = readFileSync(schemaPath, "utf-8");
  await pool.query(schema);
  console.log("Schema applied.");
  await pool.end();
}

migrate().catch((e: Error & { code?: string }) => {
  if (e.code === "ECONNREFUSED") {
    console.error("Database connection refused. Check that:");
    console.error("  1. PostgreSQL is running (or use Supabase and set DATABASE_URL)");
    console.error("  2. DATABASE_URL in .env is correct (e.g. postgresql://user:pass@host:5432/dbname)");
  }
  console.error(e.message || e);
  process.exit(1);
});
