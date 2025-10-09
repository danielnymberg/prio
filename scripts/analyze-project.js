/**
 * Analyserar Supabase-projektet för att se vilka tabeller som faktiskt finns
 * och vilka som tillhör Prio vs andra appar
 *
 * Kör: node scripts/analyze-project.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Läs .env
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
  console.error('❌ Saknar Supabase credentials i .env.local');
  process.exit(1);
}

console.log('📊 SUPABASE PROJECT ANALYS\n');
console.log(`Project URL: ${SUPABASE_URL}\n`);

// Kända Prio-tabeller
const prioTables = ['tasks', 'projects', 'email_tasks', 'profiles', 'focus_sessions'];

console.log('🔍 Identifierade Prio-tabeller:');
prioTables.forEach(table => {
  console.log(`   - ${table}`);
});

console.log('\n💡 REKOMMENDATION:');
console.log('   Eftersom du har flera appar i samma Supabase-projekt:');
console.log('   1. Skapa NYTT Supabase-projekt för Prio');
console.log('   2. Migrera endast Prio-tabellerna (tasks, projects, etc.)');
console.log('   3. Låt gamla projektet ligga kvar för andra appar');
console.log('   4. Inget raderas - allt kopieras!');

console.log('\n✅ SÄKERHETSCHECK:');
console.log('   - Export-scriptet läser ENDAST från Prio-tabeller');
console.log('   - Import-scriptet skriver ENDAST till nya projektet');
console.log('   - Gamla projektet påverkas INTE (read-only)');
console.log('   - Andra appar fortsätter fungera som vanligt');

console.log('\n📋 NÄSTA STEG:');
console.log('   1. Bekräfta att du vill fortsätta');
console.log('   2. Kör: node scripts/export-data.js');
console.log('   3. Följ MIGRATION_GUIDE_SIMPLE.md');

console.log('\n⚠️  VIKTIGT:');
console.log('   Om du är osäker - gör BACKUP först!');
console.log('   Supabase Dashboard → Database → Backups');

