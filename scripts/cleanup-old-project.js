/**
 * CLEANUP: Raderar Prio-tabeller från gamla Supabase-projektet
 *
 * ⚠️  VARNING: Detta raderar data permanent!
 *
 * Kör detta ENDAST när:
 * 1. Du har exporterat data (data-export.json finns)
 * 2. Du har importerat till nya projektet
 * 3. Du har testat att nya projektet fungerar
 * 4. Du har uppdaterat .env och backend
 * 5. Prio-appen använder nya projektet i produktion
 *
 * Kör: node scripts/cleanup-old-project.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function cleanup() {
  console.log('⚠️  ⚠️  ⚠️  CLEANUP - RADERA PRIO-DATA FRÅN GAMLA PROJEKTET ⚠️  ⚠️  ⚠️\n');

  // Verifiera att backup finns
  const backupPath = path.join(__dirname, '..', 'data-export.json');
  if (!fs.existsSync(backupPath)) {
    console.error('❌ STOPP! Hittar inte data-export.json');
    console.error('Du måste ha en backup innan du kan radera data!');
    console.error('Kör först: node scripts/export-data.js');
    process.exit(1);
  }

  console.log('✅ Backup hittad: data-export.json\n');

  // Läs gamla credentials (från .env.local.backup eller manuell input)
  console.log('📋 Ange credentials för GAMLA Supabase-projektet:');
  console.log('(Det projekt du vill RADERA Prio-data från)\n');

  const oldUrl = await question('GAMLA Supabase URL: ');
  const oldServiceRoleKey = await question('GAMLA Service Role Key (HEMLIG!): ');

  if (!oldUrl || !oldServiceRoleKey) {
    console.error('\n❌ Du måste ange både URL och Service Role Key');
    rl.close();
    process.exit(1);
  }

  // Skapa klient med service role key (för att bypassa RLS)
  const supabase = createClient(oldUrl, oldServiceRoleKey);

  console.log('\n🔍 Kollar vilka Prio-tabeller som finns...\n');

  const prioTables = ['tasks', 'projects', 'email_tasks', 'profiles', 'focus_sessions'];
  const existingTables = [];

  for (const table of prioTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        existingTables.push({ name: table, count: count || 0 });
        console.log(`✅ ${table}: ${count || 0} rader`);
      }
    } catch (err) {
      // Tabell finns inte
    }
  }

  if (existingTables.length === 0) {
    console.log('\n✅ Inga Prio-tabeller hittades! Redan rensat eller fel credentials.');
    rl.close();
    return;
  }

  console.log('\n⚠️  DETTA KOMMER ATT RADERAS:\n');
  existingTables.forEach(t => {
    console.log(`   - ${t.name} (${t.count} rader)`);
  });

  const totalRows = existingTables.reduce((sum, t) => sum + t.count, 0);
  console.log(`\n   TOTALT: ${totalRows} rader kommer raderas PERMANENT!`);

  console.log('\n🛡️  SÄKERHETSCHECK:');
  console.log('   ✅ Backup finns: data-export.json');
  console.log('   ⚠️  Detta går INTE att ångra efter att du bekräftat!');

  console.log('\n📋 CHECKLISTA - Bekräfta att du gjort allt:');
  const check1 = await question('   [ ] Exporterat data? (ja/nej): ');
  if (check1.toLowerCase() !== 'ja') {
    console.log('\n❌ Avbrutet. Exportera data först!');
    rl.close();
    return;
  }

  const check2 = await question('   [ ] Importerat till nya projektet? (ja/nej): ');
  if (check2.toLowerCase() !== 'ja') {
    console.log('\n❌ Avbrutet. Importera till nya projektet först!');
    rl.close();
    return;
  }

  const check3 = await question('   [ ] Testat att nya projektet fungerar? (ja/nej): ');
  if (check3.toLowerCase() !== 'ja') {
    console.log('\n❌ Avbrutet. Testa nya projektet först!');
    rl.close();
    return;
  }

  const check4 = await question('   [ ] Uppdaterat .env och backend? (ja/nej): ');
  if (check4.toLowerCase() !== 'ja') {
    console.log('\n❌ Avbrutet. Uppdatera .env och backend först!');
    rl.close();
    return;
  }

  console.log('\n🚨 SISTA VARNINGEN! 🚨');
  console.log('Detta raderar PERMANENT all Prio-data från gamla projektet!');
  const finalConfirm = await question('\nSkriv "RADERA PRIO DATA" för att fortsätta: ');

  if (finalConfirm !== 'RADERA PRIO DATA') {
    console.log('\n✅ Avbrutet. Ingen data raderad.');
    rl.close();
    return;
  }

  console.log('\n🗑️  Raderar Prio-tabeller...\n');

  // Radera i omvänd ordning (för foreign key constraints)
  const deletionOrder = ['email_tasks', 'tasks', 'projects', 'profiles', 'focus_sessions'];

  for (const table of deletionOrder) {
    if (!existingTables.find(t => t.name === table)) continue;

    try {
      console.log(`Raderar alla rader från ${table}...`);

      // Radera alla rader (service role key kan radera allt)
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Matchar alla

      if (error) {
        console.error(`❌ Fel vid radering av ${table}:`, error.message);
      } else {
        console.log(`✅ ${table} raderad`);
      }
    } catch (err) {
      console.error(`❌ Fel vid radering av ${table}:`, err.message);
    }
  }

  console.log('\n✅ KLART!');
  console.log('Prio-data har raderats från gamla projektet.');
  console.log('Andra appar i projektet är opåverkade.');
  console.log('\n💾 Backup finns fortfarande i: data-export.json');

  rl.close();
}

cleanup().catch(err => {
  console.error('❌ Fel vid cleanup:', err);
  rl.close();
  process.exit(1);
});
