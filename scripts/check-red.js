const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function checkUser() {
  const envPath = path.join(process.cwd(), '.env.local');
  const envFile = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envFile.split('\n').forEach(line => {
    const [k, v] = line.split('=');
    if(k && v) env[k.trim()] = v.trim().replace(/^['"]|['"]$/g, '');
  });

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  
  // Find the ID for redgabanan19@gmail.com
  const { data: { users }, error: uError } = await supabase.auth.admin.listUsers();
  const target = users.find(u => u.email === 'redgabanan19@gmail.com');
  
  if (!target) {
     console.log("User not found!");
     return;
  }

  const { data: prof, error: pError } = await supabase.from('profiles').select('*').eq('id', target.id).maybeSingle();
  
  if (pError) console.error("Error:", pError);
  else if (!prof) console.log("Account exists but no Profile found yet.");
  else console.log("Profile found! Role:", prof.role);
}

checkUser();
