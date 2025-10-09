import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('\n👤 Create Supabase User\n');

  const email = await question('Enter email: ');
  const password = await question('Enter password (min 6 characters): ');
  const fullName = await question('Enter full name: ');

  if (password.length < 6) {
    console.log('❌ Password must be at least 6 characters');
    rl.close();
    return;
  }

  console.log('\n📝 Creating user...\n');

  // Create user in auth.users
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true, // Auto-confirm email
  });

  if (authError) {
    console.error('❌ Failed to create user:', authError.message);
    rl.close();
    return;
  }

  console.log('✅ User created in auth.users');
  console.log(`   ID: ${authData.user.id}`);
  console.log(`   Email: ${authData.user.email}`);

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
    console.error('❌ Failed to create profile:', profileError.message);
  } else {
    console.log('✅ Profile created');
  }

  console.log('\n✅ Done! You can now log in with:');
  console.log(`   Email: ${email}`);
  console.log(`   Password: [the password you entered]\n`);

  rl.close();
}

main().catch(console.error);
