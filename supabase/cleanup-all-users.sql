-- ============================================
-- CLEANUP: Remove ALL users and related data
-- WARNING: This will delete EVERYTHING!
-- ============================================

-- 1. Delete all profiles (will cascade due to foreign key)
DELETE FROM profiles;

-- 2. Delete all email tasks
DELETE FROM email_tasks;

-- 3. Delete all tasks
DELETE FROM tasks;

-- 4. Delete all projects
DELETE FROM projects;

-- 5. Delete from auth.users (this is the core issue)
DELETE FROM auth.users;

-- 6. Also clean up auth.identities (linked identities)
DELETE FROM auth.identities;

-- 7. Clean up auth.sessions
DELETE FROM auth.sessions;

-- 8. Clean up auth.refresh_tokens
DELETE FROM auth.refresh_tokens;

-- Verify cleanup
SELECT 'Users remaining:' as check_type, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'Profiles remaining:', COUNT(*) FROM profiles
UNION ALL
SELECT 'Tasks remaining:', COUNT(*) FROM tasks
UNION ALL
SELECT 'Projects remaining:', COUNT(*) FROM projects;
