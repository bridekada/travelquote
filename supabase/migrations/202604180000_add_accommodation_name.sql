-- Add guest_accommodation_name to quote_items
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS guest_accommodation_name TEXT;
