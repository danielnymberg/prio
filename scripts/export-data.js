/**
 * Exporterar all data från nuvarande Supabase-projekt
 * Kör: node scripts/export-data.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Läs .env manuellt (stödjer både .env och .env.local)
let envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  envPath = path.join(__dirname, '..', '.env');
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=:#]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Saknar VITE_SUPABASE_URL i .env.local');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY saknas i .env.local');
  console.error('');
  console.error('För att exportera data behöver du Service Role Key från Supabase.');
  console.error('');
  console.error('📋 Så här hämtar du den:');
  console.error('1. Gå till https://supabase.com/dashboard');
  console.error('2. Välj ditt projekt');
  console.error('3. Settings → API');
  console.error('4. Kopiera "service_role" secret key');
  console.error('5. Lägg till i .env.local:');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=eyJhbG...');
  console.error('');
  console.error('⚠️  Service role key är HEMLIG - radera efter export!');
  process.exit(1);
}

// Använd service role key för att bypassa RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function exportData() {
  console.log('📦 Startar export från Supabase...\n');

  const exports = {};

  // 1. Tasks
  console.log('Exporterar tasks...');
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: true });

  if (tasksError) {
    console.error('❌ Fel vid export av tasks:', tasksError);
  } else {
    exports.tasks = tasks;
    console.log(`✅ ${tasks?.length || 0} tasks exporterade`);
  }

  // 2. Projects
  console.log('Exporterar projects...');
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: true });

  if (projectsError) {
    console.error('❌ Fel vid export av projects:', projectsError);
  } else {
    exports.projects = projects;
    console.log(`✅ ${projects?.length || 0} projekt exporterade`);
  }

  // 3. Email tasks
  console.log('Exporterar email_tasks...');
  const { data: emailTasks, error: emailError } = await supabase
    .from('email_tasks')
    .select('*')
    .order('created_at', { ascending: true });

  if (emailError) {
    console.error('❌ Fel vid export av email_tasks:', emailError);
  } else {
    exports.email_tasks = emailTasks;
    console.log(`✅ ${emailTasks?.length || 0} email tasks exporterade`);
  }

  // 4. Profiles
  console.log('Exporterar profiles...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*');

  if (profilesError) {
    console.error('❌ Fel vid export av profiles:', profilesError);
  } else {
    exports.profiles = profiles;
    console.log(`✅ ${profiles?.length || 0} profiler exporterade`);
  }

  // 5. Focus sessions (om tabellen finns)
  console.log('Exporterar focus_sessions...');
  const { data: sessions, error: sessionsError } = await supabase
    .from('focus_sessions')
    .select('*')
    .order('created_at', { ascending: true });

  if (sessionsError) {
    console.log('⚠️  focus_sessions finns inte (ok om ny app)');
  } else {
    exports.focus_sessions = sessions;
    console.log(`✅ ${sessions?.length || 0} sessions exporterade`);
  }

  // Spara till fil
  const exportPath = path.join(__dirname, '..', 'data-export.json');
  fs.writeFileSync(exportPath, JSON.stringify(exports, null, 2), 'utf-8');

  console.log(`\n✅ EXPORT KLAR!`);
  console.log(`📁 Sparad till: ${exportPath}`);
  console.log(`\n📊 SAMMANFATTNING:`);
  console.log(`   Tasks: ${exports.tasks?.length || 0}`);
  console.log(`   Projekt: ${exports.projects?.length || 0}`);
  console.log(`   Email tasks: ${exports.email_tasks?.length || 0}`);
  console.log(`   Profiler: ${exports.profiles?.length || 0}`);
  console.log(`   Sessions: ${exports.focus_sessions?.length || 0}`);
}

exportData().catch(console.error);
