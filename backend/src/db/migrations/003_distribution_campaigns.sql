-- Distribution campaigns: verified engagement through tracked referral links.
-- Additive only. Do not modify existing campaign tables.

-- distribution_campaigns
CREATE TABLE IF NOT EXISTS distribution_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  sponsor_name VARCHAR(255) NOT NULL,
  total_budget DECIMAL(12,2) NOT NULL DEFAULT 0,
  payout_model VARCHAR(32) NOT NULL CHECK (payout_model IN ('tier_based', 'fixed_milestone')),
  min_unique_views_required INT NOT NULL DEFAULT 100,
  min_engagement_rate_required DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  payout_per_milestone DECIMAL(10,2),
  max_daily_payout_per_user DECIMAL(10,2) NOT NULL DEFAULT 500,
  tier_config JSONB,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_distribution_campaigns_status ON distribution_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_distribution_campaigns_dates ON distribution_campaigns(start_time, end_time);

-- creator_distribution_stats (one row per creator per campaign)
CREATE TABLE IF NOT EXISTS creator_distribution_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES distribution_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_unique_views INT NOT NULL DEFAULT 0,
  total_likes INT NOT NULL DEFAULT 0,
  total_shares INT NOT NULL DEFAULT 0,
  verified_engagement_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  total_earned DECIMAL(12,2) NOT NULL DEFAULT 0,
  payout_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'approved', 'held', 'paid')),
  fraud_score DECIMAL(5,2) DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_creator_distribution_stats_campaign ON creator_distribution_stats(campaign_id);
CREATE INDEX IF NOT EXISTS idx_creator_distribution_stats_user ON creator_distribution_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_distribution_stats_payout ON creator_distribution_stats(payout_status);

-- referral_tracking (raw events; archive after 30 days)
CREATE TABLE IF NOT EXISTS referral_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES distribution_campaigns(id) ON DELETE CASCADE,
  creative_id UUID,
  ref_creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visitor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  visitor_ip INET,
  device_hash VARCHAR(64),
  watched_seconds INT NOT NULL DEFAULT 0,
  engagement_action VARCHAR(20) NOT NULL CHECK (engagement_action IN ('view', 'like', 'share')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_campaign_id ON referral_tracking(campaign_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_ref_creator ON referral_tracking(ref_creator_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_created ON referral_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_campaign_creator_created ON referral_tracking(campaign_id, ref_creator_id, created_at);

-- daily payout cap tracking (for max_daily_payout_per_user)
CREATE TABLE IF NOT EXISTS distribution_daily_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES distribution_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payout_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, user_id, payout_date)
);
CREATE INDEX IF NOT EXISTS idx_distribution_daily_payouts_lookup ON distribution_daily_payouts(campaign_id, user_id, payout_date);
