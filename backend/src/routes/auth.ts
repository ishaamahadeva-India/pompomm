import { Router } from "express";
import { z } from "zod";
import { authService } from "../services/auth.js";
import { authMiddleware } from "../middleware/auth.js";
import { getPool } from "../lib/db.js";
import { sanitizeText } from "../lib/sanitize.js";
import { AppError } from "../middleware/errorHandler.js";

export const authRouter = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60,
  path: "/",
};

const loginBody = z.object({
  mobile_number: z.string().min(10).max(20),
  otp: z.string().min(4).max(8).optional(),
  device_hash: z.string().max(64).optional(),
});

const PROFILE_SELECT = `id, mobile_number, role, total_score, total_earnings, created_at, display_name, unique_creator_id, subscription_status, creator_tier,
  age, gender, email, address, city, state, pincode, occupation, hobbies, brands_liked, bio`;

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = loginBody.safeParse(req.body);
    if (!body.success) {
      throw new AppError(400, "Invalid mobile number");
    }
    const { mobile_number, device_hash } = body.data;
    const result = await authService.login(mobile_number, device_hash ?? undefined);
    res.cookie("accessToken", result.accessToken, COOKIE_OPTIONS);
    res.cookie("refreshToken", result.refreshToken, { ...COOKIE_OPTIONS, maxAge: 30 * 24 * 60 * 60 });
    res.json({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    });
  } catch (e) {
    next(e);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const refreshToken = req.body?.refreshToken ?? req.cookies?.refreshToken;
    if (!refreshToken) throw new AppError(401, "Refresh token required");
    const result = await authService.refresh(refreshToken);
    if (!result) throw new AppError(401, "Invalid or expired refresh token");
    res.cookie("accessToken", result.accessToken, COOKIE_OPTIONS);
    res.cookie("refreshToken", result.refreshToken, { ...COOKIE_OPTIONS, maxAge: 30 * 24 * 60 * 60 });
    res.json({ accessToken: result.accessToken, refreshToken: result.refreshToken, expiresIn: result.expiresIn });
  } catch (e) {
    next(e);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    const refreshToken = req.body?.refreshToken ?? req.cookies?.refreshToken;
    await authService.logout(refreshToken ?? undefined);
    res.clearCookie("accessToken", { path: "/" });
    res.clearCookie("refreshToken", { path: "/" });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

authRouter.get("/me", authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const pool = getPool();
    const row = await pool.query(`SELECT ${PROFILE_SELECT} FROM users WHERE id = $1`, [userId]).then((r) => r.rows[0]);
    if (!row) throw new AppError(404, "User not found");
    res.json(row);
  } catch (e) {
    next(e);
  }
});

const updateProfileBody = z.object({
  display_name: z.string().max(100).optional().nullable(),
  unique_creator_id: z.string().max(12).regex(/^[a-zA-Z0-9_-]*$/).optional().nullable(),
  age: z.number().int().min(13).max(120).optional().nullable(),
  gender: z.enum(["male", "female", "non_binary", "other", "prefer_not_to_say"]).optional().nullable(),
  email: z.string().email().max(255).optional().nullable().or(z.literal("")),
  address: z.string().max(1000).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z.string().max(20).optional().nullable(),
  occupation: z.string().max(100).optional().nullable(),
  hobbies: z.string().max(500).optional().nullable(),
  brands_liked: z.string().max(500).optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
});

function emptyToNull(v: unknown): unknown {
  if (v == null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
}

authRouter.patch("/me", authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const parsed = updateProfileBody.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, "Invalid profile data");
    const data = parsed.data;
    const pool = getPool();

    const resolvedCreatorId = data.unique_creator_id === undefined ? undefined : (data.unique_creator_id == null || String(data.unique_creator_id).trim() === "" ? null : String(data.unique_creator_id).trim());
    if (resolvedCreatorId !== undefined && resolvedCreatorId !== null) {
      const existing = await pool.query(
        "SELECT id FROM users WHERE unique_creator_id = $1 AND id != $2",
        [resolvedCreatorId, userId]
      ).then((r) => r.rows[0]);
      if (existing) throw new AppError(400, "Creator ID already taken");
    }

    const allowedKeys = [
      "display_name", "unique_creator_id", "age", "gender", "email", "address",
      "city", "state", "pincode", "occupation", "hobbies", "brands_liked", "bio",
    ] as const;
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const key of allowedKeys) {
      const v = data[key];
      if (v === undefined) continue;
      if (key === "unique_creator_id") {
        updates.push(`unique_creator_id = $${idx++}`);
        values.push(resolvedCreatorId ?? null);
      } else if (key === "display_name") {
        updates.push(`display_name = $${idx++}`);
        values.push(emptyToNull(sanitizeText(v, 100)));
      } else if (key === "email") {
        updates.push(`email = $${idx++}`);
        values.push(emptyToNull(v));
      } else if (typeof v === "string") {
        const maxLen = key === "bio" ? 1000 : key === "address" ? 1000 : 500;
        updates.push(`${key} = $${idx++}`);
        values.push(emptyToNull(sanitizeText(v, maxLen)));
      } else {
        updates.push(`${key} = $${idx++}`);
        values.push(emptyToNull(v));
      }
    }

    if (updates.length === 0) {
      const row = await pool.query(`SELECT ${PROFILE_SELECT} FROM users WHERE id = $1`, [userId]).then((r) => r.rows[0]);
      return res.json(row);
    }
    values.push(userId);
    const row = await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${idx} RETURNING ${PROFILE_SELECT}`,
      values
    ).then((r) => r.rows[0]);
    res.json(row);
  } catch (e) {
    next(e);
  }
});
