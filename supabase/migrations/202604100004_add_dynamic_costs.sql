-- Add dynamic_costs JSONB column to quote_items
-- This allows operators to define their own costing categories (e.g., Driver Fee, Meal, Permit, etc.)
-- without being restricted to hardcoded columns.

ALTER TABLE quote_items
ADD COLUMN IF NOT EXISTS dynamic_costs JSONB DEFAULT '{}'::jsonb;

-- Update RLS (though existing policies should cover it if they use get_user_operator_id or join with quotes)
-- Standard items like driver_fee, parking, etc. will be deprecated in the UI in favor of this JSONB column.
