const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually load .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedDemoData() {
  console.log("Seeding Demo Data...");

  // 1. Create Agency Alpha
  const { data: alpha, error: alphaErr } = await supabase
    .from('operators')
    .insert({ name: 'Agency Alpha (Premium)' })
    .select().single();
  
  if (alphaErr) console.log("Alpha exists or error:", alphaErr.message);
  else console.log("✅ Created Agency Alpha");

  // 2. Create Agency Beta
  const { data: beta, error: betaErr } = await supabase
    .from('operators')
    .insert({ name: 'Agency Beta (Economy)' })
    .select().single();
    
  if (betaErr) console.log("Beta exists or error:", betaErr.message);
  else console.log("✅ Created Agency Beta");

  // 3. Add some vehicles to Alpha
  if (alpha) {
    await supabase.from('vehicles').insert([
      { operator_id: alpha.id, model: 'Toyota Hiace Super Grandia', rate_city: 3500, rate_outside: 4500 },
      { operator_id: alpha.id, model: 'Mitsubishi Montero Sport', rate_city: 3000, rate_outside: 4000 }
    ]);
    
    await supabase.from('itinerary_presets').insert([
      { operator_id: alpha.id, title: 'CDO City Tour', details: '9AM - 5PM tour within city limits', default_km: 60, area_type: 'Region X' },
      { operator_id: alpha.id, title: 'Dahilayan Adventure', details: 'Full day trip to Bukidnon', default_km: 140, area_type: 'Outside Region' }
    ]);
    console.log("✅ Seeded vehicles & presets for Alpha");
  }

  console.log("Done seeding.");
}

seedDemoData();
