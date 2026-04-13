-- Add selected_package column
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS selected_package TEXT;

-- Update status constraint to include 'Quoted'
-- 1. Try to find and drop the anonymous constraint (Postgres usually names it table_column_check)
DO $$
BEGIN
    ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
EXCEPTION
    WHEN undefined_object THEN
        -- If it's a different name, we might need a more targeted drop, 
        -- but usually quotes_status_check is the default or at least what we will name it now.
        NULL;
END $$;

-- 2. Add the updated constraint
ALTER TABLE public.quotes ADD CONSTRAINT quotes_status_check 
CHECK (status IN ('Pending', 'Quoted', 'Confirmed', 'Cancelled', 'Follow-up'));
