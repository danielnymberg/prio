#!/usr/bin/env node

/**
 * Kör SQL direkt mot Supabase med service role
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runSQL(query) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function checkSchema() {
  console.log('🔍 Inspekterar Supabase schema...\n');

  try {
    // PROJECTS columns
    const projectsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'projects'
      ORDER BY ordinal_position;
    `;

    const projectsColumns = await runSQL(projectsQuery);

    console.log('📊 PROJECTS table:');
    console.log('Antal kolumner:', projectsColumns.length);
    projectsColumns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // TASKS columns
    const tasksQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tasks'
      ORDER BY ordinal_position;
    `;

    const tasksColumns = await runSQL(tasksQuery);

    console.log('\n📊 TASKS table:');
    console.log('Antal kolumner:', tasksColumns.length);
    tasksColumns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Check specific columns
    console.log('\n🔎 Specifika kolumner:');
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

    projectColumnsToCheck.forEach(col => {
      const exists = projectsColumns.some(c => c.column_name === col);
      console.log(`  ${exists ? '✅' : '❌'} ${col}`);
    });

    console.log('\nTASKS:');
    const taskColumnsToCheck = [
      'actual_duration',
      'scheduled_start',
      'estimated_duration'
    ];

    taskColumnsToCheck.forEach(col => {
      const exists = tasksColumns.some(c => c.column_name === col);
      console.log(`  ${exists ? '✅' : '❌'} ${col}`);
    });

  } catch (error) {
    console.error('\n❌ Fel:', error.message);
    console.log('\nℹ️  RPC-funktionen exec_sql finns inte. Detta är OK!');
    console.log('Vi kan skapa migration med IF NOT EXISTS som är säker.');
  }
}

checkSchema();
