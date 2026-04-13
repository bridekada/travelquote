-- ==========================================
-- TRAVEL QUOTE V2 INITIAL SCHEMA
-- ==========================================

-- 1. Enable uuid-ossp for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. OPERATORS Table
CREATE TABLE IF NOT EXISTS operators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    logo_url TEXT,
    website TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PROFILES Table (Extends Auth Users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
    full_name TEXT,
    role TEXT DEFAULT 'sales',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. VEHICLES Table
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
    model TEXT NOT NULL,
    category TEXT,
    rate_city NUMERIC DEFAULT 0,
    rate_region_x NUMERIC DEFAULT 0,
    rate_outside NUMERIC DEFAULT 0,
    km_per_l NUMERIC DEFAULT 10,
    carwash_fee NUMERIC DEFAULT 0,
    fuel_type TEXT DEFAULT 'Gasoline',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ITINERARY PRESETS Table
CREATE TABLE IF NOT EXISTS itinerary_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    details TEXT,
    default_km NUMERIC DEFAULT 0,
    area_type TEXT DEFAULT 'Region X',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. QUOTES Table
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Cancelled', 'Follow-up')),
    customer_name TEXT NOT NULL,
    fb_name TEXT,
    contact_number TEXT,
    pax_count INTEGER DEFAULT 1,
    eta TIMESTAMPTZ,
    etd TIMESTAMPTZ,
    vehicle_model TEXT,
    pickup_location TEXT,
    dropoff_location TEXT,
    notes TEXT,
    grand_total NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. QUOTE ITEMS (Costing Rows)
CREATE TABLE IF NOT EXISTS quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    date DATE,
    destination TEXT,
    vehicle_rate NUMERIC DEFAULT 0,
    km NUMERIC DEFAULT 0,
    km_per_l NUMERIC DEFAULT 10,
    fuel_price NUMERIC DEFAULT 50,
    driver_fee NUMERIC DEFAULT 0,
    driver_meals NUMERIC DEFAULT 0,
    driver_acc NUMERIC DEFAULT 0,
    parking NUMERIC DEFAULT 0,
    ferry NUMERIC DEFAULT 0,
    guest_acc NUMERIC DEFAULT 0,
    misc NUMERIC DEFAULT 0,
    row_total NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- 1. Profiles: Users can read their own profile
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- 2. Multi-tenant Policies (Scoping by operator_id)
-- Note: Requires a custom function or joining with profiles

CREATE OR REPLACE FUNCTION get_user_operator_id()
RETURNS UUID AS $$
    SELECT operator_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

CREATE POLICY "Operators can view their own data" ON operators
    FOR SELECT USING (id = get_user_operator_id());

CREATE POLICY "Operators can view their own vehicles" ON vehicles
    FOR ALL USING (operator_id = get_user_operator_id());

CREATE POLICY "Operators can view their own presets" ON itinerary_presets
    FOR ALL USING (operator_id = get_user_operator_id());

CREATE POLICY "Operators can view their own quotes" ON quotes
    FOR ALL USING (operator_id = get_user_operator_id());

CREATE POLICY "Operators can view their own quote items" ON quote_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM quotes 
            WHERE quotes.id = quote_items.quote_id 
            AND quotes.operator_id = get_user_operator_id()
        )
    );
