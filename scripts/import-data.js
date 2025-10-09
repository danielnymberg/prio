/**
 * Importerar data till nytt Supabase-projekt
 * Kör: node scripts/import-data.js
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

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Saknar Supabase credentials i .env');
  console.error('💡 Du behöver Service Role Key för import (finns i Supabase dashboard under Settings > API)');
  process.exit(1);
}

// Använd service role key för att bypassa RLS under import
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function importData() {
  console.log('📥 Startar import till nytt Supabase-projekt...\n');

  // Läs export-fil
  const exportPath = path.join(__dirname, '..', 'data-export.json');

  if (!fs.existsSync(exportPath)) {
    console.error('❌ Hittar inte data-export.json!');
    console.error('💡 Kör först: node scripts/export-data.js');
    process.exit(1);
  }

  const exports = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));

  // 1. Importera profiles (måste vara först pga foreign keys)
  if (exports.profiles?.length > 0) {
    console.log(`Importerar ${exports.profiles.length} profiler...`);

    for (const profile of exports.profiles) {
      const { error } = await supabase
        .from('profiles')
        .upsert(profile, { onConflict: 'id' });

      if (error) {
        console.error(`❌ Fel vid import av profil ${profile.id}:`, error.message);
      }
    }
    console.log('✅ Profiler importerade');
  }

  // 2. Importera projects
  if (exports.projects?.length > 0) {
    console.log(`Importerar ${exports.projects.length} projekt...`);

    const { error } = await supabase
      .from('projects')
      .upsert(exports.projects, { onConflict: 'id' });

    if (error) {
      console.error('❌ Fel vid import av projekt:', error.message);
    } else {
      console.log('✅ Projekt importerade');
    }
  }

  // 3. Importera tasks
  if (exports.tasks?.length > 0) {
    console.log(`Importerar ${exports.tasks.length} tasks...`);

    // Ta bort priority-kolumnen (den är auto-genererad)
    const tasksWithoutPriority = exports.tasks.map(task => {
      const { priority, ...taskWithoutPriority } = task;
      return taskWithoutPriority;
    });

    // Importera i batchar om 100 (för att undvika timeout)
    const batchSize = 100;
    for (let i = 0; i < tasksWithoutPriority.length; i += batchSize) {
      const batch = tasksWithoutPriority.slice(i, i + batchSize);
      const { error } = await supabase
        .from('tasks')
        .upsert(batch, { onConflict: 'id' });

      if (error) {
        console.error(`❌ Fel vid import av tasks batch ${i / batchSize + 1}:`, error.message);
      } else {
        console.log(`   ✓ Batch ${i / batchSize + 1}/${Math.ceil(exports.tasks.length / batchSize)}`);
      }
    }
    console.log('✅ Tasks importerade');
  }

  // 4. Importera email tasks
  if (exports.email_tasks?.length > 0) {
    console.log(`Importerar ${exports.email_tasks.length} email tasks...`);

    const { error } = await supabase
      .from('email_tasks')
      .upsert(exports.email_tasks, { onConflict: 'id' });

    if (error) {
      console.error('❌ Fel vid import av email_tasks:', error.message);
    } else {
      console.log('✅ Email tasks importerade');
    }
  }

  // 5. Importera focus sessions
  if (exports.focus_sessions?.length > 0) {
    console.log(`Importerar ${exports.focus_sessions.length} focus sessions...`);

    const { error } = await supabase
      .from('focus_sessions')
      .upsert(exports.focus_sessions, { onConflict: 'id' });

    if (error) {
      console.error('❌ Fel vid import av focus_sessions:', error.message);
    } else {
      console.log('✅ Focus sessions importerade');
    }
  }

  console.log('\n✅ IMPORT KLAR!');
  console.log('💡 Verifiera i Supabase dashboard att all data finns där');
}

importData().catch(console.error);
