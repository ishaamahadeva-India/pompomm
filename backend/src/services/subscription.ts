import { getPool } from "../lib/db.js";
import { AppError } from "../middleware/errorHandler.js";
import { v4 as uuid } from "uuid";

export const subscriptionService = {
  async getStatus(userId: string): Promise<{
    subscription_status: string;
    subscription_expiry: string | null;
    total_events_participated: number;
    total_earnings: number;
  }> {
    const pool = getPool();
    const row = await pool.query(
      `SELECT subscription_status, subscription_expiry,
              COALESCE(total_events_participated, 0) AS total_events_participated,
              COALESCE(total_earnings, 0) AS total_earnings
       FROM users WHERE id = $1`,
      [userId]
    ).then((r) => r.rows[0]);
    if (!row) throw new AppError(404, "User not found");
    return {
      subscription_status: row.subscription_status ?? "inactive",
      subscription_expiry: row.subscription_expiry ? new Date(row.subscription_expiry).toISOString() : null,
      total_events_participated: Number(row.total_events_participated) ?? 0,
      total_earnings: Number(row.total_earnings) ?? 0,
    };
  },

  async isActive(userId: string): Promise<boolean> {
    const pool = getPool();
    const row = await pool.query(
      "SELECT subscription_status, subscription_expiry FROM users WHERE id = $1",
      [userId]
    ).then((r) => r.rows[0]);
    if (!row) return false;
    if (row.subscription_status !== "active") return false;
    if (row.subscription_expiry && new Date(row.subscription_expiry) < new Date()) return false;
    return true;
  },

  async activate(userId: string, transactionId?: string): Promise<{ success: boolean; expiry: string }> {
    const pool = getPool();
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // 30 days
    await pool.query(
      `INSERT INTO subscriptions (id, user_id, amount, start_date, end_date, payment_status, transaction_id)
       VALUES ($1, $2, 30, $3, $4, 'completed', $5)`,
      [uuid(), userId, startDate, endDate, transactionId ?? null]
    );
    await pool.query(
      `UPDATE users SET subscription_status = 'active', subscription_expiry = $1 WHERE id = $2`,
      [endDate, userId]
    );
    return { success: true, expiry: endDate.toISOString() };
  },
};
