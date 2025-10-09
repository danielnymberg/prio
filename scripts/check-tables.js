/**
 * Kollar vilka tabeller som finns i nuvarande Supabase-projekt
 * Kör: node scripts/check-tables.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Läs .env manuellt
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Försök .env.local först, sedan .env
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
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Saknar Supabase credentials i .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkTables() {
  console.log('🔍 Kollar vilka tabeller som finns i Supabase-projektet...\n');
  console.log('⚠️  OBS: Anon key kan inte se data pga RLS - det är BRA!\n');

  const tablesToCheck = ['tasks', 'projects', 'email_tasks', 'profiles', 'focus_sessions'];

  for (const table of tablesToCheck) {
    try {
      // Försök hämta antal rader (kan vara 0 pga RLS)
      const { count, error, data } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1);

      if (error) {
        if (error.message.includes('does not exist') || error.code === '42P01') {
          console.log(`❌ ${table}: Finns INTE i projektet`);
        } else {
          console.log(`✅ ${table}: Finns (RLS blockerar läsning - det är bra!)`);
          console.log(`   Error: ${error.message}`);
        }
      } else {
        // Tabell finns och vi kan läsa (count kan vara 0 pga RLS eller tomt)
        if (count === null || count === 0) {
          console.log(`✅ ${table}: Finns (0 synliga rader - troligen RLS-skyddad)`);
        } else {
          console.log(`✅ ${table}: Finns (${count} rader)`);
        }

        // Om vi fick data, visa kolumner
        if (data && data.length > 0) {
          const columns = Object.keys(data[0]).join(', ');
          console.log(`   Kolumner: ${columns}`);
        }
      }
    } catch (err) {
      console.log(`⚠️  ${table}: Okänt fel (${err.message})`);
    }
  }

  console.log('\n📊 SAMMANFATTNING:');
  console.log('Om du ser ✅ för tabeller du inte känner igen → de tillhör andra appar!');
  console.log('Om alla ✅ är Prio-tabeller → säkert att migrera!');
}

checkTables().catch(console.error);
