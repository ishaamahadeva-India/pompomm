-- Creator Reliability Score (CRS) engine. Additive only.

CREATE TABLE IF NOT EXISTS creator_crs (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  engagement_quality_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  geo_diversity_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  fraud_modifier_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  stability_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  crs_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creator_crs_user_id ON creator_crs(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_crs_last_updated ON creator_crs(last_updated);
