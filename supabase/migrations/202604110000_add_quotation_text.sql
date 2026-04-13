-- Add quotation_text column to quotes table
ALTER TABLE public.quotes ADD COLUMN quotation_text TEXT;

-- Update existing records: if notes looks like a generated quote, copy it to quotation_text
-- (Optional, but helpful for migration)
UPDATE public.quotes 
SET quotation_text = notes 
WHERE notes LIKE 'Hi %';
