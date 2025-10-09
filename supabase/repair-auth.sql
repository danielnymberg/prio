-- Try to repair auth schema
-- This recreates essential auth triggers and functions

-- First check what's broken
SELECT * FROM auth.users LIMIT 1;

-- If that works, try creating a test user via function
SELECT auth.uid(); -- Should return current user ID or null

-- List all auth schema objects
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'auth';
