-- Simplify Vehicle Rates
-- Collapses rate_city, rate_region_x, and rate_outside into a single default_rate
-- for operational simplicity as requested by the user.

ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS default_rate NUMERIC DEFAULT 0;

-- Migrate existing city rates to default_rate if possible
UPDATE vehicles SET default_rate = rate_city WHERE default_rate = 0;

-- Optionally remove the old columns in a future migration to keep things clean
-- ALTER TABLE vehicles DROP COLUMN IF EXISTS rate_city;
-- ALTER TABLE vehicles DROP COLUMN IF EXISTS rate_region_x;
-- ALTER TABLE vehicles DROP COLUMN IF EXISTS rate_outside;
