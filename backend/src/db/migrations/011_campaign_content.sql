-- Admin-controlled campaign content. Additive only. campaigns table (main app).

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS content_type VARCHAR(20) CHECK (content_type IN ('image', 'video', 'narrative', 'question'));
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS banner_image_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS narrative_text TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS question_text TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS option_a TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS option_b TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS option_c TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS option_d TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS correct_answer TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cta_url TEXT;
