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

async function getUserByEmail(email) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching profile:', error);
  }

  return data;
}

async function getAuthUser(email) {
  // Använd admin API för att hämta användare
  const { data: { users }, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('Error listing users:', error);
    return null;
  }

  return users.find(u => u.email === email);
}

async function confirmUserEmail(userId) {
  const { data, error } = await supabase.auth.admin.updateUserById(
    userId,
    { email_confirm: true }
  );

  if (error) {
    console.error('Error confirming email:', error);
    return false;
  }

  return true;
}

async function resetUserPassword(userId, newPassword) {
  const { data, error } = await supabase.auth.admin.updateUserById(
    userId,
    { password: newPassword }
  );

  if (error) {
    console.error('Error resetting password:', error);
    return false;
  }

  return true;
}

async function createProfile(userId, email, fullName) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email: email,
      full_name: fullName,
      is_beta_tester: true
    });

  if (error) {
    console.error('Error creating profile:', error);
    return false;
  }

  return true;
}

async function main() {
  console.log('\n🔍 Supabase User Verification Tool\n');

  const email = await question('Enter email address to verify: ');

  console.log('\n📊 Checking user status...\n');

  // Check auth.users
  const authUser = await getAuthUser(email);

  if (!authUser) {
    console.log('❌ User NOT found in auth.users');
    console.log('\n💡 Suggestion: User needs to be created. Run the import script or create manually.');
    rl.close();
    return;
  }

  console.log('✅ User found in auth.users');
  console.log(`   ID: ${authUser.id}`);
  console.log(`   Email: ${authUser.email}`);
  console.log(`   Created: ${authUser.created_at}`);
  console.log(`   Email confirmed: ${authUser.email_confirmed_at ? '✅ YES' : '❌ NO'}`);
  console.log(`   Last sign in: ${authUser.last_sign_in_at || 'Never'}`);

  // Check profiles table
  const profile = await getUserByEmail(email);

  if (!profile) {
    console.log('\n❌ Profile NOT found in profiles table');

    const createProfileAnswer = await question('\n❓ Create profile now? (yes/no): ');
    if (createProfileAnswer.toLowerCase() === 'yes') {
      const fullName = await question('Enter full name: ');
      const success = await createProfile(authUser.id, email, fullName);
      if (success) {
        console.log('✅ Profile created successfully!');
      } else {
        console.log('❌ Failed to create profile');
      }
    }
  } else {
    console.log('\n✅ Profile found in profiles table');
    console.log(`   Name: ${profile.full_name || 'Not set'}`);
    console.log(`   Beta tester: ${profile.is_beta_tester ? 'Yes' : 'No'}`);
  }

  // Check email confirmation
  if (!authUser.email_confirmed_at) {
    console.log('\n⚠️  Email is NOT confirmed - this will prevent login!');

    const confirmAnswer = await question('\n❓ Confirm email now? (yes/no): ');
    if (confirmAnswer.toLowerCase() === 'yes') {
      const success = await confirmUserEmail(authUser.id);
      if (success) {
        console.log('✅ Email confirmed successfully!');
      } else {
        console.log('❌ Failed to confirm email');
      }
    }
  }

  // Offer password reset
  console.log('\n🔑 Password Reset');
  const resetAnswer = await question('Reset password? (yes/no): ');
  if (resetAnswer.toLowerCase() === 'yes') {
    const newPassword = await question('Enter new password (min 6 characters): ');
    if (newPassword.length < 6) {
      console.log('❌ Password must be at least 6 characters');
    } else {
      const success = await resetUserPassword(authUser.id, newPassword);
      if (success) {
        console.log('✅ Password reset successfully!');
      } else {
        console.log('❌ Failed to reset password');
      }
    }
  }

  console.log('\n✅ Done! Try logging in now.\n');
  rl.close();
}

main().catch(console.error);
