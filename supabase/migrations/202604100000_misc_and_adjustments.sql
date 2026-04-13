-- 1. Create Misc Presets Table
CREATE TABLE IF NOT EXISTS misc_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    default_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for misc_presets
ALTER TABLE misc_presets ENABLE ROW LEVEL SECURITY;

-- Add RLS Policy for misc_presets
CREATE POLICY "Operators can view their own misc presets" ON misc_presets
    FOR ALL USING (operator_id = get_user_operator_id());

-- 2. Update Quotes Table for Global Adjustments
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS extra_fees_json JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS extra_fees_total NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_total NUMERIC DEFAULT 0;

-- 3. Add details column to quote_items to store itinerary text per day if needed
ALTER TABLE quote_items
ADD COLUMN IF NOT EXISTS itenerary_details TEXT;
