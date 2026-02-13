-- Small brand stabilization (₹50k–₹5L). Additive only.

-- 1) Creator cooldown: max 3 campaign payouts in 7 days
CREATE TABLE IF NOT EXISTS creator_cooldown_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES distribution_campaigns(id) ON DELETE CASCADE,
  payout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_creator_cooldown_log_user_date ON creator_cooldown_log(user_id, payout_date);
CREATE INDEX IF NOT EXISTS idx_creator_cooldown_log_user ON creator_cooldown_log(user_id);

-- 2) Platform margin: reserve % for platform (default 25%)
ALTER TABLE distribution_campaigns ADD COLUMN IF NOT EXISTS platform_margin_percentage DECIMAL(5,2) NOT NULL DEFAULT 25;
UPDATE distribution_campaigns SET platform_margin_percentage = 25 WHERE platform_margin_percentage IS NULL;
-- Cap remaining_budget to distributable amount (total_budget * (1 - margin/100))
UPDATE distribution_campaigns
SET remaining_budget = LEAST(
  COALESCE(remaining_budget, total_budget),
  total_budget * (1 - COALESCE(platform_margin_percentage, 25) / 100)
)
WHERE total_budget IS NOT NULL;

-- 3) Fraud log reason (e.g. low_geo_diversity)
ALTER TABLE fraud_log ADD COLUMN IF NOT EXISTS reason VARCHAR(255);
