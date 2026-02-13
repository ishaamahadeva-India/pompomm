-- Enterprise hardening & advertiser readiness. Additive only.

-- 1) Device binding & creator tier (users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS device_hash VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS creator_tier VARCHAR(20) DEFAULT 'bronze' CHECK (creator_tier IN ('bronze', 'silver', 'gold', 'verified'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS device_suspicious BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_users_device_hash ON users(device_hash) WHERE device_hash IS NOT NULL;

-- 2) Refresh tokens for JWT
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  device_hash VARCHAR(64),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- 3) Distribution campaign budget locking
ALTER TABLE distribution_campaigns ADD COLUMN IF NOT EXISTS remaining_budget DECIMAL(12,2);
ALTER TABLE distribution_campaigns ADD COLUMN IF NOT EXISTS total_distributed_amount DECIMAL(12,2) NOT NULL DEFAULT 0;
UPDATE distribution_campaigns SET total_distributed_amount = 0 WHERE total_distributed_amount IS NULL;
UPDATE distribution_campaigns SET remaining_budget = total_budget - COALESCE(total_distributed_amount, 0) WHERE remaining_budget IS NULL;

-- 4) Campaign ownership for brand_admin (link campaign to brand user)
ALTER TABLE distribution_campaigns ADD COLUMN IF NOT EXISTS brand_owner_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_distribution_campaigns_brand_owner ON distribution_campaigns(brand_owner_id) WHERE brand_owner_id IS NOT NULL;

-- 5) Fraud log enhanced (for distribution fraud analytics)
ALTER TABLE fraud_log ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES distribution_campaigns(id) ON DELETE SET NULL;
ALTER TABLE fraud_log ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE fraud_log ADD COLUMN IF NOT EXISTS fraud_score DECIMAL(5,2);
ALTER TABLE fraud_log ADD COLUMN IF NOT EXISTS ip_concentration DECIMAL(5,2);
ALTER TABLE fraud_log ADD COLUMN IF NOT EXISTS device_duplication_rate DECIMAL(5,2);
ALTER TABLE fraud_log ADD COLUMN IF NOT EXISTS spike_delta DECIMAL(8,2);
ALTER TABLE fraud_log ADD COLUMN IF NOT EXISTS geo_distribution_summary JSONB;
CREATE INDEX IF NOT EXISTS idx_fraud_log_campaign_user ON fraud_log(campaign_id, user_id) WHERE campaign_id IS NOT NULL;

-- 6) Referral tracking geo & device
ALTER TABLE referral_tracking ADD COLUMN IF NOT EXISTS country VARCHAR(2);
ALTER TABLE referral_tracking ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE referral_tracking ADD COLUMN IF NOT EXISTS device_type VARCHAR(50);
ALTER TABLE referral_tracking ADD COLUMN IF NOT EXISTS browser VARCHAR(100);
ALTER TABLE referral_tracking ADD COLUMN IF NOT EXISTS os VARCHAR(100);

-- 7) Campaign analytics daily (aggregation table)
CREATE TABLE IF NOT EXISTS campaign_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES distribution_campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_views BIGINT NOT NULL DEFAULT 0,
  unique_views BIGINT NOT NULL DEFAULT 0,
  likes BIGINT NOT NULL DEFAULT 0,
  shares BIGINT NOT NULL DEFAULT 0,
  avg_engagement_rate DECIMAL(8,2) NOT NULL DEFAULT 0,
  geo_breakdown JSONB,
  device_breakdown JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, date)
);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_daily_campaign_date ON campaign_analytics_daily(campaign_id, date);

-- 8) Monthly snapshot (before pruning)
CREATE TABLE IF NOT EXISTS campaign_monthly_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES distribution_campaigns(id) ON DELETE CASCADE,
  year_month VARCHAR(7) NOT NULL,
  total_views BIGINT NOT NULL DEFAULT 0,
  unique_views BIGINT NOT NULL DEFAULT 0,
  total_engagement BIGINT NOT NULL DEFAULT 0,
  total_paid_out DECIMAL(12,2) NOT NULL DEFAULT 0,
  fraud_cases_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, year_month)
);
CREATE INDEX IF NOT EXISTS idx_campaign_monthly_snapshot_campaign ON campaign_monthly_snapshot(campaign_id);

-- 9) Role: allow brand_admin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'brand_admin'));

-- 10) Performance: composite indexes
CREATE INDEX IF NOT EXISTS idx_referral_tracking_campaign_created ON referral_tracking(campaign_id, created_at);
CREATE INDEX IF NOT EXISTS idx_creator_distribution_stats_campaign_updated ON creator_distribution_stats(campaign_id, last_updated);
