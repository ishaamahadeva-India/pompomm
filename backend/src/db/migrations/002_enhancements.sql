-- Enhancement migration: additive only. Do not drop or remove existing data.
-- Run after initial schema.

-- A. USERS TABLE ADDITIONS
ALTER TABLE users ADD COLUMN IF NOT EXISTS unique_creator_id VARCHAR(12) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_events_participated INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_views_generated INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_likes_generated INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_shares_generated INT NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_unique_creator_id ON users(unique_creator_id) WHERE unique_creator_id IS NOT NULL;

-- Backfill unique_creator_id for existing users (12-char hex from id)
UPDATE users SET unique_creator_id = SUBSTRING(REPLACE(id::text, '-', ''), 1, 12) WHERE unique_creator_id IS NULL;

-- B. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL DEFAULT 30,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  transaction_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);

-- C. CAMPAIGNS TABLE UPDATE (max 1-3 enforced in app)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS max_creatives_allowed INT NOT NULL DEFAULT 1;

-- D. SPONSORS TABLE (campaign can have multiple sponsors)
CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  sponsor_type VARCHAR(32) NOT NULL CHECK (sponsor_type IN ('main_sponsor', 'associate_sponsor', 'co_sponsor')),
  sponsor_name VARCHAR(255) NOT NULL,
  sponsor_logo TEXT,
  sponsor_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sponsors_campaign_id ON sponsors(campaign_id);

-- E. CREATIVES TABLE UPDATE (add total_views, total_likes; unique_views remains, use as total_unique_views in formula)
ALTER TABLE creatives ADD COLUMN IF NOT EXISTS total_views INT NOT NULL DEFAULT 0;
ALTER TABLE creatives ADD COLUMN IF NOT EXISTS total_likes INT NOT NULL DEFAULT 0;
UPDATE creatives SET total_views = unique_views WHERE total_views = 0 AND unique_views > 0;

-- F. LEADERBOARD SNAPSHOTS (persist results in DB for date-range queries)
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rank INT NOT NULL,
  total_score BIGINT NOT NULL DEFAULT 0,
  total_unique_views INT NOT NULL DEFAULT 0,
  total_likes INT NOT NULL DEFAULT 0,
  total_shares INT NOT NULL DEFAULT 0,
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_campaign_date ON leaderboard_snapshots(campaign_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_user ON leaderboard_snapshots(user_id, snapshot_date);

-- G. COST OPTIMIZATION: index for date filtering on campaign_views
CREATE INDEX IF NOT EXISTS idx_campaign_views_created_at ON campaign_views(created_at);

-- H. fraud_log index for admin queries
CREATE INDEX IF NOT EXISTS idx_fraud_log_created_at ON fraud_log(created_at);
