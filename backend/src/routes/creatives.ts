import { Router } from "express";
import { z } from "zod";
import { creativesService } from "../services/creatives.js";
import { authMiddleware, requireSubscription } from "../middleware/auth.js";
import { uploadMiddleware } from "../middleware/upload.js";
import { AppError } from "../middleware/errorHandler.js";

export const creativesRouter = Router();

const viewBody = z.object({
  creative_id: z.string().uuid(),
  watched_seconds: z.number().min(0),
  device_hash: z.string().optional(),
});

creativesRouter.post("/upload", authMiddleware, requireSubscription, uploadMiddleware.single("media"), async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const { campaign_id } = req.body;
    if (!campaign_id || !req.file) throw new AppError(400, "campaign_id and media file required");
    const creative = await creativesService.upload(userId, campaign_id, req.file);
    res.status(201).json(creative);
  } catch (e) {
    next(e);
  }
});

creativesRouter.post("/view", authMiddleware, requireSubscription, async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const parsed = viewBody.safeParse({
      ...req.body,
      watched_seconds: Number(req.body?.watched_seconds) ?? 0,
    });
    if (!parsed.success) throw new AppError(400, "Invalid request: creative_id and watched_seconds required");
    const { creative_id, watched_seconds, device_hash } = parsed.data;
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "";
    const result = await creativesService.recordView({
      creative_id,
      user_id: userId,
      ip_address: ip,
      device_hash: device_hash ?? "",
      watched_seconds,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

creativesRouter.post("/share", authMiddleware, requireSubscription, async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const { creative_id } = req.body;
    if (!creative_id) throw new AppError(400, "creative_id required");
    const result = await creativesService.recordShare(creative_id, userId);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

creativesRouter.post("/like", authMiddleware, requireSubscription, async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const { creative_id } = req.body;
    if (!creative_id) throw new AppError(400, "creative_id required");
    const result = await creativesService.recordLike(creative_id, userId);
    res.json(result);
  } catch (e) {
    next(e);
  }
});
