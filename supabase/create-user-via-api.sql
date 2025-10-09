-- Try using Supabase's built-in functions instead of direct insert
-- First, completely clean auth tables
TRUNCATE auth.identities CASCADE;
TRUNCATE auth.sessions CASCADE;
TRUNCATE auth.refresh_tokens CASCADE;
TRUNCATE auth.users CASCADE;

-- Verify all cleaned
SELECT 'Users:' as table_name, COUNT(*) FROM auth.users
UNION ALL
SELECT 'Identities:', COUNT(*) FROM auth.identities
UNION ALL
SELECT 'Sessions:', COUNT(*) FROM auth.sessions
UNION ALL
SELECT 'Refresh tokens:', COUNT(*) FROM auth.refresh_tokens;
