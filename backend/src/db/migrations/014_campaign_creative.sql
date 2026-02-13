-- One brand creative per campaign (admin-uploaded); users only share/watch/like.
ALTER TABLE creatives ADD COLUMN IF NOT EXISTS is_campaign_creative BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE creatives ALTER COLUMN user_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_creatives_campaign_official ON creatives(campaign_id) WHERE is_campaign_creative = true;
