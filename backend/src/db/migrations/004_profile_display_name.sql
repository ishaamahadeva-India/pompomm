-- Add optional display name for profile and leaderboards
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
