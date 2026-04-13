-- ==========================================
-- FINAL INFRASTRUCTURE PATCH
-- ==========================================

-- 1. FIX VEHICLES SCHEMA
-- Ensure pax_capacity exists as it is required by the app code logic
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS pax_capacity INTEGER DEFAULT 1;


-- 2. HARDEN RLS POLICIES
-- We broaden the policy to ensure that if a user is a super_admin, 
-- they aren't blocked by missing operator_id references.

-- VEHICLES
DROP POLICY IF EXISTS "Operators can view vehicles" ON vehicles;
CREATE POLICY "Operators can view vehicles" ON vehicles
    FOR ALL 
    USING (
        operator_id = get_user_operator_id() 
        OR get_user_role() = 'super_admin'
    )
    WITH CHECK (
        operator_id = get_user_operator_id() 
        OR get_user_role() = 'super_admin'
    );

-- PRESETS
DROP POLICY IF EXISTS "Operators can view presets" ON itinerary_presets;
CREATE POLICY "Operators can view presets" ON itinerary_presets
    FOR ALL 
    USING (
        operator_id = get_user_operator_id() 
        OR get_user_role() = 'super_admin'
    )
    WITH CHECK (
        operator_id = get_user_operator_id() 
        OR get_user_role() = 'super_admin'
    );

-- MISC PRESETS
DROP POLICY IF EXISTS "Operators can view misc presets" ON misc_presets;
CREATE POLICY "Operators can view misc presets" ON misc_presets
    FOR ALL 
    USING (
        operator_id = get_user_operator_id() 
        OR get_user_role() = 'super_admin'
    )
    WITH CHECK (
        operator_id = get_user_operator_id() 
        OR get_user_role() = 'super_admin'
    );

-- 3. PROFILE REPAIR (Safety Measure)
-- If for some reason YOUR specific user record is missing a profile, 
-- this script will attempt to create one for the currently active session.
DO $$
DECLARE
    current_uid UUID := auth.uid();
    first_operator_id UUID;
BEGIN
    IF current_uid IS NOT NULL THEN
        -- Get the first available operator as a default if none assigned
        SELECT id INTO first_operator_id FROM operators LIMIT 1;
        
        INSERT INTO profiles (id, operator_id, role, full_name)
        VALUES (current_uid, first_operator_id, 'super_admin', 'System Admin')
        ON CONFLICT (id) DO UPDATE 
        SET role = 'super_admin' -- Ensure you have admin rights
        WHERE profiles.role IS NULL OR profiles.role = 'sales';
    END IF;
END $$;
