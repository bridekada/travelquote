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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixGuest() {
  console.log("Fixing guest profile for:", supabaseUrl);
  
  // Get guest user ID
  const { data: { users }, error: uError } = await supabase.auth.admin.listUsers();
  if (uError) {
    console.error("User list error:", uError);
    return;
  }
  
  const guest = users.find(u => u.email === 'guest@travel.com');
  if (!guest) {
    console.error("Guest user not found in this project!");
    return;
  }
  
  // Check if profile exists
  const { data: existing } = await supabase.from('profiles').select('*').eq('id', guest.id).maybeSingle();
  if (existing) {
    console.log("Profile already exists for", guest.email);
    return;
  }

  // Create Operator
  const { data: op, error: opError } = await supabase
    .from('operators')
    .insert({ name: 'Guest Travel & Tours' })
    .select()
    .single();
    
  if (opError) {
    console.error("Op error:", opError);
    return;
  }

  // Create Profile
  const { error: profError } = await supabase
    .from('profiles')
    .insert({ 
      id: guest.id, 
      operator_id: op.id,
      full_name: 'Guest User'
    });

  if (profError) {
    console.error("Profile error:", profError);
  } else {
    console.log("✅ Guest profile successfully initialized in YOUR Supabase.");
  }
}

fixGuest();
