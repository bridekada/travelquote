-- Add applied_preset_id to quote_items to persist service preset selection
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS applied_preset_id UUID REFERENCES itinerary_presets(id) ON DELETE SET NULL;
