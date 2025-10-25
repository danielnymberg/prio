#!/usr/bin/env node

/**
 * Kör SQL migration direkt mot Supabase
 * Usage: node scripts/run-migration.mjs <migration-file>
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ VITE_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY saknas');
  process.exit(1);
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('❌ Ange migration-fil: node scripts/run-migration.mjs <fil>');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function runMigration() {
  console.log('🚀 Kör migration:', migrationFile);
  console.log('📍 Supabase URL:', supabaseUrl.replace(/https:\/\/(.{4}).*/, 'https://$1...'));
  console.log('');

  try {
    // Läs migration-fil
    const migrationPath = join(__dirname, '..', migrationFile);
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Läste migration-fil:', migrationPath);
    console.log('📏 SQL längd:', sql.length, 'tecken\n');

    // Extrahera projekt-ref från URL (t.ex. egmrvvguimqwkosrtcau från egmrvvguimqwkosrtcau.supabase.co)
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

    if (!projectRef) {
      throw new Error('Kunde inte extrahera projekt-ref från Supabase URL');
    }

    // Använd Supabase Management API för att köra SQL
    // Detta kräver att vi använder postgres direkt, vilket inte går via REST API

    console.log('ℹ️  Supabase stödjer inte direkt SQL-körning via REST API\n');
    console.log('📋 KOPIERAD SQL TILL CLIPBOARD (nästan):\n');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));

    console.log('\n📝 GÖR SÅ HÄR:');
    console.log('1. Öppna Supabase Dashboard: https://supabase.com/dashboard/project/' + projectRef);
    console.log('2. Gå till SQL Editor (vänster meny)');
    console.log('3. Kopiera SQL ovan och klistra in');
    console.log('4. Klicka "Run" eller tryck Cmd+Enter\n');

    console.log('💡 TIP: SQL-filen finns i:', migrationPath);

  } catch (error) {
    console.error('\n❌ Fel:', error.message);
    process.exit(1);
  }
}

runMigration();
