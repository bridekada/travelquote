const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function initializeAdmin() {
  const envPath = path.join(process.cwd(), '.env.local');
  const envFile = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envFile.split('\n').forEach(line => {
    const [k, v] = line.split('=');
    if(k && v) env[k.trim()] = v.trim().replace(/^['"]|['"]$/g, '');
  });

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  
  // 1. Find User ID
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const target = users.find(u => u.email === 'redgabanan19@gmail.com');
  
  if (!target) {
     console.log("User redgabanan19@gmail.com not found!");
     return;
  }

  // 2. Ensure we have a System Admin operator
  let { data: op } = await supabase.from('operators').select('*').eq('name', 'System Admin').maybeSingle();
  if (!op) {
    const { data: newOp } = await supabase.from('operators').insert({ name: 'System Admin' }).select().single();
    op = newOp;
  }

  if (!op) {
    console.error("Failed to create/find operator");
    return;
  }

  // 3. Create Super Admin Profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .insert({
      id: target.id,
      operator_id: op.id,
      full_name: 'Super Admin',
      role: 'super_admin'
    })
    .select()
    .single();
    
  if (error) {
    console.error("Profile creation error:", error);
  } else {
    console.log("✅ Super Admin profile successfully initialized for redgabanan19@gmail.com!");
  }
}

initializeAdmin();
