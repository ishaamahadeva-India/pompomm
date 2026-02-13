import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import { AppError } from "./errorHandler.js";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB — video/image cap to reduce storage cost
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"];

const storage = multer.diskStorage({
  destination: process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".bin";
    cb(null, `creative_${randomUUID()}${ext}`);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, `Invalid file type. Allowed: ${ALLOWED_MIMES.join(", ")}`) as any);
    }
  },
});

const AVATAR_MAX_SIZE = 2 * 1024 * 1024; // 2MB
const AVATAR_MIMES = ["image/jpeg", "image/png", "image/webp"];

const avatarStorage = multer.diskStorage({
  destination: process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `avatar_${randomUUID()}${ext}`);
  },
});

export const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: AVATAR_MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (AVATAR_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, "Avatar must be JPEG, PNG or WebP") as any);
    }
  },
});
