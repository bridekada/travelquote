const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function listUsers() {
  const envPath = path.join(process.cwd(), '.env.local');
  const envFile = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envFile.split('\n').forEach(line => {
    const [k, v] = line.split('=');
    if(k && v) env[k.trim()] = v.trim().replace(/^['"]|['"]$/g, '');
  });

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Registered Emails:", data.users.map(u => u.email));
  }
}

listUsers();
