-- ============================================
-- INSPECT CURRENT DB SCHEMA
-- Kör detta i Supabase SQL Editor för att se befintliga kolumner
-- ============================================

-- PROJECTS TABLE COLUMNS
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'projects'
ORDER BY ordinal_position;

-- TASKS TABLE COLUMNS
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tasks'
ORDER BY ordinal_position;

-- SPECIFIC COLUMNS WE'RE LOOKING FOR
SELECT
  'projects' as table_name,
  'start_date' as column_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'start_date'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 'projects', 'spiris_project_id',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'spiris_project_id')
  THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'projects', 'spiris_last_sync',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'spiris_last_sync')
  THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'projects', 'spiris_sync_enabled',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'spiris_sync_enabled')
  THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'projects', 'budgeted_hours',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'budgeted_hours')
  THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'tasks', 'actual_duration',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'actual_duration')
  THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'tasks', 'scheduled_start',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'scheduled_start')
  THEN '✅ EXISTS' ELSE '❌ MISSING' END;
