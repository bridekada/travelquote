-- Add columns to store snapshot of confirmed package details
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS selected_package_total NUMERIC,
ADD COLUMN IF NOT EXISTS selected_package_details JSONB;

COMMENT ON COLUMN public.quotes.selected_package_total IS 'The exact total amount agreed upon at the time of confirmation';
COMMENT ON COLUMN public.quotes.selected_package_details IS 'JSON snapshot of the package itinerary, inclusions, and per-pax breakdown at confirmation';
