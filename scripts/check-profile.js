const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function check() {
  const envPath = path.join(process.cwd(), '.env.local');
  const envFile = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envFile.split('\n').forEach(line => {
    const [k, v] = line.split('=');
    if(k && v) env[k.trim()] = v.trim().replace(/^['"]|['"]$/g, '');
  });

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  
  console.log("Checking profiles table...");
  const { data, error } = await supabase.from('profiles').select('*, operators(*)');
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Found profiles:", JSON.stringify(data, null, 2));
  }
}

check();
