-- Remove previous temporary show_in_quote_text column if present
ALTER TABLE misc_presets DROP COLUMN IF EXISTS show_in_quote_text;

-- Add hide_in_quote, multiply_by_guest, and vehicle_overrides columns to misc_presets
ALTER TABLE misc_presets ADD COLUMN IF NOT EXISTS hide_in_quote BOOLEAN DEFAULT false;
ALTER TABLE misc_presets ADD COLUMN IF NOT EXISTS multiply_by_guest BOOLEAN DEFAULT false;
ALTER TABLE misc_presets ADD COLUMN IF NOT EXISTS vehicle_overrides JSONB DEFAULT '{}'::jsonb;
