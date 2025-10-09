import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const OLD_USER_ID = 'e9ca80a3-5106-47ad-9d81-611508e57a54';
const NEW_USER_ID = '594ba863-a738-4272-be92-b5602165e7dd';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function importData() {
  console.log('📥 Importing data with new user ID...\n');

  // Read export
  const exports = JSON.parse(fs.readFileSync('data-export.json', 'utf-8'));

  // Update user_id in all data
  const tasks = exports.tasks
    .filter(t => t.user_id === OLD_USER_ID)
    .map(t => {
      const { priority, ...taskWithoutPriority } = t;
      return {
        ...taskWithoutPriority,
        user_id: NEW_USER_ID,
      };
    });

  const projects = exports.projects
    .filter(p => p.user_id === OLD_USER_ID)
    .map(p => ({
      ...p,
      user_id: NEW_USER_ID,
    }));

  console.log(`📊 Found ${tasks.length} tasks and ${projects.length} projects for your user\n`);

  // Import projects first
  if (projects.length > 0) {
    console.log('Importing projects...');
    const { error } = await supabase.from('projects').insert(projects);
    if (error) {
      console.error('❌ Error importing projects:', error);
    } else {
      console.log('✅ Projects imported');
    }
  }

  // Import tasks in batches
  if (tasks.length > 0) {
    console.log(`Importing ${tasks.length} tasks...`);
    const batchSize = 50;
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      const { error } = await supabase.from('tasks').insert(batch);
      if (error) {
        console.error(`❌ Error importing batch ${i / batchSize + 1}:`, error);
      } else {
        console.log(`   ✓ Batch ${i / batchSize + 1}/${Math.ceil(tasks.length / batchSize)}`);
      }
    }
    console.log('✅ Tasks imported');
  }

  console.log('\n✅ IMPORT COMPLETE!\n');
  console.log('You can now login at https://minprio.se');
  console.log('Email: daniel@nymberg.se');
  console.log('Password: qwerty1234\n');
}

importData().catch(console.error);
