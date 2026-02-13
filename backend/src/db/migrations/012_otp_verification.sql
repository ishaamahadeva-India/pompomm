-- OTP verification for login (store hashed OTP with expiry)
CREATE TABLE IF NOT EXISTS otp_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_normalized VARCHAR(20) NOT NULL,
  otp_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_verification_mobile ON otp_verification(mobile_normalized);
CREATE INDEX IF NOT EXISTS idx_otp_verification_expires ON otp_verification(expires_at);

-- Clean expired OTPs periodically (optional; app can also delete on verify)
-- No trigger needed; app deletes on successful verify and can run a cron to prune old rows
