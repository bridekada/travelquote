-- ==========================================
-- MULTI-TENANT SAAS UPGRADE (V2 - Data Correction)
-- ==========================================

-- 1. First, "graduate" any existing staff to the new naming convention
UPDATE profiles SET role = 'operator_sales' WHERE role = 'sales';
UPDATE profiles SET role = 'operator_sales' WHERE role IS NULL;

-- 2. Add Role Constraint to Profiles
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('super_admin', 'operator_admin', 'operator_sales'));

-- 3. Update get_user_operator_id to handle Super Admin (Helper function)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- 4. Update RLS Policies
-- We allow super_admin to skip the operator_id check.

-- OPERATORS
DROP POLICY IF EXISTS "Operators can view their own data" ON operators;
DROP POLICY IF EXISTS "Operators can view data" ON operators;
CREATE POLICY "Operators can view data" ON operators
    FOR SELECT USING (
        id = get_user_operator_id() OR get_user_role() = 'super_admin'
    );

-- VEHICLES
DROP POLICY IF EXISTS "Operators can view their own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Operators can view vehicles" ON vehicles;
CREATE POLICY "Operators can view vehicles" ON vehicles
    FOR ALL USING (
        operator_id = get_user_operator_id() OR get_user_role() = 'super_admin'
    );

-- PRESETS
DROP POLICY IF EXISTS "Operators can view their own presets" ON itinerary_presets;
DROP POLICY IF EXISTS "Operators can view presets" ON itinerary_presets;
CREATE POLICY "Operators can view presets" ON itinerary_presets
    FOR ALL USING (
        operator_id = get_user_operator_id() OR get_user_role() = 'super_admin'
    );

-- QUOTES
DROP POLICY IF EXISTS "Operators can view their own quotes" ON quotes;
DROP POLICY IF EXISTS "Operators can view quotes" ON quotes;
CREATE POLICY "Operators can view quotes" ON quotes
    FOR ALL USING (
        operator_id = get_user_operator_id() OR get_user_role() = 'super_admin'
    );

-- QUOTE ITEMS
DROP POLICY IF EXISTS "Operators can view their own quote items" ON quote_items;
DROP POLICY IF EXISTS "Operators can view quote items" ON quote_items;
CREATE POLICY "Operators can view quote items" ON quote_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM quotes 
            WHERE quotes.id = quote_items.quote_id 
            AND (quotes.operator_id = get_user_operator_id() OR get_user_role() = 'super_admin')
        )
    );
