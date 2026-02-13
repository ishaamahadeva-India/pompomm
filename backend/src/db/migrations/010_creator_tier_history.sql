-- Creator tier history for CRS-based and admin tier changes.

CREATE TABLE IF NOT EXISTS creator_tier_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_tier VARCHAR(20) NOT NULL,
  new_tier VARCHAR(20) NOT NULL,
  reason VARCHAR(64) NOT NULL,
  crs_score NUMERIC(5,2),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creator_tier_history_user_id ON creator_tier_history(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_tier_history_changed_at ON creator_tier_history(changed_at DESC);
