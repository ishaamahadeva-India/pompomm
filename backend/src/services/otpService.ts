import crypto from "crypto";
import { getPool } from "../lib/db.js";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;

function normalizeMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, "").slice(-10);
  return digits.length >= 10 ? `+${digits}` : "";
}

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

/** Generate a 6-digit numeric OTP */
function generateOtp(): string {
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, "0");
}

/** Store OTP in DB (hashed) and return the plain OTP for sending */
export async function createAndStoreOtp(mobile: string): Promise<{ otp: string; ok: boolean; error?: string }> {
  const normalized = normalizeMobile(mobile);
  if (!normalized) return { otp: "", ok: false, error: "Invalid mobile number" };

  const pool = getPool();
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await pool.query(
    "DELETE FROM otp_verification WHERE mobile_normalized = $1",
    [normalized]
  );
  await pool.query(
    "INSERT INTO otp_verification (mobile_normalized, otp_hash, expires_at) VALUES ($1, $2, $3)",
    [normalized, otpHash, expiresAt]
  );

  const sent = await sendOtpSms(normalized, otp);
  if (!sent.ok) return { otp, ok: false, error: sent.error };

  return { otp, ok: true };
}

/** Send OTP via SMS (Twilio) or log in dev when Twilio not configured */
async function sendOtpSms(mobile: string, otp: string): Promise<{ ok: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (accountSid && authToken && fromNumber) {
    try {
      const twilio = await import("twilio");
      const client = twilio.default(accountSid, authToken);
      await client.messages.create({
        body: `Your Pom Pomm verification code is: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`,
        from: fromNumber,
        to: mobile,
      });
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "SMS failed";
      console.error("Twilio SMS error:", msg);
      return { ok: false, error: "Failed to send SMS" };
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[DEV] OTP for", mobile, ":", otp, "(Twilio not configured)");
    return { ok: true };
  }

  return { ok: false, error: "OTP provider not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER." };
}

/** Verify OTP for a mobile; deletes the record on success */
export async function verifyOtp(mobile: string, otp: string): Promise<boolean> {
  const normalized = normalizeMobile(mobile);
  if (!normalized || !otp || otp.length < 4) return false;

  const pool = getPool();
  const otpHash = hashOtp(otp);
  const row = await pool.query(
    "SELECT id FROM otp_verification WHERE mobile_normalized = $1 AND otp_hash = $2 AND expires_at > NOW()",
    [normalized, otpHash]
  ).then((r) => r.rows[0]);

  if (!row) return false;

  await pool.query("DELETE FROM otp_verification WHERE mobile_normalized = $1", [normalized]);
  return true;
}
