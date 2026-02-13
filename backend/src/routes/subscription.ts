import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { subscriptionService } from "../services/subscription.js";
import { z } from "zod";
import { AppError } from "../middleware/errorHandler.js";

export const subscriptionRouter = Router();

const activateBody = z.object({
  transaction_id: z.string().optional(),
});

subscriptionRouter.get("/status", authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const status = await subscriptionService.getStatus(userId);
    res.json(status);
  } catch (e) {
    next(e);
  }
});

subscriptionRouter.post("/activate", authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const body = activateBody.safeParse(req.body || {});
    const transactionId = body.success ? body.data.transaction_id : undefined;
    const result = await subscriptionService.activate(userId, transactionId);
    res.json(result);
  } catch (e) {
    next(e);
  }
});
