-- Payout profit optimization & fraud leakage control. Additive only.

-- 1) Fraud buffer reserve
ALTER TABLE distribution_campaigns ADD COLUMN IF NOT EXISTS fraud_buffer_percentage DECIMAL(5,2) NOT NULL DEFAULT 5;
UPDATE distribution_campaigns SET fraud_buffer_percentage = 5 WHERE fraud_buffer_percentage IS NULL;

-- 2) Milestone delay: when creator reached milestone (for 6h rule)
ALTER TABLE creator_distribution_stats ADD COLUMN IF NOT EXISTS milestone_reached_at TIMESTAMPTZ;

-- 3) Dynamic platform margin backfill: ≤100k→30%, ≤300k→25%, else 20%
UPDATE distribution_campaigns
SET platform_margin_percentage = CASE
  WHEN total_budget <= 100000 THEN 30
  WHEN total_budget <= 300000 THEN 25
  ELSE 20
END
WHERE total_budget IS NOT NULL;

-- 4) Distributable pool: remaining_budget = total_budget * (1 - margin/100) * (1 - fraud_buffer/100)
--    Cap existing remaining_budget to this (never exceed distributable)
UPDATE distribution_campaigns
SET remaining_budget = LEAST(
  COALESCE(remaining_budget, total_budget),
  total_budget * (1 - COALESCE(platform_margin_percentage, 25) / 100) * (1 - COALESCE(fraud_buffer_percentage, 5) / 100)
)
WHERE total_budget IS NOT NULL;
