-- Add selected_package_id column to quotes table
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS selected_package_id UUID;

-- Optional: Add a comment to explain the field usage
COMMENT ON COLUMN public.quotes.selected_package_id IS 'UUID reference to package_presets for robust selection tracking';
