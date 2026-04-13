const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function confirmEmail() {
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
     console.log("User not found!");
     return;
  }

  // 2. Manually confirm the email
  const { data, error } = await supabase.auth.admin.updateUserById(
    target.id,
    { email_confirm: true }
  );
  
  if (error) {
    console.error("Confirmation error:", error);
  } else {
    console.log("✅ Email successfully confirmed for redgabanan19@gmail.com!");
  }
}

confirmEmail();
