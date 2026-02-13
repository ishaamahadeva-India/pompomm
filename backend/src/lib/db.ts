import dns from "dns";
import pg from "pg";

// Prefer IPv4 so Render (and other hosts without IPv6) can reach DBs that resolve to IPv6
dns.setDefaultResultOrder("ipv4first");

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    pool.on("error", (e) => console.error("DB pool error:", e));
  }
  return pool;
}

export type UserRow = {
  id: string;
  mobile_number: string;
  role: "user" | "admin";
  total_score: number;
  total_earnings: number;
  created_at: Date;
};

export type CampaignRow = {
  id: string;
  title: string;
  description: string;
  category: "direct_ad" | "sponsored_knowledge";
  sponsor_name: string;
  associate_sponsor: string | null;
  reward_pool: number;
  start_time: Date;
  end_time: Date;
  status: "upcoming" | "active" | "completed";
  created_at: Date;
};

export type CreativeRow = {
  id: string;
  campaign_id: string;
  user_id: string;
  media_url: string;
  engagement_score: number;
  unique_views: number;
  shares: number;
  created_at: Date;
};

export type CampaignViewRow = {
  id: string;
  creative_id: string;
  user_id: string;
  ip_address: string;
  device_hash: string;
  watched_seconds: number;
  created_at: Date;
};
