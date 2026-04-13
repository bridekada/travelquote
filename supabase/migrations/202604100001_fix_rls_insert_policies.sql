-- ==========================================
-- FIX: RLS INSERT POLICIES
-- ==========================================

-- 1. VEHICLES: Explicit USING and WITH CHECK
DROP POLICY IF EXISTS "Operators can view vehicles" ON vehicles;
CREATE POLICY "Operators can view vehicles" ON vehicles
    FOR ALL 
    USING (operator_id = get_user_operator_id() OR get_user_role() = 'super_admin')
    WITH CHECK (operator_id = get_user_operator_id() OR get_user_role() = 'super_admin');

-- 2. PRESETS: Explicit USING and WITH CHECK
DROP POLICY IF EXISTS "Operators can view presets" ON itinerary_presets;
CREATE POLICY "Operators can view presets" ON itinerary_presets
    FOR ALL 
    USING (operator_id = get_user_operator_id() OR get_user_role() = 'super_admin')
    WITH CHECK (operator_id = get_user_operator_id() OR get_user_role() = 'super_admin');

-- 3. MISC PRESETS: Explicit USING and WITH CHECK
DROP POLICY IF EXISTS "Operators can view misc presets" ON misc_presets;
CREATE POLICY "Operators can view misc presets" ON misc_presets
    FOR ALL 
    USING (operator_id = get_user_operator_id() OR get_user_role() = 'super_admin')
    WITH CHECK (operator_id = get_user_operator_id() OR get_user_role() = 'super_admin');

-- 4. QUOTES: Explicit USING and WITH CHECK
DROP POLICY IF EXISTS "Operators can view quotes" ON quotes;
CREATE POLICY "Operators can view quotes" ON quotes
    FOR ALL 
    USING (operator_id = get_user_operator_id() OR get_user_role() = 'super_admin')
    WITH CHECK (operator_id = get_user_operator_id() OR get_user_role() = 'super_admin');

-- Verification query (to see updated policies)
-- SELECT tablename, policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename IN ('vehicles', 'itinerary_presets', 'misc_presets', 'quotes');
