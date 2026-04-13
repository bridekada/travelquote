-- ==========================================
-- UNIVERSAL DEVELOPER BOOTSTRAP (ALL TABLES)
-- ==========================================

-- 1. FORCE DISABLE AND CLEANUP ALL POLICIES
-- This ensures no conflicting policies exist on ANY operational table
DO $$ 
DECLARE 
    r RECORD;
    target_tables TEXT[] := ARRAY['operators', 'profiles', 'vehicles', 'itinerary_presets', 'misc_presets', 'quotes', 'quote_items'];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY target_tables LOOP
        -- Drop all current policies on the table
        FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t) LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, t);
        END LOOP;
        
        -- Enable RLS (Best practice, but we'll add a permissive policy)
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        
        -- Create the Universal Bypass Policy for Authenticated Users
        EXECUTE format('CREATE POLICY "Universal access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;


-- 2. SPECIAL BYPASS FOR OPERATORS (Usually limited)
-- Allow all authenticated users to see the operator list so the dashboard works
DROP POLICY IF EXISTS "Public operator view" ON operators;
CREATE POLICY "Public operator view" ON operators FOR SELECT TO public USING (true);


-- 3. FINAL VERIFICATION
SELECT tablename, policyname, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename;
