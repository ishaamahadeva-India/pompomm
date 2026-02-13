import { getPool } from "../lib/db.js";
import { v4 as uuid } from "uuid";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_EXPIRY = "7d";
const REFRESH_EXPIRY_DAYS = 30;
const MAX_ACCOUNTS_PER_DEVICE = 3;
const JWT_SECRET = process.env.JWT_SECRET || process.env.SECRET || "change-me-in-production";

export type TokenPayload = { userId: string; role?: string };

/** Hash refresh token for storage */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Backward compatibility: validate legacy base64 token */
async function validateLegacyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64").toString());
    if (payload?.userId) return { userId: payload.userId };
  } catch {
    // ignore
  }
  return null;
}

export const authService = {
  async login(
    mobile_number: string,
    device_hash?: string | null
  ): Promise<{
    user: { id: string; mobile_number: string; role: string; creator_tier?: string };
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const pool = getPool();
    const normalized = mobile_number.replace(/\D/g, "").slice(-10);
    if (normalized.length < 10) {
      throw new Error("Invalid mobile number");
    }
    const fullNumber = `+${normalized}`;

    if (device_hash) {
      const countResult = await pool.query(
        "SELECT COUNT(DISTINCT id) AS c FROM users WHERE device_hash = $1",
        [device_hash]
      ).then((r) => r.rows[0]);
      const count = Number(countResult?.c ?? 0);
      if (count >= MAX_ACCOUNTS_PER_DEVICE) {
        await pool.query(
          "UPDATE users SET device_suspicious = TRUE WHERE device_hash = $1",
          [device_hash]
        );
      }
    }

    let row = await pool.query(
      "SELECT id, mobile_number, role, creator_tier FROM users WHERE mobile_number = $1",
      [fullNumber]
    ).then((r) => r.rows[0]);

    if (!row) {
      const id = uuid();
      await pool.query(
        "INSERT INTO users (id, mobile_number, role, device_hash) VALUES ($1, $2, 'user', $3)",
        [id, fullNumber, device_hash || null]
      );
      row = { id, mobile_number: fullNumber, role: "user", creator_tier: "bronze" };
    } else if (device_hash) {
      await pool.query("UPDATE users SET device_hash = $1 WHERE id = $2", [device_hash, row.id]);
    }

    const payload: TokenPayload = { userId: row.id, role: row.role };
    const accessToken = jwt.sign(payload, JWT_SECRET, { algorithm: "HS256", expiresIn: ACCESS_EXPIRY });
    const decoded = jwt.decode(accessToken) as { exp?: number };
    const expiresIn = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 7 * 24 * 3600;

    const refreshToken = crypto.randomBytes(32).toString("hex");
    const refreshExpiry = new Date(Date.now() + REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    await pool.query(
      "INSERT INTO refresh_tokens (user_id, token_hash, device_hash, expires_at) VALUES ($1, $2, $3, $4)",
      [row.id, hashToken(refreshToken), device_hash || null, refreshExpiry]
    );

    return {
      user: {
        id: row.id,
        mobile_number: row.mobile_number,
        role: row.role,
        creator_tier: row.creator_tier || "bronze",
      },
      accessToken,
      refreshToken,
      expiresIn,
    };
  },

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> {
    const pool = getPool();
    const hashed = hashToken(refreshToken);
    const row = await pool.query(
      "SELECT user_id FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW()",
      [hashed]
    ).then((r) => r.rows[0]);
    if (!row) return null;

    await pool.query("DELETE FROM refresh_tokens WHERE token_hash = $1", [hashed]);

    const user = await pool.query("SELECT id, role FROM users WHERE id = $1", [row.user_id]).then((r) => r.rows[0]);
    if (!user) return null;

    const payload: TokenPayload = { userId: user.id, role: user.role };
    const accessToken = jwt.sign(payload, JWT_SECRET, { algorithm: "HS256", expiresIn: ACCESS_EXPIRY });
    const decoded = jwt.decode(accessToken) as { exp?: number };
    const expiresIn = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 7 * 24 * 3600;

    const newRefresh = crypto.randomBytes(32).toString("hex");
    const refreshExpiry = new Date(Date.now() + REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    await pool.query(
      "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
      [user.id, hashToken(newRefresh), refreshExpiry]
    );

    return { accessToken, refreshToken: newRefresh, expiresIn };
  },

  async logout(refreshToken: string | null): Promise<void> {
    const pool = getPool();
    if (refreshToken) {
      await pool.query("DELETE FROM refresh_tokens WHERE token_hash = $1", [hashToken(refreshToken)]);
    }
  },

  async validateToken(token: string): Promise<{ userId: string; role?: string } | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as TokenPayload & { exp?: number };
      if (decoded?.userId) return { userId: decoded.userId, role: decoded.role };
    } catch {
      // try legacy
    }
    const legacy = await validateLegacyToken(token);
    if (!legacy) return null;
    const pool = getPool();
    const row = await pool.query("SELECT role FROM users WHERE id = $1", [legacy.userId]).then((r) => r.rows[0]);
    return { userId: legacy.userId, role: row?.role };
  },
};
