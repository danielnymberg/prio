#!/usr/bin/env node

/**
 * Script för att inspektera Supabase DB-schema
 * Kör med: node scripts/check-db-schema.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ladda .env.local
config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ VITE_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY saknas i .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkSchema() {
  console.log('🔍 Kontrollerar DB-schema i Supabase med service role...\n');

  // Använd rpc för att köra SQL direkt
  const { data: projectsColumns, error: projectsError } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'projects'
        ORDER BY ordinal_position;
      `
    });

  if (projectsError) {
    // Fallback: Försök hämta via from() med select
    console.log('ℹ️  RPC inte tillgänglig, använder fallback-metod...\n');

    // Skapa en temporär row för att se schema
    const { error: insertError } = await supabase
      .from('projects')
      .insert({
        name: '__SCHEMA_CHECK__',
        quoted_hours: 0,
        hourly_rate: 0,
        external_costs: 0,
        total_budget: 0
      })
      .select()
      .single();

    const { data: projects, error: selectError } = await supabase
      .from('projects')
      .select('*')
      .eq('name', '__SCHEMA_CHECK__')
      .single();

    if (projects) {
      console.log('📊 PROJECTS table:');
      const columns = Object.keys(projects).sort();
      console.log('Antal kolumner:', columns.length);
      console.log('Kolumner:');
      columns.forEach(col => console.log(`  - ${col}`));

      // Radera test-rad
      await supabase.from('projects').delete().eq('name', '__SCHEMA_CHECK__');
    }

    // Samma för tasks
    const { error: insertTaskError } = await supabase
      .from('tasks')
      .insert({
        title: '__SCHEMA_CHECK__',
        value_score: 5,
        time_sensitivity: 5,
        confidence: 5,
        effort: 5
      })
      .select()
      .single();

    const { data: tasks, error: selectTaskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('title', '__SCHEMA_CHECK__')
      .single();

    if (tasks) {
      console.log('\n📊 TASKS table:');
      const columns = Object.keys(tasks).sort();
      console.log('Antal kolumner:', columns.length);
      console.log('Kolumner:');
      columns.forEach(col => console.log(`  - ${col}`));

      // Radera test-rad
      await supabase.from('tasks').delete().eq('title', '__SCHEMA_CHECK__');
    }

    // Kontrollera specifika kolumner
    console.log('\n🔎 Kolumner vi vill kontrollera:');
    console.log('\nPROJECTS:');
    const projectColumnsToCheck = [
      'start_date',
      'spiris_project_id',
      'spiris_last_sync',
      'spiris_sync_enabled',
      'budgeted_hours',
      'budgeted_revenue',
      'invoiced_hours',
      'invoiced_amount',
      'actual_hours_worked',
      'project_manager'
    ];

    if (projects) {
      projectColumnsToCheck.forEach(col => {
        const exists = col in projects;
        console.log(`  ${exists ? '✅' : '❌'} ${col}`);
      });
    }

    console.log('\nTASKS:');
    const taskColumnsToCheck = [
      'actual_duration',
      'scheduled_start',
      'estimated_duration'
    ];

    if (tasks) {
      taskColumnsToCheck.forEach(col => {
        const exists = col in tasks;
        console.log(`  ${exists ? '✅' : '❌'} ${col}`);
      });
    }
  } else {
    console.log('📊 PROJECTS table columns:');
    console.log(projectsColumns);
  }
}

checkSchema().catch(console.error);
