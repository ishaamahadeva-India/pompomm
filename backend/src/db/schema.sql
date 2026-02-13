-- Poolmarket: crowd-powered advertising performance platform
-- Run this against your PostgreSQL (e.g. Supabase) database.

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_number VARCHAR(20) NOT NULL UNIQUE,
  role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  total_score BIGINT NOT NULL DEFAULT 0,
  total_earnings DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile_number);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(32) NOT NULL CHECK (category IN ('direct_ad', 'sponsored_knowledge')),
  sponsor_name VARCHAR(255) NOT NULL,
  associate_sponsor VARCHAR(255),
  reward_pool DECIMAL(12,2) NOT NULL DEFAULT 0,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_category ON campaigns(category);

-- Creatives
CREATE TABLE IF NOT EXISTS creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  engagement_score BIGINT NOT NULL DEFAULT 0,
  unique_views INT NOT NULL DEFAULT 0,
  shares INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creatives_campaign_id ON creatives(campaign_id);
CREATE INDEX IF NOT EXISTS idx_creatives_user_id ON creatives(user_id);

-- Campaign views (validated views only)
CREATE TABLE IF NOT EXISTS campaign_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id UUID NOT NULL REFERENCES creatives(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address INET,
  device_hash VARCHAR(64),
  watched_seconds INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(creative_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_views_creative_created ON campaign_views(creative_id, created_at);
CREATE INDEX IF NOT EXISTS idx_campaign_views_creative_user ON campaign_views(creative_id, user_id);

-- Fraud / abuse log (for security)
CREATE TABLE IF NOT EXISTS fraud_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  ip_address INET,
  user_id UUID,
  creative_id UUID,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_log_created ON fraud_log(created_at);

-- Optional: archived_views for cost optimization (move old view aggregates here after 30 days)
-- Handled in application logic; raw view rows can be pruned or archived.
