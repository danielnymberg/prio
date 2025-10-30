import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from server directory
dotenv.config({ path: join(__dirname, '../server/.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Read migration file
const migrationPath = join(__dirname, '../supabase/migrations/20251030_conversation_history.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

console.log('📄 Running migration: 20251030_conversation_history.sql');
console.log('🔗 Supabase URL:', SUPABASE_URL);

// Execute SQL via Supabase RPC
const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

if (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}

console.log('✅ Migration completed successfully!');
console.log('📊 Result:', data);
