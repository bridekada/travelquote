-- Fix the spelling of itinerary_details in quote_items table
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'quote_items' 
        AND column_name = 'itenerary_details'
    ) THEN
        ALTER TABLE quote_items RENAME COLUMN itenerary_details TO itinerary_details;
    END IF;
END $$;
