import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.js";
import { subscriptionService } from "../services/subscription.js";
import { AppError } from "./errorHandler.js";

export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : req.cookies?.accessToken ?? req.cookies?.token ?? req.body?.token;
  if (!token) {
    next(new AppError(401, "Not logged in"));
    return;
  }
  const payload = await authService.validateToken(token);
  if (!payload) {
    next(new AppError(401, "Invalid token"));
    return;
  }
  (req as any).userId = payload.userId;
  (req as any).userRole = payload.role;
  next();
}

/** Requires active subscription for participation (upload, view, share). Use after authMiddleware. */
export async function requireSubscription(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const userId = (req as any).userId;
  if (!userId) {
    next(new AppError(401, "Not logged in"));
    return;
  }
  const active = await subscriptionService.isActive(userId);
  if (!active) {
    next(new AppError(403, "Active subscription required to participate. Please subscribe first."));
    return;
  }
  next();
}

/** Requires admin role. Use after authMiddleware. Role is set from JWT (or legacy token resolve), so no DB lookup here. */
export async function requireAdmin(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const userId = (req as any).userId;
  const role = (req as any).userRole;
  if (!userId) {
    next(new AppError(401, "Not logged in"));
    return;
  }
  if (role !== "admin") {
    next(new AppError(403, "Admin access required"));
    return;
  }
  next();
}

/** Requires brand_admin or admin; brand can access only campaigns they own. Use after authMiddleware. Role from JWT. */
export async function requireBrandAdmin(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const userId = (req as any).userId;
  const role = (req as any).userRole;
  if (!userId) {
    next(new AppError(401, "Not logged in"));
    return;
  }
  if (role !== "brand_admin" && role !== "admin") {
    next(new AppError(403, "Brand access required"));
    return;
  }
  next();
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : req.cookies?.accessToken ?? req.cookies?.token;
  if (token) {
    const payload = await authService.validateToken(token);
    if (payload) {
      (req as any).userId = payload.userId;
      (req as any).userRole = payload.role;
    }
  }
  next();
}
