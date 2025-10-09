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

async function createUser() {
  const email = 'daniel@nymberg.se';
  const password = 'qwerty1234';
  const fullName = 'Daniel Nymberg';

  console.log('\n👤 Creating user:', email);

  // Create user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
  });

  if (authError) {
    console.error('❌ Auth error:', authError.message);
    return;
  }

  console.log('✅ User created in auth.users');
  console.log('   ID:', authData.user.id);

  // Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      email: email,
      full_name: fullName,
      is_beta_tester: true,
    });

  if (profileError) {
    console.error('❌ Profile error:', profileError.message);
  } else {
    console.log('✅ Profile created');
  }

  console.log('\n✅ Done! Login credentials:');
  console.log('   Email:', email);
  console.log('   Password: qwerty1234');
  console.log('\n⚠️  Change password after first login!\n');
}

createUser().catch(console.error);
