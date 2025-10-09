import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteUser() {
  const email = 'daniel@nymberg.se';

  console.log('\n🔍 Looking for user:', email);

  // List all users
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('❌ Error listing users:', listError.message);
    return;
  }

  console.log(`\n📋 Found ${users.length} total users in database`);

  const user = users.find(u => u.email === email);

  if (!user) {
    console.log('❌ User not found:', email);
    console.log('\n📋 All users in database:');
    users.forEach(u => {
      console.log(`   - ${u.email} (ID: ${u.id})`);
    });
    return;
  }

  console.log('✅ Found user to delete:');
  console.log('   Email:', user.email);
  console.log('   ID:', user.id);
  console.log('   Created:', user.created_at);

  console.log('\n🗑️  Deleting user...');

  // Delete from profiles first (if exists)
  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', user.id);

  if (profileError) {
    console.log('⚠️  Could not delete profile (might not exist):', profileError.message);
  } else {
    console.log('✅ Profile deleted');
  }

  // Delete from auth.users
  const { error: authError } = await supabase.auth.admin.deleteUser(user.id);

  if (authError) {
    console.error('❌ Error deleting user:', authError.message);
    return;
  }

  console.log('✅ User deleted from auth.users');
  console.log('\n✅ Done!\n');
}

deleteUser().catch(console.error);
