const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Extract env from .env.local manually to be safe
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listUsers() {
  console.log('Fetching users from:', supabaseUrl);
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log('--- USERS LIST ---');
  users.forEach(u => {
    console.log(`Email: ${u.email}`);
  });
  console.log('------------------');
}

listUsers();
