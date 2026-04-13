const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  const val = value ? value.trim() : '';
  if (key) env[key.trim()] = val;
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function rebuildAdmin() {
  const oldEmail = 'redgabanan19@gmail.com';
  const newEmail = 'admin@travelquote.com';
  const newPassword = 'P@ssword2026!';

  console.log('--- REBUILDING ADMIN ---');

  // 1. Create New Admin User
  console.log(`Creating new user: ${newEmail}...`);
  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email: newEmail,
    password: newPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Super Admin' }
  });

  if (createError) {
    console.error('Error creating new admin:', createError);
  } else {
    const newUserId = createData.user.id;
    console.log(`New user created: ${newUserId}`);

    // 2. Create Profile for New Admin
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newUserId,
        full_name: 'Super Admin',
        role: 'super_admin'
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
    } else {
      console.log('New profile created successfully.');
    }
  }

  // 3. Delete Old User
  console.log(`Deleting old user: ${oldEmail}...`);
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  const oldUser = users.find(u => u.email === oldEmail);

  if (oldUser) {
    // Delete profile first due to FK constraints (though schema has ON DELETE CASCADE in some versions)
    await supabase.from('profiles').delete().eq('id', oldUser.id);
    
    // Delete from auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(oldUser.id);
    if (deleteError) {
      console.error('Error deleting old auth user:', deleteError);
    } else {
      console.log(`Successfully deleted ${oldEmail}`);
    }
  } else {
    console.log(`Old user ${oldEmail} not found.`);
  }

  console.log('--- DONE ---');
}

rebuildAdmin();
