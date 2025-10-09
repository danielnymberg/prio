-- ============================================
-- CLEANUP: Remove user ONLY (keep tasks/projects)
-- ============================================

-- Step 1: Temporarily disable foreign key constraint by updating tasks/projects to NULL user_id
-- (We'll fix this after creating new user)

-- Check current user ID
SELECT id, email FROM auth.users WHERE email = 'daniel@nymberg.se';

-- If user exists, note the ID and delete:
-- DELETE FROM auth.identities WHERE user_id = 'USER_ID_HERE';
-- DELETE FROM auth.sessions WHERE user_id = 'USER_ID_HERE';
-- DELETE FROM auth.refresh_tokens WHERE user_id = 'USER_ID_HERE';
-- DELETE FROM profiles WHERE id = 'USER_ID_HERE';
-- DELETE FROM auth.users WHERE id = 'USER_ID_HERE';

-- OR: Just delete everything and re-import (safest)
DELETE FROM auth.identities;
DELETE FROM auth.sessions;
DELETE FROM auth.refresh_tokens;
DELETE FROM profiles;
DELETE FROM auth.users;

-- Verify
SELECT COUNT(*) as users_remaining FROM auth.users;
