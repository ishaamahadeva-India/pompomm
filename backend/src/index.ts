import "dotenv/config";
import { mkdirSync, existsSync } from "fs";
import path from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.js";
import { campaignsRouter } from "./routes/campaigns.js";
import { creativesRouter } from "./routes/creatives.js";
import { leaderboardRouter } from "./routes/leaderboard.js";
import { subscriptionRouter } from "./routes/subscription.js";
import { adminRouter } from "./routes/admin.js";
import { distributionRouter } from "./routes/distribution.js";
import { brandRouter } from "./routes/brand.js";
import { globalRateLimiter } from "./middleware/rateLimit.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { openApiSpec } from "./openapi.js";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(helmet({ contentSecurityPolicy: false }));
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://pompomm.in",
  "https://www.pompomm.in",
  "https://pompomm-eight.vercel.app",
  ...(process.env.FRONTEND_ORIGIN ?? "").split(",").map((o) => o.trim()).filter(Boolean),
];
app.use(cors({ origin: (origin, cb) => (!origin || allowedOrigins.includes(origin)) ? cb(null, origin || allowedOrigins[0]) : cb(null, allowedOrigins[0]), credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(globalRateLimiter);

app.use("/auth", authRouter);
app.use("/campaigns", campaignsRouter);
app.use("/creative", creativesRouter);
app.use("/leaderboard", leaderboardRouter);
app.use("/subscription", subscriptionRouter);
app.use("/admin", adminRouter);
app.use("/distribution", distributionRouter);
app.use("/brand", brandRouter);

app.get("/health", (_req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));
app.get("/openapi.json", (_req, res) => res.json(openApiSpec));

const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static(uploadDir));

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
